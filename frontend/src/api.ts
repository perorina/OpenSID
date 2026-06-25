export const API_BASE = (import.meta.env.VITE_YMS_BFF_BASE ?? "/_bff").trim();
export const HAS_API_BASE = API_BASE.length > 0;

export type ApiEnvelope<T> = {
  status: "ok" | "error";
  data: T;
  meta?: Record<string, unknown>;
  error?: { code: string; message: string };
};

export type Profil = {
  nama: string;
  kode: Record<string, string | null>;
  wilayah: Record<string, string | null>;
  alamat: string | null;
  kontak: Record<string, string | null>;
  logoUrl: string | null;
};

export type Ringkasan = {
  profil: Profil;
  statistik: Array<{ key: string; label: string; value: number }>;
  dtks: Dtks;
};

export type Artikel = {
  id: number;
  judul: string;
  ringkasan: string;
  tanggal: string | null;
  gambarUrl: string | null;
  url: string;
  jumlahDilihat: number;
};

export type Pembangunan = {
  id: number;
  judul: string;
  ringkasan: string;
  lokasi: string | null;
  tahunAnggaran: string | null;
  anggaran: number;
  pelaksana: string | null;
  status: string;
  fotoUrl: string | null;
  url: string;
};

export type ProgramBantuan = {
  id: number;
  nama: string;
  sasaran: { kode: number; label: string };
  deskripsi: string | null;
  mulai: string | null;
  selesai: string | null;
  asalDana: string | null;
  jumlahPeserta: number;
  status: string;
};

export type Dtks = {
  status: string;
  ruta: number;
  anggota: number;
  lampiran: number;
  rtm_terdaftar_dtks: number;
  versi_kuisioner: Array<{ versi: string | null; jumlah: number }>;
  catatan: string | null;
  lastUpdated?: string | null;
  managedBy?: string;
  adminPath?: string;
  adminUrl?: string;
  source?: Array<{ table: string; label: string; rows: number }>;
};

export type AdminUser = {
  id: number;
  config_id: number;
  username: string;
  nama: string;
  email: string | null;
  id_grup: number;
};

export type PPIDProfile = {
  supervisorPamongId: number;
  ppidPamongId: number;
  serviceOfficerPamongId: number;
  serviceAddress: string;
  serviceSchedule: string;
  phone: string;
  email: string;
  feePolicy: string;
  serviceCommitment: string;
  responseDays: number;
  extensionDays: number;
  isPublished: boolean;
  isSample: boolean;
  updatedAt?: string;
};

export type PPIDOfficial = {
  id: number;
  name: string;
  role: string;
  position: string;
  photoUrl: string | null;
  isFallback: boolean;
};

export type PPIDDocument = {
  id: number;
  title: string;
  year?: string;
  category: string;
  publishedAt?: string;
  retentionUntil?: string;
  description?: string;
  url: string | null;
  isSample: boolean;
};

export type PPIDPublicData = {
  profile: PPIDProfile;
  officials: PPIDOfficial[];
  documents: PPIDDocument[];
  isSample: boolean;
};

export type PPIDPamong = {
  id: number;
  name: string;
  position: string;
  photoUrl: string | null;
  order: number;
};

export type AdminPPIDPayload = PPIDPublicData & {
  pamongOptions: PPIDPamong[];
  canEdit: boolean;
  sampleAvailable: boolean;
  openSidAdminUrl: string;
};

export type AdminPPIDSeedResult = {
  profileSeeded: boolean;
  documentsCreated: number;
  documentsUpdated: number;
};

export type DIPCategory = {
  code: number;
  slug: string;
  label: string;
};

export type DIPMetadata = {
  documentId: number;
  publicationType: string;
  summary: string;
  controllingUnit: string;
  responsibleOfficial: string;
  publisher: string;
  createdDate: string;
  createdPlace: string;
  updateFrequency: string;
  isListed: boolean;
  isSample: boolean;
  sortOrder: number;
  version: number;
};

