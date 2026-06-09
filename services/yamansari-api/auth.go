package main

import (
	"context"
	"crypto/md5"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	accessCookie  = "yms_access"
	refreshCookie = "yms_refresh"
	csrfCookie    = "yms_csrf"
)

type contextKey string

const mandiriUserKey contextKey = "mandiriUser"

type MandiriUser struct {
	IDPend    int64  `json:"id_pend"`
	ConfigID  int64  `json:"config_id"`
	NIK       string `json:"nik"`
	Nama      string `json:"nama"`
	Email     string `json:"email,omitempty"`
	Telegram  string `json:"telegram,omitempty"`
	PINHash   string `json:"-"`
	Aktif     int64  `json:"-"`
	SessionID int64  `json:"-"`
	CSRFToken string `json:"-"`
}

type accessClaims struct {
	IDPend    int64  `json:"id_pend"`
	ConfigID  int64  `json:"config_id"`
	SessionID int64  `json:"sid"`
	NIK       string `json:"nik"`
	Nama      string `json:"nama"`
	jwt.RegisteredClaims
}

type LoginLimiter struct {
	mu        sync.Mutex
	max       int
	lockFor   time.Duration
	attempts  map[string]int
	blockedTo map[string]time.Time
}

func NewLoginLimiter(max int, lockFor time.Duration) *LoginLimiter {
	return &LoginLimiter{max: max, lockFor: lockFor, attempts: map[string]int{}, blockedTo: map[string]time.Time{}}
}

func (l *LoginLimiter) blocked(key string) time.Duration {
	l.mu.Lock()
	defer l.mu.Unlock()

	until := l.blockedTo[key]
	if until.IsZero() || time.Now().After(until) {
		delete(l.blockedTo, key)
		delete(l.attempts, key)
		return 0
	}

	return time.Until(until)
}

func (l *LoginLimiter) fail(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.attempts[key]++
	if l.attempts[key] >= l.max {
		l.blockedTo[key] = time.Now().Add(l.lockFor)
	}
}

func (l *LoginLimiter) reset(key string) {
	l.mu.Lock()
	delete(l.attempts, key)
	delete(l.blockedTo, key)
	l.mu.Unlock()
}

