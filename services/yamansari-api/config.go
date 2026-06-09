package main

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr           string
	DBDSN          string
	ConfigID       int64
	AllowedOrigins map[string]bool
	JWTSecret      []byte
	CookieSecure   bool
	OpenSIDBaseURL string
	AccessTTL      time.Duration
	RefreshTTL     time.Duration
}

func LoadConfig() Config {
	return Config{
		Addr:           envString("YMS_API_ADDR", "127.0.0.1:8090"),
		DBDSN:          envString("YMS_DB_DSN", "root:@tcp(127.0.0.1:3307)/opensid_local?parseTime=true&charset=utf8mb4"),
		ConfigID:       envInt64("YMS_CONFIG_ID", 1),
		AllowedOrigins: envOrigins("YMS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"),
		JWTSecret:      []byte(envString("YMS_JWT_SECRET", "dev-change-me")),
		CookieSecure:   envBool("YMS_COOKIE_SECURE", false),
		OpenSIDBaseURL: strings.TrimRight(envString("YMS_OPENSID_BASE_URL", "http://127.0.0.1:8081"), "/"),
		AccessTTL:      15 * time.Minute,
		RefreshTTL:     7 * 24 * time.Hour,
	}
}

func envString(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}

	return fallback
}

func envInt64(key string, fallback int64) int64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return fallback
	}

	return parsed
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func envOrigins(key, fallback string) map[string]bool {
	origins := map[string]bool{}
	for _, origin := range strings.Split(envString(key, fallback), ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			origins[origin] = true
		}
	}

	return origins
}
