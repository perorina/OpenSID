package main

import (
	"strings"
	"testing"

	"github.com/go-sql-driver/mysql"
)

func TestOpenSIDDBConfigJSONToDSN(t *testing.T) {
	dsn, err := openSIDDBConfigJSONToDSN(`{
		"hostname": "127.0.0.1",
		"username": "opensid",
		"password": "pa:ss@word",
		"port": 3307,
		"database": "opensid_local",
		"charset": "utf8mb4",
		"collation": "utf8mb4_general_ci"
	}`)
	if err != nil {
		t.Fatalf("openSIDDBConfigJSONToDSN() error = %v", err)
	}

	cfg, err := mysql.ParseDSN(dsn)
	if err != nil {
		t.Fatalf("mysql.ParseDSN() error = %v", err)
	}
	if cfg.User != "opensid" || cfg.Passwd != "pa:ss@word" || cfg.Addr != "127.0.0.1:3307" || cfg.DBName != "opensid_local" {
		t.Fatalf("parsed DSN mismatch: %#v", cfg)
	}
	if !cfg.ParseTime {
		t.Fatal("ParseTime should be enabled")
	}
	if !cfg.AllowNativePasswords {
		t.Fatal("AllowNativePasswords should be enabled for local OpenSID MariaDB users")
	}
	if !strings.Contains(dsn, "charset=utf8mb4") {
		t.Fatalf("dsn should include charset=utf8mb4: %s", dsn)
	}
}

func TestEnvDBDSNPrefersExplicitDSN(t *testing.T) {
	t.Setenv("YMS_DB_DSN", "user:pass@tcp(127.0.0.1:3306)/db")
	t.Setenv("YMS_DB_CONFIG_JSON", `{"hostname":"bad"}`)

	dsn, errText := envDBDSN()
	if errText != "" {
		t.Fatalf("envDBDSN() error = %s", errText)
	}
	if dsn != "user:pass@tcp(127.0.0.1:3306)/db" {
		t.Fatalf("envDBDSN() = %q", dsn)
	}
}
