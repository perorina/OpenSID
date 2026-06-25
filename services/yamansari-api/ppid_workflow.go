package main

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
)

const (
	requestResponseDays   = 10
	requestExtensionDays  = 7
	objectionResponseDays = 30
)

type WindowLimiter struct {
	mu     sync.Mutex
	max    int
	window time.Duration
	hits   map[string][]time.Time
}

func NewWindowLimiter(max int, window time.Duration) *WindowLimiter {
	return &WindowLimiter{max: max, window: window, hits: map[string][]time.Time{}}
}

func (l *WindowLimiter) Allow(key string) (bool, time.Duration) {
	if l == nil {
		return true, 0
	}
	now := time.Now()
	cutoff := now.Add(-l.window)
	l.mu.Lock()
	defer l.mu.Unlock()
	items := l.hits[key][:0]
	for _, item := range l.hits[key] {
		if item.After(cutoff) {
			items = append(items, item)
		}
	}
	if len(items) >= l.max {
		l.hits[key] = items
		return false, time.Until(items[0].Add(l.window))
	}
	l.hits[key] = append(items, now)
	return true, 0
}

type PPIDRequest struct {
	ID                   int64  `json:"id"`
	TicketCode           string `json:"ticketCode"`
	ApplicantName        string `json:"applicantName"`
	IdentityType         string `json:"identityType,omitempty"`
	IdentityNumber       string `json:"identityNumber,omitempty"`
	Email                string `json:"email,omitempty"`
	Phone                string `json:"phone"`
	Address              string `json:"address,omitempty"`
	InformationRequested string `json:"informationRequested"`
	Purpose              string `json:"purpose"`
	DeliveryMethod       string `json:"deliveryMethod"`
	Status               string `json:"status"`
	StatusLabel          string `json:"statusLabel"`
	DueAt                string `json:"dueAt"`
	ExtendedDueAt        string `json:"extendedDueAt,omitempty"`
	ResponseSummary      string `json:"responseSummary,omitempty"`
	RejectionReason      string `json:"rejectionReason,omitempty"`
	ResponseDocumentID   int64  `json:"responseDocumentId,omitempty"`
	ResponseDocumentURL  string `json:"responseDocumentUrl,omitempty"`
	CompletedAt          string `json:"completedAt,omitempty"`
	CreatedAt            string `json:"createdAt"`
	UpdatedAt            string `json:"updatedAt"`
	IsSample             bool   `json:"isSample"`
	IsOverdue            bool   `json:"isOverdue"`
}

type PPIDObjection struct {
	ID            int64  `json:"id"`
	RequestID     int64  `json:"requestId,omitempty"`
	RequestTicket string `json:"requestTicket,omitempty"`
	TicketCode    string `json:"ticketCode"`
	ApplicantName string `json:"applicantName"`
	Email         string `json:"email,omitempty"`
	Phone         string `json:"phone"`
	ReasonCode    string `json:"reasonCode"`
	ReasonLabel   string `json:"reasonLabel"`
	Detail        string `json:"detail"`
	Status        string `json:"status"`
	StatusLabel   string `json:"statusLabel"`
	DueAt         string `json:"dueAt"`
	Response      string `json:"response,omitempty"`
	DecidedAt     string `json:"decidedAt,omitempty"`
	CreatedAt     string `json:"createdAt"`
	UpdatedAt     string `json:"updatedAt"`
	IsSample      bool   `json:"isSample"`
	IsOverdue     bool   `json:"isOverdue"`
}

type PPIDAuditEntry struct {
	ID         int64          `json:"id"`
	Actor      string         `json:"actor"`
	EntityType string         `json:"entityType"`
	EntityID   int64          `json:"entityId,omitempty"`
	Action     string         `json:"action"`
	Detail     map[string]any `json:"detail,omitempty"`
	CreatedAt  string         `json:"createdAt"`
}

type PPIDReport struct {
	Year                int            `json:"year"`
	RequestsTotal       int            `json:"requestsTotal"`
	RequestsByStatus    map[string]int `json:"requestsByStatus"`
	ObjectionsTotal     int            `json:"objectionsTotal"`
	ObjectionsByStatus  map[string]int `json:"objectionsByStatus"`
	OverdueRequests     int            `json:"overdueRequests"`
	OverdueObjections   int            `json:"overdueObjections"`
	AverageResponseDays float64        `json:"averageResponseDays"`
	DIPPublished        int            `json:"dipPublished"`
	DIPVersionTotal     int            `json:"dipVersionTotal"`
	Emergencies         int            `json:"emergencies"`
	MonthlyRequests     []int          `json:"monthlyRequests"`
	GeneratedAt         string         `json:"generatedAt"`
}

type AdminPPIDServices struct {
	Requests        []PPIDRequest    `json:"requests"`
	Objections      []PPIDObjection  `json:"objections"`
	Emergencies     []Emergency      `json:"emergencies"`
	Audit           []PPIDAuditEntry `json:"audit"`
	Report          PPIDReport       `json:"report"`
	SLA             map[string]int   `json:"sla"`
	CanEdit         bool             `json:"canEdit"`
	SampleAvailable bool             `json:"sampleAvailable"`
}

