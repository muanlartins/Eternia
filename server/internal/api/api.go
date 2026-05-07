package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"eternia/internal/store"
)

type loginRequest struct {
	Username string `json:"username"`
}

type loginResponse struct {
	Token    string         `json:"token"`
	UserID   int            `json:"userId"`
	Username string         `json:"username"`
	Records  store.Records  `json:"records"`
}

type runRequest struct {
	DurationMs  int64 `json:"durationMs"`
	DamageDealt int   `json:"damageDealt"`
	Deaths      int   `json:"deaths"`
	Victory     bool  `json:"victory"`
}

type runResponse struct {
	Records store.Records `json:"records"`
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(h, "Bearer ")
}

func HandleLogin(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		user, err := s.FindOrCreateUser(req.Username)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, loginResponse{
			Token:    user.Token,
			UserID:   user.ID,
			Username: user.Username,
			Records:  s.RecordsForUser(user.ID),
		})
	}
}

func HandleSaveRun(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		user, ok := s.UserByToken(token)
		if !ok {
			writeError(w, http.StatusUnauthorized, "invalid token")
			return
		}
		var req runRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		if req.DurationMs < 0 || req.DamageDealt < 0 || req.Deaths < 0 {
			writeError(w, http.StatusBadRequest, "negative values not allowed")
			return
		}
		if _, err := s.AddRun(store.Run{
			UserID:      user.ID,
			DurationMs:  req.DurationMs,
			DamageDealt: req.DamageDealt,
			Deaths:      req.Deaths,
			Victory:     req.Victory,
		}); err != nil {
			writeError(w, http.StatusInternalServerError, "save failed")
			return
		}
		writeJSON(w, http.StatusOK, runResponse{Records: s.RecordsForUser(user.ID)})
	}
}

func HandleMyRecords(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		user, ok := s.UserByToken(token)
		if !ok {
			writeError(w, http.StatusUnauthorized, "invalid token")
			return
		}
		writeJSON(w, http.StatusOK, runResponse{Records: s.RecordsForUser(user.ID)})
	}
}

type leaderboardResponse struct {
	Metric  string                   `json:"metric"`
	Entries []store.LeaderboardEntry `json:"entries"`
}

type createRoomRequest struct {
	Mission    string `json:"mission"`
	Difficulty string `json:"difficulty"`
}

type roomResponse struct {
	Room store.Room `json:"room"`
}

type roomsResponse struct {
	Rooms []store.Room `json:"rooms"`
}

func HandleCreateRoom(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		user, ok := s.UserByToken(token)
		if !ok {
			writeError(w, http.StatusUnauthorized, "invalid token")
			return
		}
		var req createRoomRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		room, err := s.CreateRoom(user.ID, req.Mission, req.Difficulty)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, roomResponse{Room: room})
	}
}

func HandleJoinRoom(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		user, ok := s.UserByToken(token)
		if !ok {
			writeError(w, http.StatusUnauthorized, "invalid token")
			return
		}
		code := r.PathValue("code")
		room, err := s.JoinRoom(code, user.ID)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, roomResponse{Room: room})
	}
}

func HandleLeaveRoom(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		user, ok := s.UserByToken(token)
		if !ok {
			writeError(w, http.StatusUnauthorized, "invalid token")
			return
		}
		code := r.PathValue("code")
		if err := s.LeaveRoom(code, user.ID); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func HandleGetRoom(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.PathValue("code")
		room, ok := s.RoomByCode(code)
		if !ok {
			writeError(w, http.StatusNotFound, "room not found")
			return
		}
		writeJSON(w, http.StatusOK, roomResponse{Room: room})
	}
}

func HandleListRooms(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		rooms := s.ActiveRooms()
		writeJSON(w, http.StatusOK, roomsResponse{Rooms: rooms})
	}
}

func HandleLeaderboard(s *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		metric := r.URL.Query().Get("metric")
		if metric == "" {
			metric = string(store.MetricTime)
		}
		if !store.IsValidMetric(metric) {
			writeError(w, http.StatusBadRequest, "invalid metric")
			return
		}
		limit := 10
		if l := r.URL.Query().Get("limit"); l != "" {
			if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 50 {
				limit = n
			}
		}
		entries := s.Leaderboard(store.LeaderboardMetric(metric), limit)
		writeJSON(w, http.StatusOK, leaderboardResponse{
			Metric:  metric,
			Entries: entries,
		})
	}
}
