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
}

type roomState struct {
	members map[*websocket.Conn]*Member
}

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]*roomState // roomCode → state
}

func New() *Hub {
	return &Hub{rooms: make(map[string]*roomState)}
}

// Join adds a connection to a room. Returns the snapshot of OTHER members
// currently in the room (so the new joiner can render them immediately).
func (h *Hub) Join(code string, m *Member) []*Member {
	h.mu.Lock()
	defer h.mu.Unlock()
	r, ok := h.rooms[code]
	if !ok {
		r = &roomState{members: make(map[*websocket.Conn]*Member)}
		h.rooms[code] = r
	}
	others := make([]*Member, 0, len(r.members))
	for _, other := range r.members {
		others = append(others, other)
	}
	r.members[m.Conn] = m
	return others
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
