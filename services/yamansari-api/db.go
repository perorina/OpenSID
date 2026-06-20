package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var identPattern = regexp.MustCompile(`^[A-Za-z0-9_]+$`)

func openDB(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(12)
	db.SetMaxIdleConns(6)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}

func ensureSchema(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS yms_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  config_id INT NULL,
  id_pend INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_token CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY yms_sessions_token_hash_unique (token_hash),
  KEY yms_sessions_id_pend_idx (config_id, id_pend),
  KEY yms_sessions_expires_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS yms_admin_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  config_id INT NULL,
  id_user INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_token CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY yms_admin_sessions_token_hash_unique (token_hash),
  KEY yms_admin_sessions_id_user_idx (config_id, id_user),
  KEY yms_admin_sessions_expires_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS yms_public_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  config_id INT NULL,
  kind VARCHAR(40) NOT NULL,
  label VARCHAR(120) NOT NULL,
  value VARCHAR(180) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY yms_public_contacts_config_idx (config_id, kind, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`); err != nil {
		return err
	}

	if _, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS yms_public_notices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  config_id INT NULL,
  kind VARCHAR(40) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY yms_public_notices_config_idx (config_id, kind, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`); err != nil {
		return err
	}

	_, err := db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS yms_revalidate_jobs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  config_id INT NULL,
  scope VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL,
  message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY yms_revalidate_jobs_config_idx (config_id, scope, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)

	return err
}

type SchemaCache struct {
	db      *sql.DB
	mu      sync.RWMutex
	tables  map[string]bool
	columns map[string]map[string]bool
}

func NewSchemaCache(db *sql.DB) *SchemaCache {
	return &SchemaCache{
		db:      db,
		tables:  map[string]bool{},
		columns: map[string]map[string]bool{},
	}
}

func (s *SchemaCache) HasTable(ctx context.Context, table string) bool {
	if !validIdent(table) {
		return false
	}

	s.mu.RLock()
	value, ok := s.tables[table]
	s.mu.RUnlock()
	if ok {
		return value
	}

	var count int
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", table).Scan(&count)
	value = err == nil && count > 0

	s.mu.Lock()
	s.tables[table] = value
	s.mu.Unlock()

	return value
}

func (s *SchemaCache) HasColumn(ctx context.Context, table, column string) bool {
	if !validIdent(table) || !validIdent(column) || !s.HasTable(ctx, table) {
		return false
	}

	s.mu.RLock()
	if columns, ok := s.columns[table]; ok {
		value := columns[column]
		s.mu.RUnlock()
		return value
	}
	s.mu.RUnlock()

	rows, err := s.db.QueryContext(ctx, "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ?", table)
	if err != nil {
		return false
	}
	defer rows.Close()

	columns := map[string]bool{}
	for rows.Next() {
		var field string
		if err := rows.Scan(&field); err == nil {
			columns[field] = true
		}
	}

	s.mu.Lock()
	s.columns[table] = columns
	s.mu.Unlock()

	return columns[column]
}

func (a *App) countRows(ctx context.Context, table string, where map[string]any, allowNullConfig bool) (int64, error) {
	if !validIdent(table) || !a.schema.HasTable(ctx, table) {
		return 0, nil
	}

	clauses := []string{}
	args := []any{}
	if a.schema.HasColumn(ctx, table, "config_id") {
		if allowNullConfig {
			clauses = append(clauses, "(config_id = ? OR config_id IS NULL)")
		} else {
			clauses = append(clauses, "config_id = ?")
		}
		args = append(args, a.cfg.ConfigID)
	}

	for field, value := range where {
		if !validIdent(field) || !a.schema.HasColumn(ctx, table, field) {
			continue
		}
		clauses = append(clauses, quoteIdent(field)+" = ?")
		args = append(args, value)
	}

	sqlText := "SELECT COUNT(*) FROM " + quoteIdent(table)
	if len(clauses) > 0 {
		sqlText += " WHERE " + strings.Join(clauses, " AND ")
	}

	var count int64
	if err := a.db.QueryRowContext(ctx, sqlText, args...).Scan(&count); err != nil {
		return 0, err
	}

	return count, nil
}

func (a *App) queryConfig(ctx context.Context) (map[string]string, error) {
	if !a.schema.HasTable(ctx, "config") {
		return map[string]string{}, nil
	}

	rows, err := a.db.QueryContext(ctx, "SELECT * FROM config WHERE id = ? LIMIT 1", a.cfg.ConfigID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items, err := rowsToMaps(rows)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return map[string]string{}, nil
	}

	return items[0], nil
}

func rowsToMaps(rows *sql.Rows) ([]map[string]string, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	items := []map[string]string{}
	for rows.Next() {
		values := make([]sql.RawBytes, len(columns))
		scans := make([]any, len(columns))
		for i := range values {
			scans[i] = &values[i]
		}
		if err := rows.Scan(scans...); err != nil {
			return nil, err
		}

		item := map[string]string{}
		for i, column := range columns {
			item[column] = string(values[i])
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func validIdent(value string) bool {
	return identPattern.MatchString(value)
}

func quoteIdent(value string) string {
	if !validIdent(value) {
		panic(fmt.Sprintf("invalid SQL identifier: %s", value))
	}

	return "`" + value + "`"
}

func strValue(row map[string]string, key, fallback string) string {
	value := strings.TrimSpace(row[key])
	if value == "" {
		return fallback
	}

	return value
}

func nilString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	return value
}

func scanNullString(value sql.NullString) any {
	if !value.Valid || strings.TrimSpace(value.String) == "" {
		return nil
	}

	return value.String
}

func intValue(row map[string]string, key string) int64 {
	value := strings.TrimSpace(row[key])
	if value == "" {
		return 0
	}

	parsed, _ := strconv.ParseInt(value, 10, 64)
	return parsed
}

func safeLimit(raw string, fallback, max int) int {
	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed <= 0 {
		return fallback
	}
	if parsed > max {
		return max
	}

	return parsed
}

func requireTable(schema *SchemaCache, ctx context.Context, table string) error {
	if !schema.HasTable(ctx, table) {
		return errors.New("required OpenSID table is not available: " + table)
	}

	return nil
}
