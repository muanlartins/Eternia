// Package hub keeps track of WebSocket connections currently inside each
// multiplayer room and broadcasts presence/state messages between them.
//
// Phase 8.C alpha: each client streams its own player_state and the hub
// fans the message out to others in the same room. Mob/world state is NOT
// shared yet — players just see each other's position as a "ghost".
package hub

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

// Member represents a single WS connection inside a room.
type Member struct {
	Conn     *websocket.Conn
	UserID   int
	Username string
	Ready    bool
}

type roomState struct {
	members      map[*websocket.Conn]*Member
	hostUserID   int
	matchStarted bool
}

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]*roomState // roomCode → state
}

func New() *Hub {
	return &Hub{rooms: make(map[string]*roomState)}
}

// Join adds a connection to a room. Returns the snapshot of OTHER members
// currently in the room. If hostUserID > 0 and the room was just created,
// it's recorded as the host.
func (h *Hub) Join(code string, m *Member, hostUserID int) []*Member {
	h.mu.Lock()
	defer h.mu.Unlock()
	r, ok := h.rooms[code]
	if !ok {
		r = &roomState{members: make(map[*websocket.Conn]*Member)}
		if hostUserID > 0 {
			r.hostUserID = hostUserID
		}
		h.rooms[code] = r
	}
	others := make([]*Member, 0, len(r.members))
	for _, other := range r.members {
		others = append(others, other)
	}
	r.members[m.Conn] = m
	return others
}

// Snapshot returns all current members of a room plus its match-started flag.
func (h *Hub) Snapshot(code string) (members []*Member, hostUserID int, matchStarted bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	r, ok := h.rooms[code]
	if !ok {
		return nil, 0, false
	}
	out := make([]*Member, 0, len(r.members))
	for _, m := range r.members {
		out = append(out, m)
	}
	return out, r.hostUserID, r.matchStarted
}

// SetReady toggles a connection's ready flag. Returns the room code (if any).
func (h *Hub) SetReady(conn *websocket.Conn, ready bool) string {
	h.mu.Lock()
	defer h.mu.Unlock()
	for code, r := range h.rooms {
		if m, ok := r.members[conn]; ok {
			m.Ready = ready
			return code
		}
	}
	return ""
}

// StartMatch flips the room into match-started state if the requester is
// the host. Returns true if the transition happened.
func (h *Hub) StartMatch(conn *websocket.Conn) (string, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for code, r := range h.rooms {
		m, ok := r.members[conn]
		if !ok {
			continue
		}
		if m.UserID != r.hostUserID {
			return code, false
		}
		if r.matchStarted {
			return code, false
		}
		r.matchStarted = true
		return code, true
	}
	return "", false
}

// Leave removes a connection from a room. Returns the room code (or empty
// if the connection wasn't tracked) and the user info that left, so callers
// can broadcast a leave message.
func (h *Hub) Leave(conn *websocket.Conn) (code string, member *Member) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for c, r := range h.rooms {
		if m, ok := r.members[conn]; ok {
			delete(r.members, conn)
			if len(r.members) == 0 {
				delete(h.rooms, c)
			}
			return c, m
		}
	}
	return "", nil
}

// Broadcast sends raw JSON bytes to everyone in `code` except `from`.
// Errors writing to a single connection are ignored (caller may detect via
// next read).
func (h *Hub) Broadcast(code string, from *websocket.Conn, payload []byte) {
	h.mu.RLock()
	r, ok := h.rooms[code]
	if !ok {
		h.mu.RUnlock()
		return
	}
	conns := make([]*websocket.Conn, 0, len(r.members))
	for c := range r.members {
		if c != from {
			conns = append(conns, c)
		}
	}
	h.mu.RUnlock()
	for _, c := range conns {
		_ = c.WriteMessage(websocket.TextMessage, payload)
	}
}

// SendJSON marshals + sends to a single connection. Convenience wrapper.
func SendJSON(conn *websocket.Conn, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return conn.WriteMessage(websocket.TextMessage, b)
}
