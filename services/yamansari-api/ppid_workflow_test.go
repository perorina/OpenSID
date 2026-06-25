package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestPPIDWorkflowRules(t *testing.T) {
	start := time.Date(2026, 6, 26, 10, 0, 0, 0, time.Local) // Friday
	if got := addWorkingDays(start, 1).Weekday(); got != time.Monday {
		t.Fatalf("working day deadline landed on %s, want Monday", got)
	}
	if !validRequestTransition("submitted", "verified") || validRequestTransition("submitted", "fulfilled") {
		t.Fatal("request status transition rules are wrong")
	}
	if !validObjectionTransition("review", "accepted") || validObjectionTransition("submitted", "resolved") {
		t.Fatal("objection status transition rules are wrong")
	}
}

func TestValidateInformationRequest(t *testing.T) {
	payload := &struct {
		ApplicantName        string `json:"applicantName"`
		IdentityType         string `json:"identityType"`
		IdentityNumber       string `json:"identityNumber"`
		Email                string `json:"email"`
		Phone                string `json:"phone"`
		Address              string `json:"address"`
		InformationRequested string `json:"informationRequested"`
		Purpose              string `json:"purpose"`
		DeliveryMethod       string `json:"deliveryMethod"`
	}{
		ApplicantName:        "Sari",
		IdentityType:         "nik",
		IdentityNumber:       "3328062506260001",
		Phone:                "0812-2606-1122",
		Address:              "Yamansari",
		InformationRequested: "Salinan ringkasan APBDes",
		Purpose:              "Kontrol sosial warga",
		DeliveryMethod:       "digital",
	}
	if err := validateInformationRequest(payload); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}
	payload.IdentityNumber = "123"
	if err := validateInformationRequest(payload); err == nil {
		t.Fatal("invalid NIK was accepted")
	}
}

func TestPPIDWorkflowIntegration(t *testing.T) {
	dsn := os.Getenv("YMS_PPID_INTEGRATION_DSN")
	if dsn == "" {
		t.Skip("set YMS_PPID_INTEGRATION_DSN to run PPID workflow integration tests")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	db, err := openDB(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := ensureSchema(ctx, db); err != nil {
		t.Fatal(err)
	}
	repoRoot, _ := filepath.Abs(filepath.Join("..", ".."))
	app := &App{
		cfg: Config{
			ConfigID: 1, OpenSIDBaseURL: "http://127.0.0.1:8081",
			OpenSIDDocumentDir: filepath.Join(repoRoot, "desa", "upload", "dokumen"),
			PPIDSamplePDFDir:   filepath.Join(repoRoot, "output", "pdf", "ppid"),
			DIPSamplePDFDir:    filepath.Join(repoRoot, "output", "pdf", "ppid", "dip"),
			SampleDataEnabled:  true,
		},
		db: db, schema: NewSchemaCache(db), cache: NewTTLCache(), publicLimiter: NewWindowLimiter(8, time.Minute),
	}
	if _, err := app.seedDIPSample(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := app.seedPPIDWorkflow(ctx); err != nil {
		t.Fatal(err)
	}
	requests, err := app.loadPPIDRequests(ctx, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(requests) < 3 {
		t.Fatalf("workflow seed requests = %d, want at least 3", len(requests))
	}
	report, err := app.buildPPIDReport(ctx, time.Now().Year())
	if err != nil {
		t.Fatal(err)
	}
	if report.RequestsTotal < 3 || report.DIPPublished < 15 || report.Emergencies < 1 {
		t.Fatalf("workflow report is incomplete: %#v", report)
	}
	emergencies, err := app.loadEmergencyRecords(ctx, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(emergencies) < 2 {
		t.Fatalf("emergency sample count = %d, want at least 2", len(emergencies))
	}
}