func (a *App) login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")

	var payload struct {
		NIK      string `json:"nik"`
		PIN      string `json:"pin"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Payload login tidak valid.")
		return
	}

	nik := onlyDigits(payload.NIK)
	pin := strings.TrimSpace(payload.PIN)
	if pin == "" {
		pin = strings.TrimSpace(payload.Password)
	}
	if nik == "" || pin == "" {
		a.error(w, http.StatusBadRequest, "missing_credentials", "NIK dan PIN wajib diisi.")
		return
	}

	limitKey := nik + ":" + r.RemoteAddr
	if retry := a.loginLimiter.blocked(limitKey); retry > 0 {
		w.Header().Set("Retry-After", strconv.Itoa(int(retry.Seconds())))
		a.error(w, http.StatusTooManyRequests, "login_locked", "Login dikunci sementara karena terlalu banyak percobaan gagal.")
		return
	}

	user, err := a.findMandiriUser(r.Context(), nik)
	if err != nil || user.Aktif != 1 || !verifyPIN(pin, user.PINHash) {
		a.loginLimiter.fail(limitKey)
		a.error(w, http.StatusUnauthorized, "invalid_credentials", "NIK atau PIN tidak sesuai.")
		return
	}
	a.loginLimiter.reset(limitKey)

	sessionID, refreshToken, csrfToken, err := a.createSession(r.Context(), user, r)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "session_failed", "Session mandiri belum bisa dibuat.")
		return
	}
	user.SessionID = sessionID
	user.CSRFToken = csrfToken

	if err := a.issueAccessCookie(w, user); err != nil {
		a.error(w, http.StatusInternalServerError, "token_failed", "Token akses belum bisa dibuat.")
		return
	}
	a.setRefreshCookie(w, refreshToken, time.Now().Add(a.cfg.RefreshTTL))
	a.setCSRFCookie(w, csrfToken, time.Now().Add(a.cfg.RefreshTTL))
	_, _ = a.db.ExecContext(r.Context(), "UPDATE tweb_penduduk_mandiri SET last_login = NOW() WHERE id_pend = ? AND config_id = ?", user.IDPend, a.cfg.ConfigID)

	a.ok(w, http.StatusOK, map[string]any{
		"user": user.publicPayload(), "csrfToken": csrfToken,
		"accessTtl": int(a.cfg.AccessTTL.Seconds()), "refreshTtl": int(a.cfg.RefreshTTL.Seconds()),
	}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) refresh(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	cookie, err := r.Cookie(refreshCookie)
	if err != nil || cookie.Value == "" {
		a.error(w, http.StatusUnauthorized, "missing_refresh", "Refresh session tidak ditemukan.")
		return
	}

	user, refreshExpires, err := a.userByRefreshToken(r.Context(), cookie.Value)
	if err != nil {
		a.clearAuthCookies(w)
		a.error(w, http.StatusUnauthorized, "invalid_refresh", "Refresh session tidak valid atau sudah habis.")
		return
	}

	if err := a.issueAccessCookie(w, user); err != nil {
		a.error(w, http.StatusInternalServerError, "token_failed", "Token akses belum bisa dibuat.")
		return
	}
	a.setRefreshCookie(w, cookie.Value, refreshExpires)
	a.setCSRFCookie(w, user.CSRFToken, refreshExpires)
	a.ok(w, http.StatusOK, map[string]any{"user": user.publicPayload(), "csrfToken": user.CSRFToken, "accessTtl": int(a.cfg.AccessTTL.Seconds())}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	if user != nil {
		_, _ = a.db.ExecContext(r.Context(), "UPDATE yms_sessions SET revoked_at = NOW(), updated_at = NOW() WHERE id = ? AND id_pend = ?", user.SessionID, user.IDPend)
	}
	a.clearAuthCookies(w)
	a.ok(w, http.StatusOK, map[string]any{"loggedOut": true}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	if user == nil {
		a.error(w, http.StatusUnauthorized, "unauthorized", "Session mandiri tidak valid.")
		return
	}

	a.ok(w, http.StatusOK, map[string]any{"user": user.publicPayload()}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(accessCookie)
		if err != nil || cookie.Value == "" {
			a.error(w, http.StatusUnauthorized, "unauthorized", "Session mandiri tidak ditemukan.")
			return
		}

		claims, err := a.parseAccessToken(cookie.Value)
		if err != nil {
			a.error(w, http.StatusUnauthorized, "unauthorized", "Session mandiri sudah tidak valid.")
			return
		}

		user, err := a.userBySession(r.Context(), claims.SessionID, claims.IDPend)
		if err != nil {
			a.error(w, http.StatusUnauthorized, "unauthorized", "Session mandiri sudah tidak aktif.")
			return
		}

		ctx := context.WithValue(r.Context(), mandiriUserKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *App) requireCSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		user := userFromContext(r.Context())
		if user == nil || user.CSRFToken == "" || r.Header.Get("X-CSRF-Token") != user.CSRFToken {
			a.error(w, http.StatusForbidden, "csrf_failed", "Token CSRF tidak valid.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (a *App) findMandiriUser(ctx context.Context, nik string) (*MandiriUser, error) {
	if err := requireTable(a.schema, ctx, "tweb_penduduk_mandiri"); err != nil {
		return nil, err
	}
	if err := requireTable(a.schema, ctx, "tweb_penduduk"); err != nil {
		return nil, err
	}

	row := a.db.QueryRowContext(ctx, `SELECT p.id, IFNULL(p.config_id, 0), IFNULL(p.nik, ''), IFNULL(p.nama, ''), IFNULL(p.email, ''), IFNULL(p.telegram, ''), IFNULL(m.pin, ''), IFNULL(m.aktif, 0)
FROM tweb_penduduk_mandiri m
JOIN tweb_penduduk p ON p.id = m.id_pend
WHERE p.nik = ? AND p.config_id = ? AND m.config_id = ?
LIMIT 1`, nik, a.cfg.ConfigID, a.cfg.ConfigID)

	user := &MandiriUser{}
	if err := row.Scan(&user.IDPend, &user.ConfigID, &user.NIK, &user.Nama, &user.Email, &user.Telegram, &user.PINHash, &user.Aktif); err != nil {
		return nil, err
	}

	return user, nil
}

func (a *App) createSession(ctx context.Context, user *MandiriUser, r *http.Request) (int64, string, string, error) {
	refreshToken, err := randomToken(48)
	if err != nil {
		return 0, "", "", err
	}
	csrfToken, err := randomHex(32)
	if err != nil {
		return 0, "", "", err
	}

	expiresAt := time.Now().Add(a.cfg.RefreshTTL)
	result, err := a.db.ExecContext(ctx, `INSERT INTO yms_sessions (config_id, id_pend, token_hash, csrf_token, user_agent, ip_address, expires_at, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, a.cfg.ConfigID, user.IDPend, hashToken(refreshToken), csrfToken, trimTo(r.UserAgent(), 255), trimTo(r.RemoteAddr, 64), expiresAt)
	if err != nil {
		return 0, "", "", err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, "", "", err
	}

	return id, refreshToken, csrfToken, nil
}