func (a *App) createInformationRequest(w http.ResponseWriter, r *http.Request) {
	if !a.allowPPIDPublicAction(w, r, "request") {
		return
	}
	var payload struct {
		ApplicantName        string `json:"applicantName"`
		IdentityType         string `json:"identityType"`
		IdentityNumber       string `json:"identityNumber"`
		Email                string `json:"email"`
		Phone                string `json:"phone"`
		Address              string `json:"address"`
		InformationRequested string `json:"informationRequested"`
		Purpose              string `json:"purpose"`
		DeliveryMethod       string `json:"deliveryMethod"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Data permohonan tidak valid.")
		return
	}
	if err := validateInformationRequest(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_request", err.Error())
		return
	}
	ticket, token, err := newPPIDTracking("PPID")
	if err != nil {
		a.error(w, http.StatusInternalServerError, "tracking_failed", "Nomor registrasi belum bisa dibuat.")
		return
	}
	responseDays := requestResponseDays
	if options, loadErr := a.loadPPIDPamong(r.Context()); loadErr == nil {
		if profile, profileErr := a.loadPPIDProfile(r.Context(), options); profileErr == nil && profile.ResponseDays > 0 {
			responseDays = profile.ResponseDays
		}
	}
	dueAt := addWorkingDays(time.Now(), responseDays)
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "request_failed", "Permohonan belum bisa disimpan.")
		return
	}
	result, err := tx.ExecContext(r.Context(), `INSERT INTO yms_ppid_requests
(config_id, ticket_code, tracking_hash, applicant_name, identity_type, identity_number, email, phone, address, information_requested, purpose, delivery_method, due_at)
VALUES (?, ?, ?, ?, ?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?)`, a.cfg.ConfigID, ticket, hashToken(token), payload.ApplicantName,
		payload.IdentityType, payload.IdentityNumber, payload.Email, payload.Phone, payload.Address, payload.InformationRequested, payload.Purpose, payload.DeliveryMethod, dueAt.Format("2006-01-02"))
	if err != nil {
		_ = tx.Rollback()
		a.error(w, http.StatusInternalServerError, "request_failed", "Permohonan belum bisa disimpan.")
		return
	}
	id, _ := result.LastInsertId()
	if err := auditTx(r.Context(), tx, a.cfg.ConfigID, nil, "Publik", "request", id, "submitted", map[string]any{"ticketCode": ticket}); err != nil {
		_ = tx.Rollback()
		a.error(w, http.StatusInternalServerError, "audit_failed", "Permohonan belum bisa dicatat.")
		return
	}
	if err := tx.Commit(); err != nil {
		a.error(w, http.StatusInternalServerError, "request_failed", "Permohonan belum bisa disimpan.")
		return
	}
	a.ok(w, http.StatusCreated, map[string]any{"ticketCode": ticket, "trackingToken": token, "dueAt": dueAt.Format("2006-01-02"), "status": "submitted"}, responseMeta{"cache": string(CacheNone)})
}

func validateInformationRequest(payload *struct {
	ApplicantName        string `json:"applicantName"`
	IdentityType         string `json:"identityType"`
	IdentityNumber       string `json:"identityNumber"`
	Email                string `json:"email"`
	Phone                string `json:"phone"`
	Address              string `json:"address"`
	InformationRequested string `json:"informationRequested"`
	Purpose              string `json:"purpose"`
	DeliveryMethod       string `json:"deliveryMethod"`
}) error {
	payload.ApplicantName = trimTo(payload.ApplicantName, 120)
	payload.IdentityType = strings.ToLower(trimTo(payload.IdentityType, 24))
	payload.IdentityNumber = trimTo(strings.TrimSpace(payload.IdentityNumber), 64)
	payload.Email = strings.ToLower(trimTo(payload.Email, 190))
	payload.Phone = trimTo(onlyDigits(payload.Phone), 20)
	payload.Address = trimTo(payload.Address, 500)
	payload.InformationRequested = trimTo(payload.InformationRequested, 5000)
	payload.Purpose = trimTo(payload.Purpose, 2000)
	payload.DeliveryMethod = strings.ToLower(trimTo(payload.DeliveryMethod, 24))
	if payload.ApplicantName == "" || payload.IdentityNumber == "" || payload.Phone == "" || payload.Address == "" || payload.InformationRequested == "" || payload.Purpose == "" {
		return errors.New("identitas, kontak, alamat, informasi yang diminta, dan tujuan wajib diisi")
	}
	if payload.IdentityType != "nik" && payload.IdentityType != "passport" && payload.IdentityType != "other" {
		return errors.New("jenis identitas tidak valid")
	}
	if payload.IdentityType == "nik" && (len(payload.IdentityNumber) != 16 || onlyDigits(payload.IdentityNumber) != payload.IdentityNumber) {
		return errors.New("NIK harus terdiri dari 16 digit")
	}
	if len(payload.Phone) < 8 {
		return errors.New("nomor telepon tidak valid")
	}
	if payload.Email != "" {
		address, err := mail.ParseAddress(payload.Email)
		if err != nil || !strings.EqualFold(address.Address, payload.Email) {
			return errors.New("format email tidak valid")
		}
	}
	if payload.DeliveryMethod != "email" && payload.DeliveryMethod != "pickup" && payload.DeliveryMethod != "digital" {
		return errors.New("cara penyerahan informasi tidak valid")
	}
	if payload.DeliveryMethod == "email" && payload.Email == "" {
		return errors.New("email wajib diisi untuk penyerahan melalui email")
	}
	return nil
}

func (a *App) trackInformationRequest(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TicketCode    string `json:"ticketCode"`
		TrackingToken string `json:"trackingToken"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Data pelacakan tidak valid.")
		return
	}
	payload.TicketCode = strings.ToUpper(trimTo(payload.TicketCode, 32))
	payload.TrackingToken = trimTo(payload.TrackingToken, 128)
	request, err := a.loadPPIDRequestByTracking(r.Context(), payload.TicketCode, payload.TrackingToken)
	if err != nil {
		a.error(w, http.StatusNotFound, "tracking_not_found", "Nomor registrasi atau token pelacakan tidak sesuai.")
		return
	}
	objections, _ := a.loadObjectionsForRequest(r.Context(), request.ID, false)
	request.IdentityNumber = ""
	request.Address = ""
	a.ok(w, http.StatusOK, map[string]any{"request": request, "objections": objections}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) createInformationObjection(w http.ResponseWriter, r *http.Request) {
	if !a.allowPPIDPublicAction(w, r, "objection") {
		return
	}
	var payload struct {
		RequestTicket string `json:"requestTicket"`
		RequestToken  string `json:"requestToken"`
		ApplicantName string `json:"applicantName"`
		Email         string `json:"email"`
		Phone         string `json:"phone"`
		ReasonCode    string `json:"reasonCode"`
		Detail        string `json:"detail"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Data keberatan tidak valid.")
		return
	}
	payload.RequestTicket = strings.ToUpper(trimTo(payload.RequestTicket, 32))
	payload.RequestToken = trimTo(payload.RequestToken, 128)
	payload.ApplicantName = trimTo(payload.ApplicantName, 120)
	payload.Email = strings.ToLower(trimTo(payload.Email, 190))
	payload.Phone = trimTo(onlyDigits(payload.Phone), 20)
	payload.ReasonCode = strings.ToLower(trimTo(payload.ReasonCode, 40))
	payload.Detail = trimTo(payload.Detail, 5000)
	if !validObjectionReason(payload.ReasonCode) || payload.Detail == "" {
		a.error(w, http.StatusBadRequest, "invalid_objection", "Alasan dan uraian keberatan wajib diisi.")
		return
	}
	var requestID int64
	if payload.RequestTicket != "" || payload.RequestToken != "" {
		request, err := a.loadPPIDRequestByTracking(r.Context(), payload.RequestTicket, payload.RequestToken)
		if err != nil {
			a.error(w, http.StatusNotFound, "request_not_found", "Permohonan asal tidak ditemukan.")
			return
		}
		requestID = request.ID
		payload.ApplicantName = request.ApplicantName
		payload.Email = request.Email
		payload.Phone = request.Phone
	}
	if payload.ApplicantName == "" || len(payload.Phone) < 8 {
		a.error(w, http.StatusBadRequest, "missing_contact", "Nama dan nomor telepon wajib diisi.")
		return
	}
	if payload.Email != "" {
		if _, err := mail.ParseAddress(payload.Email); err != nil {
			a.error(w, http.StatusBadRequest, "invalid_email", "Format email tidak valid.")
			return
		}
	}
	ticket, token, err := newPPIDTracking("KBR")
	if err != nil {
		a.error(w, http.StatusInternalServerError, "tracking_failed", "Nomor keberatan belum bisa dibuat.")
		return
	}
	dueAt := addWorkingDays(time.Now(), objectionResponseDays)
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "objection_failed", "Keberatan belum bisa disimpan.")
		return
	}
	result, err := tx.ExecContext(r.Context(), `INSERT INTO yms_ppid_objections
(config_id, request_id, ticket_code, tracking_hash, applicant_name, email, phone, reason_code, detail, due_at)
VALUES (?, NULLIF(?, 0), ?, ?, ?, NULLIF(?, ''), ?, ?, ?, ?)`, a.cfg.ConfigID, requestID, ticket, hashToken(token), payload.ApplicantName, payload.Email, payload.Phone, payload.ReasonCode, payload.Detail, dueAt.Format("2006-01-02"))
	if err != nil {
		_ = tx.Rollback()
		a.error(w, http.StatusInternalServerError, "objection_failed", "Keberatan belum bisa disimpan.")
		return
	}
	id, _ := result.LastInsertId()
	if err := auditTx(r.Context(), tx, a.cfg.ConfigID, nil, "Publik", "objection", id, "submitted", map[string]any{"ticketCode": ticket, "requestId": requestID}); err != nil {
		_ = tx.Rollback()
		a.error(w, http.StatusInternalServerError, "audit_failed", "Keberatan belum bisa dicatat.")
		return
	}
	if err := tx.Commit(); err != nil {
		a.error(w, http.StatusInternalServerError, "objection_failed", "Keberatan belum bisa disimpan.")
		return
	}
	a.ok(w, http.StatusCreated, map[string]any{"ticketCode": ticket, "trackingToken": token, "dueAt": dueAt.Format("2006-01-02"), "status": "submitted"}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) trackInformationObjection(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		TicketCode    string `json:"ticketCode"`
		TrackingToken string `json:"trackingToken"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Data pelacakan tidak valid.")
		return
	}
	item, err := a.loadPPIDObjectionByTracking(r.Context(), strings.ToUpper(trimTo(payload.TicketCode, 32)), trimTo(payload.TrackingToken, 128))
	if err != nil {
		a.error(w, http.StatusNotFound, "tracking_not_found", "Nomor keberatan atau token pelacakan tidak sesuai.")
		return
	}
	a.ok(w, http.StatusOK, item, responseMeta{"cache": string(CacheNone)})
}

func (a *App) publicPPIDReport(w http.ResponseWriter, r *http.Request) {
	year := reportYear(r)
	report, err := a.buildPPIDReport(r.Context(), year)
	if err != nil {
		a.error(w, http.StatusServiceUnavailable, "report_unavailable", "Laporan PPID belum bisa dimuat.")
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=300, stale-while-revalidate=300")
	a.ok(w, http.StatusOK, report, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminPPIDServices(w http.ResponseWriter, r *http.Request) {
	access, err := a.ppidAccessLevel(r.Context(), adminUserFromContext(r.Context()))
	if err != nil || access < 1 {
		a.error(w, http.StatusForbidden, "ppid_forbidden", "Akun ini tidak memiliki akses PPID.")
		return
	}
	requests, err := a.loadPPIDRequests(r.Context(), 100)
	if err != nil {
		a.error(w, 500, "requests_failed", "Register permohonan belum bisa dimuat.")
		return
	}
	objections, err := a.loadPPIDObjections(r.Context(), 100)
	if err != nil {
		a.error(w, 500, "objections_failed", "Register keberatan belum bisa dimuat.")
		return
	}
	emergencies, err := a.loadEmergencyRecords(r.Context(), false)
	if err != nil {
		a.error(w, 500, "emergencies_failed", "Informasi darurat belum bisa dimuat.")
		return
	}
	audit, err := a.loadPPIDAudit(r.Context(), 80)
	if err != nil {
		a.error(w, 500, "audit_failed", "Audit PPID belum bisa dimuat.")
		return
	}
	report, err := a.buildPPIDReport(r.Context(), time.Now().Year())
	if err != nil {
		a.error(w, 500, "report_failed", "Laporan PPID belum bisa dimuat.")
		return
	}
	sla := map[string]int{"requestsOverdue": report.OverdueRequests, "objectionsOverdue": report.OverdueObjections, "dueSoon": countDueSoon(requests, objections)}
	a.ok(w, http.StatusOK, AdminPPIDServices{Requests: requests, Objections: objections, Emergencies: emergencies, Audit: audit, Report: report, SLA: sla, CanEdit: access >= 3, SampleAvailable: a.cfg.SampleDataEnabled}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminUpdatePPIDRequest(w http.ResponseWriter, r *http.Request) {
	if !a.requirePPIDEdit(w, r) {
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		a.error(w, 404, "request_not_found", "Permohonan tidak ditemukan.")
		return
	}
	var payload struct {
		Status             string `json:"status"`
		ResponseSummary    string `json:"responseSummary"`
		RejectionReason    string `json:"rejectionReason"`
		ResponseDocumentID int64  `json:"responseDocumentId"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(&payload); err != nil {
		a.error(w, 400, "invalid_json", "Perubahan permohonan tidak valid.")
		return
	}
	payload.Status = strings.ToLower(trimTo(payload.Status, 24))
	payload.ResponseSummary = trimTo(payload.ResponseSummary, 5000)
	payload.RejectionReason = trimTo(payload.RejectionReason, 5000)
	current, err := a.loadPPIDRequestByID(r.Context(), id)
	if err != nil {
		a.error(w, 404, "request_not_found", "Permohonan tidak ditemukan.")
		return
	}
	if !validRequestTransition(current.Status, payload.Status) {
		a.error(w, 409, "invalid_transition", "Perubahan status permohonan tidak diizinkan.")
		return
	}
	if payload.Status == "fulfilled" && payload.ResponseSummary == "" {
		a.error(w, 400, "missing_response", "Ringkasan jawaban wajib diisi.")
		return
	}
	if payload.Status == "rejected" && payload.RejectionReason == "" {
		a.error(w, 400, "missing_rejection", "Alasan penolakan wajib diisi.")
		return
	}
	if payload.ResponseDocumentID > 0 {
		if _, err := a.eligibleDIPDocument(r.Context(), payload.ResponseDocumentID, true); err != nil {
			a.error(w, 400, "invalid_document", "Dokumen jawaban harus tersedia di DIP publik.")
			return
		}
	}
	extended := current.ExtendedDueAt
	if payload.Status == "extended" && extended == "" {
		extended = addWorkingDays(parseDate(current.DueAt), requestExtensionDays).Format("2006-01-02")
	}
	completed := ""
	if payload.Status == "fulfilled" || payload.Status == "rejected" || payload.Status == "closed" {
		completed = time.Now().Format("2006-01-02 15:04:05")
	}
	user := adminUserFromContext(r.Context())
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		a.error(w, 500, "update_failed", "Permohonan belum bisa diperbarui.")
		return
	}
	_, err = tx.ExecContext(r.Context(), `UPDATE yms_ppid_requests SET status=?, response_summary=NULLIF(?, ''), rejection_reason=NULLIF(?, ''), response_document_id=NULLIF(?, 0), extended_due_at=NULLIF(?, ''), completed_at=NULLIF(?, ''), updated_at=NOW() WHERE config_id=? AND id=?`, payload.Status, payload.ResponseSummary, payload.RejectionReason, payload.ResponseDocumentID, extended, completed, a.cfg.ConfigID, id)
	if err == nil {
		err = auditTx(r.Context(), tx, a.cfg.ConfigID, user, user.Nama, "request", id, "status_changed", map[string]any{"from": current.Status, "to": payload.Status})
	}
	if err != nil {
		_ = tx.Rollback()
		a.error(w, 500, "update_failed", "Permohonan belum bisa diperbarui.")
		return
	}
	if err := tx.Commit(); err != nil {
		a.error(w, 500, "update_failed", "Permohonan belum bisa diperbarui.")
		return
	}
	updated, _ := a.loadPPIDRequestByID(r.Context(), id)
	a.ok(w, 200, updated, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminUpdatePPIDObjection(w http.ResponseWriter, r *http.Request) {
	if !a.requirePPIDEdit(w, r) {
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		a.error(w, 404, "objection_not_found", "Keberatan tidak ditemukan.")
		return
	}
	var payload struct {
		Status   string `json:"status"`
		Response string `json:"response"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(&payload); err != nil {
		a.error(w, 400, "invalid_json", "Perubahan keberatan tidak valid.")
		return
	}
	payload.Status = strings.ToLower(trimTo(payload.Status, 24))
	payload.Response = trimTo(payload.Response, 5000)
	current, err := a.loadPPIDObjectionByID(r.Context(), id)
	if err != nil {
		a.error(w, 404, "objection_not_found", "Keberatan tidak ditemukan.")
		return
	}
	if !validObjectionTransition(current.Status, payload.Status) {
		a.error(w, 409, "invalid_transition", "Perubahan status keberatan tidak diizinkan.")
		return
	}
	if (payload.Status == "accepted" || payload.Status == "rejected" || payload.Status == "resolved") && payload.Response == "" {
		a.error(w, 400, "missing_response", "Tanggapan Atasan PPID wajib diisi.")
		return
	}
	decided := ""
	if payload.Status == "accepted" || payload.Status == "rejected" || payload.Status == "resolved" {
		decided = time.Now().Format("2006-01-02 15:04:05")
	}
	user := adminUserFromContext(r.Context())
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		a.error(w, 500, "update_failed", "Keberatan belum bisa diperbarui.")
		return
	}
	_, err = tx.ExecContext(r.Context(), `UPDATE yms_ppid_objections SET status=?, response=NULLIF(?, ''), decided_at=NULLIF(?, ''), updated_at=NOW() WHERE config_id=? AND id=?`, payload.Status, payload.Response, decided, a.cfg.ConfigID, id)
	if err == nil {
		err = auditTx(r.Context(), tx, a.cfg.ConfigID, user, user.Nama, "objection", id, "status_changed", map[string]any{"from": current.Status, "to": payload.Status})
	}
	if err != nil {
		_ = tx.Rollback()
		a.error(w, 500, "update_failed", "Keberatan belum bisa diperbarui.")
		return
	}
	if err := tx.Commit(); err != nil {
		a.error(w, 500, "update_failed", "Keberatan belum bisa diperbarui.")
		return
	}
	updated, _ := a.loadPPIDObjectionByID(r.Context(), id)
	a.ok(w, 200, updated, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminPPIDReportCSV(w http.ResponseWriter, r *http.Request) {
	access, err := a.ppidAccessLevel(r.Context(), adminUserFromContext(r.Context()))
	if err != nil || access < 1 {
		a.error(w, 403, "ppid_forbidden", "Akun ini tidak memiliki akses PPID.")
		return
	}
	report, err := a.buildPPIDReport(r.Context(), reportYear(r))
	if err != nil {
		a.error(w, 500, "report_failed", "Laporan belum bisa dibuat.")
		return
	}
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=laporan-ppid-%d.csv", report.Year))
	w.WriteHeader(200)
	writer := csv.NewWriter(w)
	_ = writer.Write([]string{"Metrik", "Nilai"})
	_ = writer.Write([]string{"Tahun", strconv.Itoa(report.Year)})
	_ = writer.Write([]string{"Permohonan", strconv.Itoa(report.RequestsTotal)})
	_ = writer.Write([]string{"Keberatan", strconv.Itoa(report.ObjectionsTotal)})
	_ = writer.Write([]string{"Permohonan lewat tenggat", strconv.Itoa(report.OverdueRequests)})
	_ = writer.Write([]string{"Keberatan lewat tenggat", strconv.Itoa(report.OverdueObjections)})
	_ = writer.Write([]string{"Rata-rata hari penyelesaian", fmt.Sprintf("%.1f", report.AverageResponseDays)})
	_ = writer.Write([]string{"DIP terbit", strconv.Itoa(report.DIPPublished)})
	writer.Flush()
}

func (a *App) adminSeedPPIDWorkflow(w http.ResponseWriter, r *http.Request) {
	if !a.cfg.SampleDataEnabled {
		a.error(w, 404, "sample_disabled", "Data contoh tidak aktif.")
		return
	}
	if !a.requirePPIDEdit(w, r) {
		return
	}
	result, err := a.seedPPIDWorkflow(r.Context())
	if err != nil {
		a.error(w, 500, "seed_failed", "Data contoh layanan PPID belum bisa dibuat: "+err.Error())
		return
	}
	a.ok(w, 200, result, responseMeta{"cache": string(CacheNone)})
}

func (a *App) seedPPIDWorkflow(ctx context.Context) (map[string]any, error) {
	due := addWorkingDays(time.Now(), requestResponseDays).Format("2006-01-02")
	requests := []struct{ ticket, status, info, token string }{{"PPID-CONTOH-0001", "submitted", "Data contoh daftar kegiatan pembangunan tahun berjalan.", "CONTOH-TRACK-0001"}, {"PPID-CONTOH-0002", "processing", "Data contoh ringkasan realisasi APBDes semester pertama.", "CONTOH-TRACK-0002"}, {"PPID-CONTOH-0003", "fulfilled", "Data contoh profil dan struktur pemerintah desa.", "CONTOH-TRACK-0003"}}
	for _, item := range requests {
		completed := any(nil)
		if item.status == "fulfilled" {
			completed = time.Now()
		}
		_, err := a.db.ExecContext(ctx, `INSERT INTO yms_ppid_requests
(config_id,ticket_code,tracking_hash,applicant_name,identity_type,identity_number,email,phone,address,information_requested,purpose,delivery_method,status,due_at,response_summary,completed_at,is_sample)
VALUES (?, ?, ?, 'Pemohon Contoh', 'nik', '0000000000000000', 'contoh@example.invalid', '081200000000', 'Alamat contoh - bukan data warga', ?, 'Pengujian alur layanan', 'digital', ?, ?, ?, ?, 1)
ON DUPLICATE KEY UPDATE status=VALUES(status), information_requested=VALUES(information_requested), due_at=VALUES(due_at), response_summary=VALUES(response_summary), completed_at=VALUES(completed_at), is_sample=1`, a.cfg.ConfigID, item.ticket, hashToken(item.token), item.info, item.status, due, nullableString(map[bool]string{true: "Informasi contoh telah tersedia."}[item.status == "fulfilled"]), completed)
		if err != nil {
			return nil, err
		}
	}
	var requestID int64
	if err := a.db.QueryRowContext(ctx, `SELECT id FROM yms_ppid_requests WHERE config_id=? AND ticket_code='PPID-CONTOH-0002'`, a.cfg.ConfigID).Scan(&requestID); err != nil {
		return nil, err
	}
	_, err := a.db.ExecContext(ctx, `INSERT INTO yms_ppid_objections
(config_id,request_id,ticket_code,tracking_hash,applicant_name,email,phone,reason_code,detail,status,due_at,is_sample)
VALUES (?, ?, 'KBR-CONTOH-0001', ?, 'Pemohon Contoh', 'contoh@example.invalid', '081200000000', 'late_response', 'Contoh keberatan karena jawaban belum diterima.', 'review', ?, 1)
ON DUPLICATE KEY UPDATE request_id=VALUES(request_id), status='review', due_at=VALUES(due_at), is_sample=1`, a.cfg.ConfigID, requestID, hashToken("CONTOH-KBR-TRACK-0001"), addWorkingDays(time.Now(), objectionResponseDays).Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	emergencyResult, err := a.seedEmergencySample(ctx)
	if err != nil {
		return nil, err
	}
	return map[string]any{"requests": len(requests), "objections": 1, "emergencies": emergencyResult}, nil
}

func (a *App) loadPPIDRequests(ctx context.Context, limit int) ([]PPIDRequest, error) {
	rows, err := a.db.QueryContext(ctx, `SELECT id,ticket_code,applicant_name,identity_type,identity_number,IFNULL(email,''),phone,address,information_requested,purpose,delivery_method,status,CAST(due_at AS CHAR),IFNULL(CAST(extended_due_at AS CHAR),''),IFNULL(response_summary,''),IFNULL(rejection_reason,''),IFNULL(response_document_id,0),IFNULL(CAST(completed_at AS CHAR),''),CAST(created_at AS CHAR),CAST(updated_at AS CHAR),is_sample FROM yms_ppid_requests WHERE config_id=? ORDER BY created_at DESC,id DESC LIMIT ?`, a.cfg.ConfigID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []PPIDRequest{}
	for rows.Next() {
		var item PPIDRequest
		var sample int
		if err := rows.Scan(&item.ID, &item.TicketCode, &item.ApplicantName, &item.IdentityType, &item.IdentityNumber, &item.Email, &item.Phone, &item.Address, &item.InformationRequested, &item.Purpose, &item.DeliveryMethod, &item.Status, &item.DueAt, &item.ExtendedDueAt, &item.ResponseSummary, &item.RejectionReason, &item.ResponseDocumentID, &item.CompletedAt, &item.CreatedAt, &item.UpdatedAt, &sample); err != nil {
			return nil, err
		}
		decoratePPIDRequest(&item, sample)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (a *App) loadPPIDRequestByID(ctx context.Context, id int64) (PPIDRequest, error) {
	items, err := a.loadPPIDRequests(ctx, 500)
	if err != nil {
		return PPIDRequest{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return PPIDRequest{}, sql.ErrNoRows
}

func (a *App) loadPPIDRequestByTracking(ctx context.Context, ticket, token string) (PPIDRequest, error) {
	if ticket == "" || token == "" {
		return PPIDRequest{}, sql.ErrNoRows
	}
	var id int64
	if err := a.db.QueryRowContext(ctx, `SELECT id FROM yms_ppid_requests WHERE config_id=? AND ticket_code=? AND tracking_hash=? LIMIT 1`, a.cfg.ConfigID, ticket, hashToken(token)).Scan(&id); err != nil {
		return PPIDRequest{}, err
	}
	return a.loadPPIDRequestByID(ctx, id)
}

func decoratePPIDRequest(item *PPIDRequest, sample int) {
	item.StatusLabel = requestStatusLabel(item.Status)
	item.IsSample = sample == 1
	deadline := item.DueAt
	if item.ExtendedDueAt != "" {
		deadline = item.ExtendedDueAt
	}
	item.IsOverdue = (item.Status != "fulfilled" && item.Status != "rejected" && item.Status != "closed" && parseDate(deadline).Before(today()))
	if item.ResponseDocumentID > 0 {
		item.ResponseDocumentURL = fmt.Sprintf("/dokumen/%d", item.ResponseDocumentID)
	}
}

func (a *App) loadPPIDObjections(ctx context.Context, limit int) ([]PPIDObjection, error) {
	rows, err := a.db.QueryContext(ctx, `SELECT o.id,IFNULL(o.request_id,0),IFNULL(r.ticket_code,''),o.ticket_code,o.applicant_name,IFNULL(o.email,''),o.phone,o.reason_code,o.detail,o.status,CAST(o.due_at AS CHAR),IFNULL(o.response,''),IFNULL(CAST(o.decided_at AS CHAR),''),CAST(o.created_at AS CHAR),CAST(o.updated_at AS CHAR),o.is_sample FROM yms_ppid_objections o LEFT JOIN yms_ppid_requests r ON r.id=o.request_id AND r.config_id=o.config_id WHERE o.config_id=? ORDER BY o.created_at DESC,o.id DESC LIMIT ?`, a.cfg.ConfigID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []PPIDObjection{}
	for rows.Next() {
		var item PPIDObjection
		var sample int
		if err := rows.Scan(&item.ID, &item.RequestID, &item.RequestTicket, &item.TicketCode, &item.ApplicantName, &item.Email, &item.Phone, &item.ReasonCode, &item.Detail, &item.Status, &item.DueAt, &item.Response, &item.DecidedAt, &item.CreatedAt, &item.UpdatedAt, &sample); err != nil {
			return nil, err
		}
		decoratePPIDObjection(&item, sample)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (a *App) loadPPIDObjectionByID(ctx context.Context, id int64) (PPIDObjection, error) {
	items, err := a.loadPPIDObjections(ctx, 500)
	if err != nil {
		return PPIDObjection{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return PPIDObjection{}, sql.ErrNoRows
}

func (a *App) loadPPIDObjectionByTracking(ctx context.Context, ticket, token string) (PPIDObjection, error) {
	if ticket == "" || token == "" {
		return PPIDObjection{}, sql.ErrNoRows
	}
	var id int64
	if err := a.db.QueryRowContext(ctx, `SELECT id FROM yms_ppid_objections WHERE config_id=? AND ticket_code=? AND tracking_hash=? LIMIT 1`, a.cfg.ConfigID, ticket, hashToken(token)).Scan(&id); err != nil {
		return PPIDObjection{}, err
	}
	return a.loadPPIDObjectionByID(ctx, id)
}

func (a *App) loadObjectionsForRequest(ctx context.Context, requestID int64, admin bool) ([]PPIDObjection, error) {
	items, err := a.loadPPIDObjections(ctx, 500)
	if err != nil {
		return nil, err
	}
	out := []PPIDObjection{}
	for _, item := range items {
		if item.RequestID == requestID {
			if !admin {
				item.Email = ""
				item.Phone = ""
			}
			out = append(out, item)
		}
	}
	return out, nil
}

func decoratePPIDObjection(item *PPIDObjection, sample int) {
	item.StatusLabel = objectionStatusLabel(item.Status)
	item.ReasonLabel = objectionReasonLabel(item.ReasonCode)
	item.IsSample = sample == 1
	item.IsOverdue = item.Status != "accepted" && item.Status != "rejected" && item.Status != "resolved" && parseDate(item.DueAt).Before(today())
}

func (a *App) buildPPIDReport(ctx context.Context, year int) (PPIDReport, error) {
	report := PPIDReport{Year: year, RequestsByStatus: map[string]int{}, ObjectionsByStatus: map[string]int{}, MonthlyRequests: make([]int, 12), GeneratedAt: time.Now().Format(time.RFC3339)}
	rows, err := a.db.QueryContext(ctx, `SELECT status,COUNT(*) FROM yms_ppid_requests WHERE config_id=? AND YEAR(created_at)=? GROUP BY status`, a.cfg.ConfigID, year)
	if err != nil {
		return report, err
	}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			rows.Close()
			return report, err
		}
		report.RequestsByStatus[status] = count
		report.RequestsTotal += count
	}
	rows.Close()
	_ = a.db.QueryRowContext(ctx, `SELECT IFNULL(AVG(DATEDIFF(completed_at,created_at)),0) FROM yms_ppid_requests WHERE config_id=? AND YEAR(created_at)=? AND completed_at IS NOT NULL`, a.cfg.ConfigID, year).Scan(&report.AverageResponseDays)
	rows, err = a.db.QueryContext(ctx, `SELECT status,COUNT(*) FROM yms_ppid_objections WHERE config_id=? AND YEAR(created_at)=? GROUP BY status`, a.cfg.ConfigID, year)
	if err != nil {
		return report, err
	}
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			rows.Close()
			return report, err
		}
		report.ObjectionsByStatus[status] = count
		report.ObjectionsTotal += count
	}
	rows.Close()
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM yms_ppid_requests WHERE config_id=? AND status NOT IN ('fulfilled','rejected','closed') AND COALESCE(extended_due_at,due_at)<CURDATE()`, a.cfg.ConfigID).Scan(&report.OverdueRequests)
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM yms_ppid_objections WHERE config_id=? AND status NOT IN ('accepted','rejected','resolved') AND due_at<CURDATE()`, a.cfg.ConfigID).Scan(&report.OverdueObjections)
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*),IFNULL(SUM(version_no),0) FROM yms_dip_metadata WHERE config_id=? AND is_listed=1`, a.cfg.ConfigID).Scan(&report.DIPPublished, &report.DIPVersionTotal)
	_ = a.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM yms_emergencies WHERE config_id=? AND YEAR(occurred_at)=? AND status IN ('published','resolved')`, a.cfg.ConfigID, year).Scan(&report.Emergencies)
	rows, err = a.db.QueryContext(ctx, `SELECT MONTH(created_at),COUNT(*) FROM yms_ppid_requests WHERE config_id=? AND YEAR(created_at)=? GROUP BY MONTH(created_at)`, a.cfg.ConfigID, year)
	if err == nil {
		for rows.Next() {
			var month, count int
			_ = rows.Scan(&month, &count)
			if month >= 1 && month <= 12 {
				report.MonthlyRequests[month-1] = count
			}
		}
		rows.Close()
	}
	return report, nil
}

func (a *App) loadPPIDAudit(ctx context.Context, limit int) ([]PPIDAuditEntry, error) {
	rows, err := a.db.QueryContext(ctx, `SELECT id,actor,entity_type,IFNULL(entity_id,0),action,IFNULL(detail_json,''),CAST(created_at AS CHAR) FROM yms_ppid_audit_logs WHERE config_id=? ORDER BY created_at DESC,id DESC LIMIT ?`, a.cfg.ConfigID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []PPIDAuditEntry{}
	for rows.Next() {
		var item PPIDAuditEntry
		var detail string
		if err := rows.Scan(&item.ID, &item.Actor, &item.EntityType, &item.EntityID, &item.Action, &detail, &item.CreatedAt); err != nil {
			return nil, err
		}
		if detail != "" {
			_ = json.Unmarshal([]byte(detail), &item.Detail)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func auditTx(ctx context.Context, tx *sql.Tx, configID int64, user *AdminUser, actor, entityType string, entityID int64, action string, detail map[string]any) error {
	var idUser any
	if user != nil {
		idUser = user.ID
	}
	raw, _ := json.Marshal(detail)
	_, err := tx.ExecContext(ctx, `INSERT INTO yms_ppid_audit_logs(config_id,id_user,actor,entity_type,entity_id,action,detail_json) VALUES (?, ?, ?, ?, NULLIF(?,0), ?, NULLIF(?,''))`, configID, idUser, trimTo(actor, 120), entityType, entityID, action, string(raw))
	return err
}

func (a *App) auditLog(ctx context.Context, user *AdminUser, actor, entityType string, entityID int64, action string, detail map[string]any) error {
	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := auditTx(ctx, tx, a.cfg.ConfigID, user, actor, entityType, entityID, action, detail); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

func (a *App) allowPPIDPublicAction(w http.ResponseWriter, r *http.Request, kind string) bool {
	ok, retry := a.publicLimiter.Allow(kind + ":" + clientIP(r))
	if ok {
		return true
	}
	w.Header().Set("Retry-After", strconv.Itoa(max(1, int(retry.Seconds()))))
	a.error(w, 429, "rate_limited", "Terlalu banyak permintaan. Coba kembali beberapa menit lagi.")
	return false
}

func newPPIDTracking(prefix string) (string, string, error) {
	token, err := randomToken(24)
	if err != nil {
		return "", "", err
	}
	suffix, err := randomHex(3)
	if err != nil {
		return "", "", err
	}
	return fmt.Sprintf("%s-%s-%s", prefix, time.Now().Format("20060102"), strings.ToUpper(suffix)), token, nil
}

func addWorkingDays(start time.Time, days int) time.Time {
	date := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, start.Location())
	for days > 0 {
		date = date.AddDate(0, 0, 1)
		if date.Weekday() != time.Saturday && date.Weekday() != time.Sunday {
			days--
		}
	}
	return date
}
func parseDate(value string) time.Time {
	date, _ := time.ParseInLocation("2006-01-02", strings.Split(value, " ")[0], time.Local)
	return date
}
func today() time.Time {
	now := time.Now()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
}
func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}
func reportYear(r *http.Request) int {
	year, _ := strconv.Atoi(r.URL.Query().Get("year"))
	if year < 2000 || year > time.Now().Year()+1 {
		year = time.Now().Year()
	}
	return year
}

func validRequestTransition(from, to string) bool {
	allowed := map[string][]string{"submitted": {"verified", "rejected"}, "verified": {"processing", "rejected"}, "processing": {"extended", "fulfilled", "rejected"}, "extended": {"fulfilled", "rejected"}, "fulfilled": {"closed"}, "rejected": {"closed"}}
	for _, candidate := range allowed[from] {
		if candidate == to {
			return true
		}
	}
	return false
}
func validObjectionTransition(from, to string) bool {
	allowed := map[string][]string{"submitted": {"review"}, "review": {"accepted", "rejected"}, "accepted": {"resolved"}, "rejected": {"resolved"}}
	for _, candidate := range allowed[from] {
		if candidate == to {
			return true
		}
	}
	return false
}
func validObjectionReason(value string) bool {
	switch value {
	case "request_rejected", "information_unavailable", "late_response", "fee_dispute", "incomplete_response", "periodic_not_published":
		return true
	}
	return false
}
func requestStatusLabel(value string) string {
	return map[string]string{"submitted": "Diterima", "verified": "Terverifikasi", "processing": "Diproses", "extended": "Diperpanjang", "fulfilled": "Informasi diberikan", "rejected": "Ditolak", "closed": "Selesai"}[value]
}
func objectionStatusLabel(value string) string {
	return map[string]string{"submitted": "Diterima", "review": "Ditelaah Atasan PPID", "accepted": "Diterima", "rejected": "Ditolak", "resolved": "Selesai"}[value]
}
func objectionReasonLabel(value string) string {
	return map[string]string{"request_rejected": "Permohonan ditolak", "information_unavailable": "Informasi tidak tersedia", "late_response": "Jawaban melewati tenggat", "fee_dispute": "Keberatan biaya", "incomplete_response": "Jawaban tidak lengkap", "periodic_not_published": "Informasi berkala belum diumumkan"}[value]
}
func countDueSoon(requests []PPIDRequest, objections []PPIDObjection) int {
	limit := today().AddDate(0, 0, 3)
	count := 0
	for _, item := range requests {
		deadline := item.DueAt
		if item.ExtendedDueAt != "" {
			deadline = item.ExtendedDueAt
		}
		date := parseDate(deadline)
		if !item.IsOverdue && date.After(today()) && !date.After(limit) && item.CompletedAt == "" {
			count++
		}
	}
	for _, item := range objections {
		date := parseDate(item.DueAt)
		if !item.IsOverdue && date.After(today()) && !date.After(limit) && item.DecidedAt == "" {
			count++
		}
	}
	return count
}
