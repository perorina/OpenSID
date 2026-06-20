package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	adminAccessCookie  = "yms_admin_access"
	adminRefreshCookie = "yms_admin_refresh"
	adminCSRFCookie    = "yms_admin_csrf"
)

const adminUserKey contextKey = "adminUser"

type AdminUser struct {
	ID        int64  `json:"id"`
	ConfigID  int64  `json:"config_id"`
	Username  string `json:"username"`
	Nama      string `json:"nama"`
	Email     string `json:"email,omitempty"`
	IDGrup    int64  `json:"id_grup"`
	Active    int64  `json:"-"`
	Password  string `json:"-"`
	SessionID int64  `json:"-"`
	CSRFToken string `json:"-"`
}

type adminAccessClaims struct {
	IDUser    int64  `json:"id_user"`
	ConfigID  int64  `json:"config_id"`
	SessionID int64  `json:"sid"`
	Username  string `json:"username"`
	Nama      string `json:"nama"`
	jwt.RegisteredClaims
}

func (a *App) adminLogin(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")

	var payload struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Payload login admin tidak valid.")
		return
	}

	username := strings.TrimSpace(payload.Username)
	password := strings.TrimSpace(payload.Password)
	if username == "" || password == "" {
		a.error(w, http.StatusBadRequest, "missing_credentials", "Username dan password admin wajib diisi.")
		return
	}

	limitKey := "admin:" + strings.ToLower(username) + ":" + r.RemoteAddr
	if retry := a.loginLimiter.blocked(limitKey); retry > 0 {
		w.Header().Set("Retry-After", strconv.Itoa(int(retry.Seconds())))
		a.error(w, http.StatusTooManyRequests, "login_locked", "Login admin dikunci sementara karena terlalu banyak percobaan gagal.")
		return
	}

	user, err := a.findAdminUser(r.Context(), username)
	if err != nil || user.Active != 1 || !verifyAdminPassword(password, user.Password) {
		a.loginLimiter.fail(limitKey)
		a.error(w, http.StatusUnauthorized, "invalid_credentials", "Username atau password admin tidak sesuai.")
		return
	}
	a.loginLimiter.reset(limitKey)

	sessionID, refreshToken, csrfToken, err := a.createAdminSession(r.Context(), user, r)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "session_failed", "Session admin belum bisa dibuat.")
		return
	}
	user.SessionID = sessionID
	user.CSRFToken = csrfToken

	if err := a.issueAdminAccessCookie(w, user); err != nil {
		a.error(w, http.StatusInternalServerError, "token_failed", "Token admin belum bisa dibuat.")
		return
	}
	a.setAdminRefreshCookie(w, refreshToken, time.Now().Add(a.cfg.RefreshTTL))
	a.setAdminCSRFCookie(w, csrfToken, time.Now().Add(a.cfg.RefreshTTL))
	_, _ = a.db.ExecContext(r.Context(), "UPDATE `user` SET last_login = NOW() WHERE id = ? AND (config_id = ? OR config_id IS NULL OR config_id = 0)", user.ID, a.cfg.ConfigID)

	a.ok(w, http.StatusOK, map[string]any{
		"user": user.publicPayload(), "csrfToken": csrfToken,
		"accessTtl": int(a.cfg.AccessTTL.Seconds()), "refreshTtl": int(a.cfg.RefreshTTL.Seconds()),
	}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminRefresh(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	cookie, err := r.Cookie(adminRefreshCookie)
	if err != nil || cookie.Value == "" {
		a.error(w, http.StatusUnauthorized, "missing_refresh", "Refresh session admin tidak ditemukan.")
		return
	}

	user, refreshExpires, err := a.adminUserByRefreshToken(r.Context(), cookie.Value)
	if err != nil {
		a.clearAdminAuthCookies(w)
		a.error(w, http.StatusUnauthorized, "invalid_refresh", "Refresh session admin tidak valid atau sudah habis.")
		return
	}

	if err := a.issueAdminAccessCookie(w, user); err != nil {
		a.error(w, http.StatusInternalServerError, "token_failed", "Token admin belum bisa dibuat.")
		return
	}
	a.setAdminRefreshCookie(w, cookie.Value, refreshExpires)
	a.setAdminCSRFCookie(w, user.CSRFToken, refreshExpires)
	a.ok(w, http.StatusOK, map[string]any{"user": user.publicPayload(), "csrfToken": user.CSRFToken, "accessTtl": int(a.cfg.AccessTTL.Seconds())}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminLogout(w http.ResponseWriter, r *http.Request) {
	user := adminUserFromContext(r.Context())
	if user != nil {
		_, _ = a.db.ExecContext(r.Context(), "UPDATE yms_admin_sessions SET revoked_at = NOW(), updated_at = NOW() WHERE id = ? AND id_user = ?", user.SessionID, user.ID)
	}
	a.clearAdminAuthCookies(w)
	a.ok(w, http.StatusOK, map[string]any{"loggedOut": true}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminMe(w http.ResponseWriter, r *http.Request) {
	user := adminUserFromContext(r.Context())
	if user == nil {
		a.error(w, http.StatusUnauthorized, "unauthorized", "Session admin tidak valid.")
		return
	}

	a.ok(w, http.StatusOK, map[string]any{"user": user.publicPayload()}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) requireAdminAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(adminAccessCookie)
		if err != nil || cookie.Value == "" {
			a.error(w, http.StatusUnauthorized, "unauthorized", "Session admin tidak ditemukan.")
			return
		}

		claims, err := a.parseAdminAccessToken(cookie.Value)
		if err != nil {
			a.error(w, http.StatusUnauthorized, "unauthorized", "Session admin sudah tidak valid.")
			return
		}

		user, err := a.adminUserBySession(r.Context(), claims.SessionID, claims.IDUser)
		if err != nil {
			a.error(w, http.StatusUnauthorized, "unauthorized", "Session admin sudah tidak aktif.")
			return
		}

		ctx := context.WithValue(r.Context(), adminUserKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *App) requireAdminCSRF(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		user := adminUserFromContext(r.Context())
		if user == nil || user.CSRFToken == "" || r.Header.Get("X-CSRF-Token") != user.CSRFToken {
			a.error(w, http.StatusForbidden, "csrf_failed", "Token CSRF admin tidak valid.")
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (a *App) findAdminUser(ctx context.Context, username string) (*AdminUser, error) {
	if err := requireTable(a.schema, ctx, "user"); err != nil {
		return nil, err
	}

	row := a.db.QueryRowContext(ctx, `SELECT id, IFNULL(config_id, 0), IFNULL(username, ''), IFNULL(password, ''), IFNULL(nama, ''), IFNULL(email, ''), IFNULL(id_grup, 0), IFNULL(active, 0)
FROM `+"`user`"+`
WHERE username = ? AND (config_id = ? OR config_id IS NULL OR config_id = 0)
ORDER BY IF(config_id = ?, 0, 1)
LIMIT 1`, username, a.cfg.ConfigID, a.cfg.ConfigID)

	user := &AdminUser{}
	if err := row.Scan(&user.ID, &user.ConfigID, &user.Username, &user.Password, &user.Nama, &user.Email, &user.IDGrup, &user.Active); err != nil {
		return nil, err
	}

	return user, nil
}

func (a *App) createAdminSession(ctx context.Context, user *AdminUser, r *http.Request) (int64, string, string, error) {
	refreshToken, err := randomToken(48)
	if err != nil {
		return 0, "", "", err
	}
	csrfToken, err := randomHex(32)
	if err != nil {
		return 0, "", "", err
	}

	expiresAt := time.Now().Add(a.cfg.RefreshTTL)
	result, err := a.db.ExecContext(ctx, `INSERT INTO yms_admin_sessions (config_id, id_user, token_hash, csrf_token, user_agent, ip_address, expires_at, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, a.cfg.ConfigID, user.ID, hashToken(refreshToken), csrfToken, trimTo(r.UserAgent(), 255), trimTo(r.RemoteAddr, 64), expiresAt)
	if err != nil {
		return 0, "", "", err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, "", "", err
	}

	return id, refreshToken, csrfToken, nil
}

func (a *App) adminUserBySession(ctx context.Context, sessionID, idUser int64) (*AdminUser, error) {
	row := a.db.QueryRowContext(ctx, `SELECT u.id, IFNULL(u.config_id, 0), IFNULL(u.username, ''), IFNULL(u.nama, ''), IFNULL(u.email, ''), IFNULL(u.id_grup, 0), IFNULL(u.active, 0), s.id, s.csrf_token
FROM yms_admin_sessions s
JOIN `+"`user`"+` u ON u.id = s.id_user
WHERE s.id = ? AND s.id_user = ? AND s.config_id = ? AND s.revoked_at IS NULL AND s.expires_at > NOW() AND IFNULL(u.active, 0) = 1
LIMIT 1`, sessionID, idUser, a.cfg.ConfigID)

	user := &AdminUser{}
	if err := row.Scan(&user.ID, &user.ConfigID, &user.Username, &user.Nama, &user.Email, &user.IDGrup, &user.Active, &user.SessionID, &user.CSRFToken); err != nil {
		return nil, err
	}

	return user, nil
}

func (a *App) adminUserByRefreshToken(ctx context.Context, refreshToken string) (*AdminUser, time.Time, error) {
	row := a.db.QueryRowContext(ctx, `SELECT u.id, IFNULL(u.config_id, 0), IFNULL(u.username, ''), IFNULL(u.nama, ''), IFNULL(u.email, ''), IFNULL(u.id_grup, 0), IFNULL(u.active, 0), s.id, s.csrf_token, s.expires_at
FROM yms_admin_sessions s
JOIN `+"`user`"+` u ON u.id = s.id_user
WHERE s.token_hash = ? AND s.config_id = ? AND s.revoked_at IS NULL AND s.expires_at > NOW() AND IFNULL(u.active, 0) = 1
LIMIT 1`, hashToken(refreshToken), a.cfg.ConfigID)

	user := &AdminUser{}
	var expiresAt time.Time
	if err := row.Scan(&user.ID, &user.ConfigID, &user.Username, &user.Nama, &user.Email, &user.IDGrup, &user.Active, &user.SessionID, &user.CSRFToken, &expiresAt); err != nil {
		return nil, time.Time{}, err
	}

	return user, expiresAt, nil
}

func (a *App) issueAdminAccessCookie(w http.ResponseWriter, user *AdminUser) error {
	now := time.Now()
	expires := now.Add(a.cfg.AccessTTL)
	claims := adminAccessClaims{
		IDUser: user.ID, ConfigID: a.cfg.ConfigID, SessionID: user.SessionID, Username: user.Username, Nama: user.Nama,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer: "yamansari-api", Subject: strconv.FormatInt(user.ID, 10),
			IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(expires),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(a.cfg.JWTSecret)
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{Name: adminAccessCookie, Value: signed, Path: "/api/yms", Expires: expires, MaxAge: int(a.cfg.AccessTTL.Seconds()), HttpOnly: true, Secure: a.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
	return nil
}

func (a *App) parseAdminAccessToken(raw string) (*adminAccessClaims, error) {
	parsed, err := jwt.ParseWithClaims(raw, &adminAccessClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return a.cfg.JWTSecret, nil
	})
	if err != nil || !parsed.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := parsed.Claims.(*adminAccessClaims)
	if !ok || claims.IDUser == 0 || claims.SessionID == 0 {
		return nil, fmt.Errorf("invalid claims")
	}

	return claims, nil
}

func (a *App) setAdminRefreshCookie(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{Name: adminRefreshCookie, Value: token, Path: "/api/yms", Expires: expires, MaxAge: maxAge(expires), HttpOnly: true, Secure: a.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
}

func (a *App) setAdminCSRFCookie(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{Name: adminCSRFCookie, Value: token, Path: "/api/yms", Expires: expires, MaxAge: maxAge(expires), HttpOnly: false, Secure: a.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
}

func (a *App) clearAdminAuthCookies(w http.ResponseWriter) {
	for _, name := range []string{adminAccessCookie, adminRefreshCookie, adminCSRFCookie} {
		http.SetCookie(w, &http.Cookie{Name: name, Value: "", Path: "/api/yms", MaxAge: -1, HttpOnly: name != adminCSRFCookie, Secure: a.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
	}
}

func verifyAdminPassword(password, hashed string) bool {
	hashed = strings.TrimSpace(hashed)
	if hashed == "" {
		return false
	}

	if strings.HasPrefix(hashed, "$2y$") || strings.HasPrefix(hashed, "$2a$") || strings.HasPrefix(hashed, "$2b$") {
		bcryptHash := strings.Replace(hashed, "$2y$", "$2a$", 1)
		return bcrypt.CompareHashAndPassword([]byte(bcryptHash), []byte(password)) == nil
	}

	return false
}

func adminUserFromContext(ctx context.Context) *AdminUser {
	user, _ := ctx.Value(adminUserKey).(*AdminUser)
	return user
}

func (u *AdminUser) publicPayload() map[string]any {
	return map[string]any{"id": u.ID, "config_id": u.ConfigID, "username": u.Username, "nama": u.Nama, "email": nilString(u.Email), "id_grup": u.IDGrup}
}