func (a *App) userBySession(ctx context.Context, sessionID, idPend int64) (*MandiriUser, error) {
	row := a.db.QueryRowContext(ctx, `SELECT p.id, IFNULL(p.config_id, 0), IFNULL(p.nik, ''), IFNULL(p.nama, ''), IFNULL(p.email, ''), IFNULL(p.telegram, ''), s.id, s.csrf_token
FROM yms_sessions s
JOIN tweb_penduduk p ON p.id = s.id_pend
WHERE s.id = ? AND s.id_pend = ? AND s.config_id = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
LIMIT 1`, sessionID, idPend, a.cfg.ConfigID)

	user := &MandiriUser{}
	if err := row.Scan(&user.IDPend, &user.ConfigID, &user.NIK, &user.Nama, &user.Email, &user.Telegram, &user.SessionID, &user.CSRFToken); err != nil {
		return nil, err
	}

	return user, nil
}

func (a *App) userByRefreshToken(ctx context.Context, refreshToken string) (*MandiriUser, time.Time, error) {
	row := a.db.QueryRowContext(ctx, `SELECT p.id, IFNULL(p.config_id, 0), IFNULL(p.nik, ''), IFNULL(p.nama, ''), IFNULL(p.email, ''), IFNULL(p.telegram, ''), s.id, s.csrf_token, s.expires_at
FROM yms_sessions s
JOIN tweb_penduduk p ON p.id = s.id_pend
WHERE s.token_hash = ? AND s.config_id = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
LIMIT 1`, hashToken(refreshToken), a.cfg.ConfigID)

	user := &MandiriUser{}
	var expiresAt time.Time
	if err := row.Scan(&user.IDPend, &user.ConfigID, &user.NIK, &user.Nama, &user.Email, &user.Telegram, &user.SessionID, &user.CSRFToken, &expiresAt); err != nil {
		return nil, time.Time{}, err
	}

	return user, expiresAt, nil
}

