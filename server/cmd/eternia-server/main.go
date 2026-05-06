// Eternia server. WebSocket for game session (Phase 0 hello), REST API for
// auth + run persistence (Phase 6).
package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"

	"eternia/internal/api"
	"eternia/internal/store"
)

const version = "0.1.0"

var upgrader = websocket.Upgrader{
	// Dev only: accept any origin. Tighten before any non-localhost deployment.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ClientMessage matches @eternia/shared/packets.ts (kept loose with json.RawMessage
// during phase 0; will harden once the protocol stabilizes).
type ClientMessage struct {
	T string          `json:"t"`
	V string          `json:"v,omitempty"`
	X json.RawMessage `json:"-"`
}

func handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("[ws] client connected from %s", r.RemoteAddr)
	defer log.Printf("[ws] client disconnected from %s", r.RemoteAddr)

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Printf("[ws] read error: %v", err)
			}
			return
		}

		var msg ClientMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			log.Printf("[ws] bad json: %v", err)
			continue
		}

		log.Printf("[ws] recv: %s", string(raw))

		// Phase 0 dispatch: only "hello" understood.
		if msg.T == "hello" {
			reply := map[string]any{
				"t":          "hello",
				"v":          version,
				"serverTime": time.Now().UnixMilli(),
			}
			if err := conn.WriteJSON(reply); err != nil {
				log.Printf("[ws] write error: %v", err)
				return
			}
		}
	}
}

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	dataPath := flag.String("data", "data/eternia.json", "JSON data file path")
	flag.Parse()

	s, err := store.New(*dataPath)
	if err != nil {
		log.Fatalf("store: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", handleWS)
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("POST /api/login", api.HandleLogin(s))
	mux.HandleFunc("POST /api/runs", api.HandleSaveRun(s))
	mux.HandleFunc("GET /api/runs/me", api.HandleMyRecords(s))

	log.Printf("Eternia server v%s listening on %s (data: %s)", version, *addr, *dataPath)
	if err := http.ListenAndServe(*addr, mux); err != nil {
		log.Fatal(err)
	}
}
