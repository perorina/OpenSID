export const API_BASE = import.meta.env.VITE_YMS_API_BASE ?? "http://127.0.0.1:8090/api/yms";

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
  const token = readCookie("yms_csrf");
  if (csrf && token) headers["X-CSRF-Token"] = token;
  return request<T>(path, { method: "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
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
