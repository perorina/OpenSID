package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type App struct {
	cfg          Config
	db           *sql.DB
	schema       *SchemaCache
	cache        *TTLCache
	startedAt    time.Time
	loginLimiter *LoginLimiter
}

func main() {
	cfg := LoadConfig()
	if cfg.DBConfigError != "" {
		log.Fatalf("load database config: %s", cfg.DBConfigError)
	}
	if cfg.DBDSN == "" {
		log.Fatal("YMS_DB_DSN belum diset. Untuk lokal OpenSID, jalankan services/yamansari-api/scripts/run-local.ps1")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := openDB(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}
	defer db.Close()

	if err := ensureSchema(ctx, db); err != nil {
		log.Fatalf("ensure schema: %v", err)
	}

	app := &App{
		cfg:          cfg,
		db:           db,
		schema:       NewSchemaCache(db),
		cache:        NewTTLCache(),
		startedAt:    time.Now(),
		loginLimiter: NewLoginLimiter(3, 300*time.Second),
	}

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           app.routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("yamansari-api listening on http://%s/api/yms", cfg.Addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("serve: %v", err)
	}
}

func (a *App) routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)
	r.Use(a.cors)

	r.Route("/api/yms", func(r chi.Router) {
		r.Get("/health", a.health)

		r.Group(func(r chi.Router) {
			r.Use(a.requireInternalAPIKey)

			r.Get("/profil", a.profil)
			r.Get("/ringkasan", a.ringkasan)
			r.Get("/artikel", a.artikel)
			r.Get("/pembangunan", a.pembangunan)
			r.Get("/program-bantuan", a.programBantuan)
			r.Get("/dtks", a.dtks)
			r.Get("/public/home", a.publicHome)
			r.Get("/public/profile", a.profil)
			r.Get("/public/organization", a.publicOrganization)
			r.Get("/public/budget", a.publicBudget)
			r.Get("/public/planning", a.publicPlanning)
			r.Get("/public/programs", a.programBantuan)
			r.Get("/public/legal-products", a.publicDocuments)
			r.Get("/public/ppid", a.publicDocuments)
			r.Get("/public/dip", a.publicDocuments)
			r.Get("/public/stats", a.ringkasan)
			r.Get("/public/articles", a.artikel)
			r.Get("/public/announcements", a.artikel)
			r.Get("/public/emergency", a.publicEmergency)
			r.Post("/public/complaints", a.createPublicComplaint)
			r.Post("/pengaduan", a.createPublicComplaint)

			r.Post("/mandiri/auth/masuk", a.login)
			r.Post("/mandiri/auth/refresh", a.refresh)
			r.Post("/admin/auth/masuk", a.adminLogin)
			r.Post("/admin/auth/refresh", a.adminRefresh)

			r.Group(func(r chi.Router) {
				r.Use(a.noStore)
				r.Use(a.requireAuth)
				r.Use(a.requireCSRF)

				r.Get("/mandiri/me", a.me)
				r.Post("/mandiri/auth/keluar", a.logout)
				r.Get("/mandiri/surat/templates", a.suratTemplates)
				r.Get("/mandiri/surat/permohonan", a.suratPermohonan)
				r.Post("/mandiri/surat/permohonan", a.createPermohonanSurat)
				r.Post("/mandiri/surat/permohonan/{id}/batal", a.cancelPermohonanSurat)
				r.Get("/mandiri/surat/arsip", a.suratArsip)
			})

			r.Group(func(r chi.Router) {
				r.Use(a.noStore)
				r.Use(a.requireAdminAuth)
				r.Use(a.requireAdminCSRF)

				r.Get("/admin/me", a.adminMe)
				r.Post("/admin/auth/keluar", a.adminLogout)
				r.Get("/admin/dtks", a.adminDTKSList)
				r.Post("/admin/dtks/seed-dummy", a.adminDTKSSeedDummy)
				r.Get("/admin/dtks/{id}", a.adminDTKSDetail)
				r.Post("/admin/dtks/{id}/status", a.adminDTKSUpdateStatus)
			})
		})
	})

	return r
}
