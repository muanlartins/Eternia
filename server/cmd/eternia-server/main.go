// Eternia server. WebSocket for game session (Phase 0 hello + Phase 8.C
// room presence), REST API for auth + run persistence + room CRUD.
package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"

	"eternia/internal/api"
	"eternia/internal/hub"
	"eternia/internal/store"
)

const version = "0.1.0"

var upgrader = websocket.Upgrader{
	// Dev only: accept any origin. Tighten before any non-localhost deployment.
	CheckOrigin: func(r *http.Request) bool { return true },
}

type clientMessage struct {
	T        string          `json:"t"`
	V        string          `json:"v,omitempty"`
	Token    string          `json:"token,omitempty"`
	Code     string          `json:"code,omitempty"`
	Username string          `json:"username,omitempty"`
	State    json.RawMessage `json:"state,omitempty"`
	Ready    bool            `json:"ready,omitempty"`
	Mobs     json.RawMessage `json:"mobs,omitempty"`
	Hit      json.RawMessage `json:"hit,omitempty"`
	Phase    string          `json:"phase,omitempty"`
	Payload  json.RawMessage `json:"payload,omitempty"`
}

func roomStatusPayload(code string, members []*hub.Member, hostUserID int, matchStarted bool) map[string]any {
	out := make([]map[string]any, 0, len(members))
	for _, m := range members {
		out = append(out, map[string]any{
			"userId":   m.UserID,
			"username": m.Username,
			"ready":    m.Ready,
			"isHost":   m.UserID == hostUserID,
		})
	}
	return map[string]any{
		"t":            "room_status",
		"code":         code,
		"matchStarted": matchStarted,
		"members":      out,
	}
}

func broadcastRoomStatus(h *hub.Hub, code string) {
	members, hostUserID, matchStarted := h.Snapshot(code)
	payload := mustJSON(roomStatusPayload(code, members, hostUserID, matchStarted))
	for _, m := range members {
		_ = m.Conn.WriteMessage(websocket.TextMessage, payload)
	}
}