export type DIPEntry = {
  documentId: number;
  title: string;
  publicationType: string;
  category: DIPCategory;
  year?: string;
  summary: string;
  controllingUnit: string;
  responsibleOfficial: string;
  publisher: string;
  createdDate: string;
  createdPlace: string;
  updateFrequency: string;
  format: string;
  publishedAt?: string;
  retentionUntil?: string;
  retentionLabel: string;
  updatedAt?: string;
  viewUrl: string;
  isSample: boolean;
};

export type DIPListPayload = {
  items: DIPEntry[];
  categories: Array<DIPCategory & { count: number }>;
  years: string[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  isSample: boolean;
};

export type AdminDIPDocument = {
  entry: DIPEntry;
  metadata: DIPMetadata;
  complete: boolean;
};

export type AdminDIPPayload = {
  documents: AdminDIPDocument[];
  completeCount: number;
  incompleteCount: number;
  canEdit: boolean;
  sampleAvailable: boolean;
  openSidAdminUrl: string;
};

export type AdminDIPSeedResult = {
  documentsCreated: number;
  documentsUpdated: number;
  metadataUpserted: number;
  totalDocuments: number;
};

export type PublicationCatalog = {
  documents: DIPEntry[];
  coverage: Array<{ key: string; label: string; available: number; required: boolean }>;
  completed: number;
  required: number;
  completeness: number;
  isSample: boolean;
};

export type BudgetData = {
  year: string;
  totalAnggaran: number;
  totalRealisasi: number;
  items: Array<{ kode: string; uraian: string; anggaran: number; realisasi: number }>;
};

export type InformationRequest = {
  id: number;
  ticketCode: string;
  applicantName: string;
  identityType?: string;
  identityNumber?: string;
  email?: string;
  phone: string;
  address?: string;
  informationRequested: string;
  purpose: string;
  deliveryMethod: string;
  status: string;
  statusLabel: string;
  dueAt: string;
  extendedDueAt?: string;
  responseSummary?: string;
  rejectionReason?: string;
  responseDocumentId?: number;
  responseDocumentUrl?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  isSample: boolean;
  isOverdue: boolean;
};

export type InformationObjection = {
  id: number;
  requestId?: number;
  requestTicket?: string;
  ticketCode: string;
  applicantName: string;
  email?: string;
  phone: string;
  reasonCode: string;
  reasonLabel: string;
  detail: string;
  status: string;
  statusLabel: string;
  dueAt: string;
  response?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
  isSample: boolean;
  isOverdue: boolean;
};

export type TrackingCredential = {
  ticketCode: string;
  trackingToken: string;
  dueAt: string;
  status: string;
};

export type PPIDReport = {
  year: number;
  requestsTotal: number;
  requestsByStatus: Record<string, number>;
  objectionsTotal: number;
  objectionsByStatus: Record<string, number>;
  overdueRequests: number;
  overdueObjections: number;
  averageResponseDays: number;
  dipPublished: number;
  dipVersionTotal: number;
  emergencies: number;
  monthlyRequests: number[];
  generatedAt: string;
};

export type Emergency = {
  id: number;
  title: string;
  severity: "info" | "warning" | "critical";
  status: "draft" | "published" | "resolved";
  statusLabel: string;
  occurredAt: string;
  location: string;
  affectedArea: string;
  instructions: string;
  evacuationRoute?: string;
  safePlace?: string;
  aidChannel?: string;
  actionTaken?: string;
  contactName?: string;
  contactPhone?: string;
  publishedAt?: string;
  resolvedAt?: string;
  updatedAt: string;
  isSample: boolean;
};

export type EmergencyData = {
  items: Emergency[];
  contacts: Array<{ id: number; kind: string; label: string; value: string; description?: string }>;
  isSample: boolean;
};

export type PPIDAuditEntry = {
  id: number;
  actor: string;
  entityType: string;
  entityId?: number;
  action: string;
  detail?: Record<string, unknown>;
  createdAt: string;
};

export type AdminPPIDServices = {
  requests: InformationRequest[];
  objections: InformationObjection[];
  emergencies: Emergency[];
  audit: PPIDAuditEntry[];
  report: PPIDReport;
  sla: { requestsOverdue: number; objectionsOverdue: number; dueSoon: number };
  canEdit: boolean;
  sampleAvailable: boolean;
};

export type AdminDTKSItem = {
  id: number;
  isDraft: boolean;
  idRtm: number;
  idKeluarga: number;
  versiKuisioner: string;
  noKk: string;
  kepalaKeluarga: string;
  kepalaNik: string;
  dusun: string;
  rt: string;
  rw: string;
  namaResponden: string;
  petugasPencacahan: string;
  ppl: string;
  pml: string;
  catatan: string;
  tanggalPendataan: string;
  updatedAt: string;
  anggotaCount: number;
  opensidFormPath: string;
  opensidFormUrl: string;
  opensidAnggotaPath: string;
  opensidAnggotaUrl: string;
};

export type AdminDTKSAnggota = {
  id: number;
  idPenduduk: number;
  nama: string;
  nik: string;
  hubunganKrt: string;
  hubunganKk: string;
  jenisKelamin: string;
  bekerja: string;
  pendapatanSebulan: number;
  updatedAt: string;
};

export type AdminDTKSDetail = {
  item: AdminDTKSItem;
  anggota: AdminDTKSAnggota[];
  indikator: {
    pkh: string;
    bltDanaDesa: string;
    bssBnpt: string;
    subsidiListrik: string;
    internetSebulan: string;
    luasLantai: number;
    jumlahKamarTidur: string;
    sumberAirMinum: string;
    sumberPenerangan: string;
    bahanBakarMemasak: string;
  };
};

export type AdminDTKSList = {
  summary: Dtks;
  items: AdminDTKSItem[];
  count: number;
};

export type AdminDTKSSeedResult = {
  rtmCreated: number;
  dtksCreated: number;
  anggotaCreated: number;
  lampiranCreated: number;
  familiesScanned: number;
};

export type PublicInitialData = {
  ringkasan?: Ringkasan;
  artikel?: Artikel[];
  pembangunan?: Pembangunan[];
  program?: ProgramBantuan[];
  dtks?: Dtks;
  ppid?: PPIDPublicData;
  dip?: DIPListPayload;
  dipDetail?: DIPEntry;
  publications?: PublicationCatalog;
  budget?: BudgetData;
  emergency?: EmergencyData;
  ppidReport?: PPIDReport;
};

export type MandiriUser = {
  id_pend: number;
  config_id: number;
  nik: string;
  nama: string;
  email: string | null;
  telegram: string | null;
};

export type SuratTemplate = {
  id: number;
  nama: string;
  url_surat: string;
  kode_surat: string | null;
  syarat_ids: number[];
  syarat: Array<{ id: number; nama: string | null }>;
  form_isian: unknown;
};

export type PermohonanSurat = {
  id: number;
  id_surat: number;
  nama_surat: string;
  status: { kode: number; label: string };
  keterangan: string | null;
  no_hp_aktif: string | null;
  no_antrian: string | null;
  created_at: string;
};

export type ArsipSurat = {
  id: number;
  nama_format: string | null;
  tanggal: string;
  no_surat: string | null;
  nama_surat: string | null;
  keterangan: string | null;
  cetak_url: string;
};

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body?: unknown, csrf = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = path.startsWith("/admin/") ? readCookie("yms_admin_csrf") : readCookie("yms_csrf");
  if (csrf && token) headers["X-CSRF-Token"] = token;
  return request<T>(path, { method: "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  if (!HAS_API_BASE) {
    throw new Error("API belum dikonfigurasi.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${API_BASE}${path}`, { ...init, credentials: "include", signal: controller.signal });
    const envelope = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || envelope.status !== "ok") {
      throw new Error(envelope.error?.message ?? "Request gagal");
    }
    return envelope.data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Koneksi API terlalu lama merespons.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function readCookie(name: string) {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];
}
