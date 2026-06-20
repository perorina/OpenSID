package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
)

type Config struct {
	Addr           string
	DBDSN          string
	DBConfigError  string
	ConfigID       int64
	AllowedOrigins map[string]bool
	InternalAPIKey string
	JWTSecret      []byte
	CookieSecure   bool
	OpenSIDBaseURL string
	AccessTTL      time.Duration
	RefreshTTL     time.Duration
}

func LoadConfig() Config {
	dbDSN, dbConfigError := envDBDSN()

	return Config{
		Addr:           envString("YMS_API_ADDR", "127.0.0.1:8090"),
		DBDSN:          dbDSN,
		DBConfigError:  dbConfigError,
		ConfigID:       envInt64("YMS_CONFIG_ID", 1),
		AllowedOrigins: envOrigins("YMS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"),
		InternalAPIKey: envString("YMS_INTERNAL_API_KEY", "dev-internal-key"),
		JWTSecret:      []byte(envString("YMS_JWT_SECRET", "dev-change-me")),
		CookieSecure:   envBool("YMS_COOKIE_SECURE", false),
		OpenSIDBaseURL: strings.TrimRight(envString("YMS_OPENSID_BASE_URL", "http://127.0.0.1:8081"), "/"),
		AccessTTL:      15 * time.Minute,
		RefreshTTL:     7 * 24 * time.Hour,
	}
}

type openSIDDBConfig struct {
	Hostname  string `json:"hostname"`
	Username  string `json:"username"`
	Password  string `json:"password"`
	Port      int    `json:"port"`
	Database  string `json:"database"`
	Charset   string `json:"charset"`
	Collation string `json:"collation"`
}

func envDBDSN() (string, string) {
	if value := strings.TrimSpace(os.Getenv("YMS_DB_DSN")); value != "" {
		return value, ""
	}

	value := strings.TrimSpace(os.Getenv("YMS_DB_CONFIG_JSON"))
	if value == "" {
		return "", ""
	}

	dsn, err := openSIDDBConfigJSONToDSN(value)
	if err != nil {
		return "", err.Error()
	}

	return dsn, ""
}

func openSIDDBConfigJSONToDSN(value string) (string, error) {
	var cfg openSIDDBConfig
	if err := json.Unmarshal([]byte(value), &cfg); err != nil {
		return "", fmt.Errorf("parse YMS_DB_CONFIG_JSON: %w", err)
	}

	cfg.Hostname = strings.TrimSpace(cfg.Hostname)
	cfg.Username = strings.TrimSpace(cfg.Username)
	cfg.Database = strings.TrimSpace(cfg.Database)
	cfg.Charset = strings.TrimSpace(cfg.Charset)
	cfg.Collation = strings.TrimSpace(cfg.Collation)

	if cfg.Hostname == "" {
		return "", errors.New("YMS_DB_CONFIG_JSON.hostname is required")
	}
	if cfg.Username == "" {
		return "", errors.New("YMS_DB_CONFIG_JSON.username is required")
	}
	if cfg.Database == "" {
		return "", errors.New("YMS_DB_CONFIG_JSON.database is required")
	}
	if cfg.Port <= 0 {
		cfg.Port = 3306
	}
	if cfg.Charset == "" {
		cfg.Charset = "utf8mb4"
	}

	params := map[string]string{"charset": cfg.Charset}
	mysqlCfg := mysql.Config{
		User:                 cfg.Username,
		Passwd:               cfg.Password,
		Net:                  "tcp",
		Addr:                 net.JoinHostPort(cfg.Hostname, strconv.Itoa(cfg.Port)),
		DBName:               cfg.Database,
		ParseTime:            true,
		AllowNativePasswords: true,
		Params:               params,
	}
	if cfg.Collation != "" {
		mysqlCfg.Collation = cfg.Collation
	}

	return mysqlCfg.FormatDSN(), nil
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
