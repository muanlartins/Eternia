package store

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type User struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Token     string `json:"token"`
	CreatedAt int64  `json:"createdAt"`
}

type Run struct {
	ID          int   `json:"id"`
	UserID      int   `json:"userId"`
	DurationMs  int64 `json:"durationMs"`
	DamageDealt int   `json:"damageDealt"`
	Deaths      int   `json:"deaths"`
	Victory     bool  `json:"victory"`
	CompletedAt int64 `json:"completedAt"`
}

type Records struct {
	BestTimeMs            *int64 `json:"bestTimeMs"`
	BestDamageDealt       int    `json:"bestDamageDealt"`
	FewestDeathsInVictory *int   `json:"fewestDeathsInVictory"`
	TotalVictories        int    `json:"totalVictories"`
	TotalAttempts         int    `json:"totalAttempts"`
}

type LeaderboardEntry struct {
	Username    string `json:"username"`
	DurationMs  int64  `json:"durationMs"`
	DamageDealt int    `json:"damageDealt"`
	Deaths      int    `json:"deaths"`
	Victory     bool   `json:"victory"`
	CompletedAt int64  `json:"completedAt"`
}

type LeaderboardMetric string

const (
	MetricTime   LeaderboardMetric = "time"
	MetricDamage LeaderboardMetric = "damage"
	MetricDeaths LeaderboardMetric = "deaths"
)

func IsValidMetric(m string) bool {
	switch LeaderboardMetric(m) {
	case MetricTime, MetricDamage, MetricDeaths:
		return true
	default:
		return false
	}
}

type data struct {
	Users      []User `json:"users"`
	Runs       []Run  `json:"runs"`
	NextUserID int    `json:"nextUserId"`
	NextRunID  int    `json:"nextRunId"`
}

type Store struct {
	mu   sync.Mutex
	d    data
	path string
}

func New(path string) (*Store, error) {
	s := &Store{path: path}
	s.d.NextUserID = 1
	s.d.NextRunID = 1
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) load() error {
	raw, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	if len(raw) == 0 {
		return nil
	}
	return json.Unmarshal(raw, &s.d)
}

func (s *Store) save() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	raw, err := json.MarshalIndent(s.d, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func newToken() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand failures are fatal — fall back to time-based hex (insecure)
		return hex.EncodeToString([]byte(time.Now().String()))
	}
	return hex.EncodeToString(b)
}

func normalizeUsername(u string) string {
	return strings.ToLower(strings.TrimSpace(u))
}

func (s *Store) FindOrCreateUser(username string) (User, error) {
	username = normalizeUsername(username)
	if username == "" {
		return User{}, errors.New("username empty")
	}
	if len(username) > 20 {
		return User{}, errors.New("username too long")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, u := range s.d.Users {
		if u.Username == username {
			return u, nil
		}
	}
	u := User{
		ID:        s.d.NextUserID,
		Username:  username,
		Token:     newToken(),
		CreatedAt: time.Now().UnixMilli(),
	}
	s.d.NextUserID++
	s.d.Users = append(s.d.Users, u)
	if err := s.save(); err != nil {
		return User{}, err
	}
	return u, nil
}

func (s *Store) UserByToken(token string) (User, bool) {
	if token == "" {
		return User{}, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, u := range s.d.Users {
		if u.Token == token {
			return u, true
		}
	}
	return User{}, false
}

func (s *Store) AddRun(r Run) (Run, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r.ID = s.d.NextRunID
	r.CompletedAt = time.Now().UnixMilli()
	s.d.NextRunID++
	s.d.Runs = append(s.d.Runs, r)
	if err := s.save(); err != nil {
		return Run{}, err
	}
	return r, nil
}

func (s *Store) Leaderboard(metric LeaderboardMetric, limit int) []LeaderboardEntry {
	if limit <= 0 {
		limit = 10
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	userByID := make(map[int]string, len(s.d.Users))
	for _, u := range s.d.Users {
		userByID[u.ID] = u.Username
	}

	bestPerUser := make(map[int]Run)
	for _, r := range s.d.Runs {
		if metric == MetricTime || metric == MetricDeaths {
			if !r.Victory {
				continue
			}
		}
		prev, ok := bestPerUser[r.UserID]
		if !ok || isBetter(r, prev, metric) {
			bestPerUser[r.UserID] = r
		}
	}

	runs := make([]Run, 0, len(bestPerUser))
	for _, r := range bestPerUser {
		runs = append(runs, r)
	}

	sort.Slice(runs, func(i, j int) bool {
		return isBetter(runs[i], runs[j], metric)
	})

	if len(runs) > limit {
		runs = runs[:limit]
	}

	out := make([]LeaderboardEntry, 0, len(runs))
	for _, r := range runs {
		out = append(out, LeaderboardEntry{
			Username:    userByID[r.UserID],
			DurationMs:  r.DurationMs,
			DamageDealt: r.DamageDealt,
			Deaths:      r.Deaths,
			Victory:     r.Victory,
			CompletedAt: r.CompletedAt,
		})
	}
	return out
}

func isBetter(a, b Run, metric LeaderboardMetric) bool {
	switch metric {
	case MetricTime:
		if a.DurationMs != b.DurationMs {
			return a.DurationMs < b.DurationMs
		}
		return a.Deaths < b.Deaths
	case MetricDamage:
		if a.DamageDealt != b.DamageDealt {
			return a.DamageDealt > b.DamageDealt
		}
		return a.DurationMs < b.DurationMs
	case MetricDeaths:
		if a.Deaths != b.Deaths {
			return a.Deaths < b.Deaths
		}
		return a.DurationMs < b.DurationMs
	}
	return false
}

func (s *Store) RecordsForUser(userID int) Records {
	s.mu.Lock()
	defer s.mu.Unlock()
	rec := Records{}
	for _, r := range s.d.Runs {
		if r.UserID != userID {
			continue
		}
		rec.TotalAttempts++
		if r.Victory {
			rec.TotalVictories++
			if rec.BestTimeMs == nil || r.DurationMs < *rec.BestTimeMs {
				v := r.DurationMs
				rec.BestTimeMs = &v
			}
			if rec.FewestDeathsInVictory == nil || r.Deaths < *rec.FewestDeathsInVictory {
				v := r.Deaths
				rec.FewestDeathsInVictory = &v
			}
		}
		if r.DamageDealt > rec.BestDamageDealt {
			rec.BestDamageDealt = r.DamageDealt
		}
	}
	return rec
}