func (a *App) issueAccessCookie(w http.ResponseWriter, user *MandiriUser) error {
	now := time.Now()
	expires := now.Add(a.cfg.AccessTTL)
	claims := accessClaims{
		IDPend: user.IDPend, ConfigID: a.cfg.ConfigID, SessionID: user.SessionID, NIK: user.NIK, Nama: user.Nama,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer: "yamansari-api", Subject: strconv.FormatInt(user.IDPend, 10),
			IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(expires),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(a.cfg.JWTSecret)
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{Name: accessCookie, Value: signed, Path: "/api/yms", Expires: expires, MaxAge: int(a.cfg.AccessTTL.Seconds()), HttpOnly: true, Secure: a.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
	return nil
}

func (a *App) parseAccessToken(raw string) (*accessClaims, error) {
	parsed, err := jwt.ParseWithClaims(raw, &accessClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return a.cfg.JWTSecret, nil
	})
	if err != nil || !parsed.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := parsed.Claims.(*accessClaims)
	if !ok || claims.IDPend == 0 || claims.SessionID == 0 {
		return nil, fmt.Errorf("invalid claims")
	}

	return claims, nil
}

func (a *App) setRefreshCookie(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{Name: refreshCookie, Value: token, Path: "/api/yms", Expires: expires, MaxAge: maxAge(expires), HttpOnly: true, Secure: a.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
}

func (a *App) setCSRFCookie(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{Name: csrfCookie, Value: token, Path: "/api/yms", Expires: expires, MaxAge: maxAge(expires), HttpOnly: false, Secure: a.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
}

func (a *App) clearAuthCookies(w http.ResponseWriter) {
	for _, name := range []string{accessCookie, refreshCookie, csrfCookie} {
		http.SetCookie(w, &http.Cookie{Name: name, Value: "", Path: "/api/yms", MaxAge: -1, HttpOnly: name != csrfCookie, Secure: a.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
	}
}

func verifyPIN(pin, hashed string) bool {
	hashed = strings.TrimSpace(hashed)
	if hashed == "" {
		return false
	}

	if strings.HasPrefix(hashed, "$2y$") || strings.HasPrefix(hashed, "$2a$") || strings.HasPrefix(hashed, "$2b$") {
		bcryptHash := strings.Replace(hashed, "$2y$", "$2a$", 1)
		return bcrypt.CompareHashAndPassword([]byte(bcryptHash), []byte(pin)) == nil
	}
	if len(hashed) == 32 {
		return strings.EqualFold(legacyOpenSIDPIN(pin), hashed)
	}

	return false
}

func legacyOpenSIDPIN(pin string) string {
	if len(pin) != 6 || onlyDigits(pin) != pin {
		return ""
	}
	reversed := reverseString(pin)
	number, err := strconv.ParseInt(reversed, 10, 64)
	if err != nil {
		return ""
	}
	source := fmt.Sprintf("%d!#@$#%%", number*77)
	sum := md5.Sum([]byte(source))
	return hex.EncodeToString(sum[:])
}

func randomToken(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func randomHex(size int) (string, error) {
	buf := make([]byte, size)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func onlyDigits(value string) string {
	var b strings.Builder
	for _, r := range value {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func reverseString(value string) string {
	runes := []rune(value)
	for left, right := 0, len(runes)-1; left < right; left, right = left+1, right-1 {
		runes[left], runes[right] = runes[right], runes[left]
	}
	return string(runes)
}

func trimTo(value string, limit int) string {
	value = strings.TrimSpace(value)
	if len(value) <= limit {
		return value
	}
	return value[:limit]
}

func maxAge(expires time.Time) int {
	seconds := int(time.Until(expires).Seconds())
	if seconds < 0 {
		return 0
	}
	return seconds
}

func userFromContext(ctx context.Context) *MandiriUser {
	user, _ := ctx.Value(mandiriUserKey).(*MandiriUser)
	return user
}

func (u *MandiriUser) publicPayload() map[string]any {
	return map[string]any{"id_pend": u.IDPend, "config_id": u.ConfigID, "nik": u.NIK, "nama": u.Nama, "email": nilString(u.Email), "telegram": nilString(u.Telegram)}
}

func sqlNoRows(err error) bool {
	return err == sql.ErrNoRows
}
