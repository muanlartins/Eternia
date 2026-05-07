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
					existing, _ := h.Leave(conn)
					if existing != "" {
						h.Broadcast(existing, conn, mustJSON(map[string]any{
							"t":      "remote_leave",
							"userId": currentMember.UserID,
						}))
					}
				}
				member := &hub.Member{Conn: conn, UserID: user.ID, Username: user.Username}
				others := h.Join(msg.Code, member)
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
			case "leave_room":
				if currentRoom != "" && currentMember != nil {
					h.Leave(conn)
					h.Broadcast(currentRoom, conn, mustJSON(map[string]any{
						"t":      "remote_leave",
						"userId": currentMember.UserID,
					}))
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