func handleWS(s *store.Store, h *hub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("[ws] upgrade failed: %v", err)
			return
		}

		defer func() {
			code, member := h.Leave(conn)
			if code != "" && member != nil {
				h.Broadcast(code, conn, mustJSON(map[string]any{
					"t":      "remote_leave",
					"userId": member.UserID,
				}))
				broadcastRoomStatus(h, code)
			}
			conn.Close()
		}()

		log.Printf("[ws] client connected from %s", r.RemoteAddr)
		defer log.Printf("[ws] client disconnected from %s", r.RemoteAddr)

		var currentRoom string
		var currentMember *hub.Member

		for {
			_, raw, err := conn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					log.Printf("[ws] read error: %v", err)
				}
				return
			}

			var msg clientMessage
			if err := json.Unmarshal(raw, &msg); err != nil {
				log.Printf("[ws] bad json: %v", err)
				continue
			}

			switch msg.T {
			case "hello":
				if err := conn.WriteJSON(map[string]any{
					"t":          "hello",
					"v":          version,
					"serverTime": time.Now().UnixMilli(),
				}); err != nil {
					log.Printf("[ws] write error: %v", err)
					return
				}
			case "enter_room":
				user, ok := s.UserByToken(msg.Token)
				if !ok {
					_ = hub.SendJSON(conn, map[string]any{
						"t":     "room_error",
						"error": "invalid token",
					})
					continue
				}
				if currentRoom != "" {
					existing, leaver := h.Leave(conn)
					if existing != "" && leaver != nil {
						h.Broadcast(existing, conn, mustJSON(map[string]any{
							"t":      "remote_leave",
							"userId": leaver.UserID,
						}))
						broadcastRoomStatus(h, existing)
					}
				}
				room, roomOk := s.RoomByCode(msg.Code)
				hostHint := 0
				if roomOk {
					hostHint = room.HostUserID
				}
				member := &hub.Member{Conn: conn, UserID: user.ID, Username: user.Username}
				others := h.Join(msg.Code, member, hostHint)
				currentRoom = msg.Code
				currentMember = member

				// Tell the joiner about everyone already there.
				roster := make([]map[string]any, 0, len(others))
				for _, o := range others {
					roster = append(roster, map[string]any{
						"userId":   o.UserID,
						"username": o.Username,
					})
				}
				_ = hub.SendJSON(conn, map[string]any{
					"t":      "room_roster",
					"code":   msg.Code,
					"others": roster,
				})

				// Tell others about the new joiner.
				h.Broadcast(currentRoom, conn, mustJSON(map[string]any{
					"t":        "remote_join",
					"userId":   user.ID,
					"username": user.Username,
				}))

				broadcastRoomStatus(h, currentRoom)
			case "set_ready":
				if currentRoom == "" {
					continue
				}
				h.SetReady(conn, msg.Ready)
				broadcastRoomStatus(h, currentRoom)
			case "start_match":
				if currentRoom == "" {
					continue
				}
				code, ok := h.StartMatch(conn)
				if !ok {
					continue
				}
				h.Broadcast(code, nil, mustJSON(map[string]any{
					"t":    "match_start",
					"code": code,
				}))
				_ = hub.SendJSON(conn, map[string]any{
					"t":    "match_start",
					"code": code,
				})
				broadcastRoomStatus(h, code)
			case "leave_room":
				if currentRoom != "" && currentMember != nil {
					h.Leave(conn)
					h.Broadcast(currentRoom, conn, mustJSON(map[string]any{
						"t":      "remote_leave",
						"userId": currentMember.UserID,
					}))
					broadcastRoomStatus(h, currentRoom)
					currentRoom = ""
					currentMember = nil
				}
			case "player_state":
				if currentRoom == "" || currentMember == nil {
					continue
				}
				h.Broadcast(currentRoom, conn, mustJSON(map[string]any{
					"t":        "remote_state",
					"userId":   currentMember.UserID,
					"username": currentMember.Username,
					"state":    msg.State,
				}))
			case "mob_states":
				if currentRoom == "" {
					continue
				}
				h.Broadcast(currentRoom, conn, mustJSON(map[string]any{
					"t":    "mob_states",
					"mobs": msg.Mobs,
				}))
			case "mob_event":
				if currentRoom == "" {
					continue
				}
				h.Broadcast(currentRoom, conn, mustJSON(map[string]any{
					"t":       "mob_event",
					"payload": msg.Payload,
				}))
			case "player_hit":
				if currentRoom == "" {
					continue
				}
				h.Broadcast(currentRoom, conn, mustJSON(map[string]any{
					"t":   "player_hit",
					"hit": msg.Hit,
				}))
			case "stage_phase":
				if currentRoom == "" {
					continue
				}
				h.Broadcast(currentRoom, conn, mustJSON(map[string]any{
					"t":       "stage_phase",
					"phase":   msg.Phase,
					"payload": msg.Payload,
				}))
			}
		}
	}
}

func mustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("{}")
	}
	return b
}

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	dataPath := flag.String("data", "data/eternia.json", "JSON data file path")
	flag.Parse()

	s, err := store.New(*dataPath)
	if err != nil {
		log.Fatalf("store: %v", err)
	}
	h := hub.New()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleWS(s, h))
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("POST /api/login", api.HandleLogin(s))
	mux.HandleFunc("POST /api/runs", api.HandleSaveRun(s))
	mux.HandleFunc("GET /api/runs/me", api.HandleMyRecords(s))
	mux.HandleFunc("GET /api/leaderboard", api.HandleLeaderboard(s))
	mux.HandleFunc("POST /api/rooms", api.HandleCreateRoom(s))
	mux.HandleFunc("GET /api/rooms", api.HandleListRooms(s))
	mux.HandleFunc("GET /api/rooms/{code}", api.HandleGetRoom(s))
	mux.HandleFunc("POST /api/rooms/{code}/join", api.HandleJoinRoom(s))
	mux.HandleFunc("POST /api/rooms/{code}/leave", api.HandleLeaveRoom(s))

	log.Printf("Eternia server v%s listening on %s (data: %s)", version, *addr, *dataPath)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatal(err)
	}
}
