import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
} from "lucide-react";
import { loginAdmin, logoutAdmin, restoreAdminSession } from "./admin-auth";
import { apiGet, apiPost } from "./api";
import type {
  AdminDIPDocument,
  AdminDIPPayload,
  AdminDIPSeedResult,
  AdminUser,
  DIPEntry,
  DIPListPayload,
  DIPMetadata,
} from "./api";

const emptyDIP: DIPListPayload = {
  items: [],
  categories: [],
  years: [],
  pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
  isSample: false,
};

type DIPFilters = { q: string; category: string; year: string; page: number };

export function DIPListPage({ initialData }: { initialData?: DIPListPayload }) {
  const initialLoadStarted = useRef(false);
  const [data, setData] = useState(initialData ?? emptyDIP);
  const [filters, setFilters] = useState<DIPFilters>(() => {
    if (typeof window === "undefined") return { q: "", category: "semua", year: "", page: 1 };
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get("q") ?? "",
      category: params.get("category") ?? "semua",
      year: params.get("year") ?? "",
      page: Number(params.get("page")) || 1,
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) setData(initialData);
  }, [initialData]);

  const load = useCallback(async (next: Partial<DIPFilters> = {}) => {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.category !== "semua") params.set("category", merged.category);
    if (merged.year) params.set("year", merged.year);
    if (merged.page > 1) params.set("page", String(merged.page));

    setFilters(merged);
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<DIPListPayload>(`/public/dip${params.size ? `?${params}` : ""}`);
      setData(result);
      window.history.replaceState(null, "", `/dip${params.size ? `?${params}` : ""}`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Daftar informasi belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (initialData || initialLoadStarted.current) return;
    initialLoadStarted.current = true;
    void load();
  }, [initialData, load]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({ page: 1 });
  }

  return (
    <div className="space-y-4">
      <form className="civic-card p-3" onSubmit={submitSearch} role="search">
        <label className="sr-only" htmlFor="dip-search">Cari informasi publik</label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-civic-muted" size={19} aria-hidden="true" />
            <input
              id="dip-search"
              className="civic-control h-11 w-full pl-10 pr-3 text-sm outline-none focus:border-village-500"
              placeholder="Cari judul atau unit penguasa"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            />
          </div>
          <button className="h-11 rounded-civic-sm bg-village-800 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={loading} type="submit">
            {loading ? <Loader2 className="animate-spin" size={18} aria-label="Memuat" /> : "Cari"}
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="Filter kategori">
          {[{ slug: "semua", label: `Semua (${data.categories.reduce((total, item) => total + item.count, 0)})` }, ...data.categories.map((item) => ({ slug: item.slug, label: `${item.label.replace("Informasi ", "")} (${item.count})` }))].map((item) => (
            <button
              key={item.slug}
              className={`min-h-11 shrink-0 rounded-full border px-3 text-xs font-semibold ${filters.category === item.slug ? "border-village-800 bg-village-800 text-white" : "border-civic-border bg-white text-civic-muted"}`}
              aria-pressed={filters.category === item.slug}
              onClick={() => void load({ category: item.slug, page: 1 })}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {data.years.length ? (
          <label className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold text-civic-text">
            Tahun
            <select
              className="civic-control h-11 min-w-32 px-3 text-sm"
              value={filters.year}
              onChange={(event) => void load({ year: event.target.value, page: 1 })}
            >
              <option value="">Semua tahun</option>
              {data.years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        ) : null}
      </form>

      {error ? <Status tone="error">{error}</Status> : null}
      {data.isSample ? <Status tone="sample">Dokumen bertanda Contoh belum ditetapkan sebagai dokumen resmi.</Status> : null}

      <section aria-busy={loading} aria-label="Daftar informasi publik" className="space-y-3">
        {data.items.map((item) => <DIPCard key={item.documentId} item={item} />)}
        {!loading && data.items.length === 0 ? (
          <div className="civic-card px-4 py-8 text-center text-sm text-civic-muted">Informasi tidak ditemukan.</div>
        ) : null}
      </section>

      {data.pagination.totalPages > 1 ? (
        <nav className="flex items-center justify-between" aria-label="Halaman DIP">
          <button
            className="inline-flex h-11 items-center gap-1 rounded-civic-sm border border-civic-border bg-white px-3 text-sm font-semibold disabled:opacity-40"
            disabled={loading || data.pagination.page <= 1}
            onClick={() => void load({ page: data.pagination.page - 1 })}
          >
            <ChevronLeft size={17} /> Sebelumnya
          </button>
          <span className="text-xs font-semibold text-civic-muted">{data.pagination.page} / {data.pagination.totalPages}</span>
          <button
            className="inline-flex h-11 items-center gap-1 rounded-civic-sm border border-civic-border bg-white px-3 text-sm font-semibold disabled:opacity-40"
            disabled={loading || data.pagination.page >= data.pagination.totalPages}
            onClick={() => void load({ page: data.pagination.page + 1 })}
          >
            Berikutnya <ChevronRight size={17} />
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function DIPCard({ item }: { item: DIPEntry }) {
  return (
    <article className="civic-card p-4">
      <div className="flex items-start gap-3">
        <span className="civic-icon-box h-11 w-11"><FileText size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-village-100 px-2 py-1 text-[11px] font-semibold text-village-800">{item.category.label}</span>
            {item.isSample ? <span className="rounded-full bg-civic-warning-bg px-2 py-1 text-[11px] font-semibold text-civic-warning-ink">Contoh</span> : null}
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-[22px] text-civic-text">{item.title}</h3>
          <p className="mt-2 text-sm leading-[22px] text-civic-muted">{item.summary}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-civic-border-soft pt-3 text-xs leading-[18px] text-civic-muted">
        <p><span className="block font-semibold text-civic-text">Unit</span>{item.controllingUnit}</p>
        <p><span className="block font-semibold text-civic-text">Format</span>{item.format}</p>
      </div>
      <a className="mt-3 inline-flex min-h-11 w-full items-center justify-between rounded-civic-sm bg-civic-soft px-3 text-sm font-semibold text-village-800" href={`/dip/${item.documentId}`}>
        Lihat detail <ChevronRight size={18} />
      </a>
    </article>
  );
}

export function DIPDetailPage({ item }: { item?: DIPEntry }) {
  if (!item) {
    return <div className="mt-5 civic-card px-4 py-8 text-center text-sm text-civic-muted">Informasi publik tidak ditemukan.</div>;
  }

  const details = [
    ["Kategori", item.category.label],
    ["Unit penguasa", item.controllingUnit],
    ["Penanggung jawab", item.responsibleOfficial],
    ["Penerbit", item.publisher],
    ["Dibuat", `${formatDate(item.createdDate)} di ${item.createdPlace}`],
    ["Pembaruan", item.updateFrequency],
    ["Retensi", item.retentionLabel],
    ["Format", item.format],
  ];

  return (
    <div className="mt-5 space-y-4">
      <a className="inline-flex min-h-11 items-center gap-2 rounded-civic-sm bg-civic-soft px-3 text-sm font-semibold" href="/dip">
        <ArrowLeft size={17} /> Daftar Informasi Publik
      </a>
      <article className="civic-card p-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-village-100 px-2 py-1 text-[11px] font-semibold text-village-800">{item.category.label}</span>
          {item.isSample ? <span className="rounded-full bg-civic-warning-bg px-2 py-1 text-[11px] font-semibold text-civic-warning-ink">Contoh</span> : null}
        </div>
        <h1 className="mt-3 text-[28px] font-bold leading-9 text-civic-text">{item.title}</h1>
        <p className="mt-3 text-sm leading-[22px] text-civic-muted">{item.summary}</p>
        <a className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-4 text-sm font-semibold text-white" href={item.viewUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={18} /> Buka dokumen
        </a>
      </article>

      <dl className="civic-card divide-y divide-civic-border-soft px-4" aria-label="Metadata informasi publik">
        {details.map(([label, value]) => (
          <div className="grid grid-cols-[112px_1fr] gap-3 py-3 text-sm leading-[22px]" key={label}>
            <dt className="font-semibold text-civic-muted">{label}</dt>
            <dd className="m-0 font-medium text-civic-text">{value || "-"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DIPAdminPage({ villageName }: { villageName: string }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<AdminDIPPayload | null>(null);
  const [editing, setEditing] = useState<AdminDIPDocument | null>(null);
  const [metadata, setMetadata] = useState<DIPMetadata | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGet<AdminDIPPayload>("/admin/dip"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Data DIP belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    restoreAdminSession()
      .then(async (user) => {
        if (!active) return;
        setAdmin(user);
        await load();
      })
      .catch(() => active && setAdmin(null))
      .finally(() => active && setAuthChecked(true));
    return () => { active = false; };
  }, [load]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setAdmin(await loginAdmin(loginForm));
      await load();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login admin gagal.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try { await logoutAdmin(); } catch { /* Session lokal tetap ditutup. */ }
    setAdmin(null);
    setData(null);
    setEditing(null);
  }

  function beginEdit(document: AdminDIPDocument) {
    setEditing(document);
    setMetadata({ ...document.metadata });
    setMessage(null);
    setError(null);
  }

  function updateMetadata<K extends keyof DIPMetadata>(key: K, value: DIPMetadata[K]) {
    setMetadata((current) => current ? { ...current, [key]: value } : current);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !metadata) return;
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/admin/dip/${editing.entry.documentId}`, metadata);
      setMessage("Metadata DIP tersimpan.");
      setEditing(null);
      setMetadata(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Metadata belum bisa disimpan.");
    } finally {
      setLoading(false);
    }
  }

  async function seed() {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPost<AdminDIPSeedResult>("/admin/dip/seed-sample", {});
      setMessage(`${result.totalDocuments} dokumen contoh siap.`);
      await load();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Data contoh belum bisa dibuat.");
    } finally {
      setLoading(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-cream-50 text-civic-text md:py-6">
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-cream-50 px-4 pb-10 pt-5 md:rounded-civic-xl md:border md:border-civic-border md:shadow-civic-md">
        <header className="flex items-center justify-between gap-3">
          <a className="grid h-11 w-11 place-items-center rounded-civic-md border border-civic-border bg-white" href="/dip" aria-label="Kembali ke DIP"><ArrowLeft size={20} /></a>
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-village-700">Desa {villageName}</p><h1 className="text-xl font-bold">Admin DIP</h1></div>
          {admin ? <button className="grid h-11 w-11 place-items-center rounded-civic-md border border-civic-border bg-white" onClick={handleLogout} aria-label="Keluar"><LogOut size={19} /></button> : null}
        </header>
        {children}
      </section>
    </main>
  );

  if (!authChecked) return shell(<div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-village-700" aria-label="Memuat sesi" /></div>);

  if (!admin) {
    return shell(
      <form className="civic-card mt-8 space-y-4 p-5" onSubmit={handleLogin}>
        <span className="civic-icon-box"><ShieldCheck size={24} /></span>
        <h2 className="text-[22px] font-bold leading-[30px]">Masuk pengelola DIP</h2>
        <label className="block text-sm font-semibold">Username<input className="civic-control mt-2 w-full px-3" autoComplete="username" value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} /></label>
        <label className="block text-sm font-semibold">Password<input className="civic-control mt-2 w-full px-3" type="password" autoComplete="current-password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} /></label>
        {error ? <Status tone="error">{error}</Status> : null}
        <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 text-sm font-semibold text-white disabled:opacity-60" disabled={loading}><LogIn size={18} /> Masuk</button>
      </form>,
    );
  }

  return shell(
    <>
      <section className="mt-6 grid grid-cols-2 gap-3">
        <Metric label="Lengkap" value={data?.completeCount ?? 0} />
        <Metric label="Belum lengkap" value={data?.incompleteCount ?? 0} />
      </section>
      {message ? <Status tone="success">{message}</Status> : null}
      {error ? <Status tone="error">{error}</Status> : null}
      <div className="mt-4 flex gap-2">
        {data?.sampleAvailable ? <button className="h-11 rounded-civic-sm bg-village-800 px-3 text-sm font-semibold text-white disabled:opacity-60" disabled={loading || !data.canEdit} onClick={() => void seed()}>Isi data contoh</button> : null}
        {data?.openSidAdminUrl ? <a className="inline-flex h-11 items-center gap-2 rounded-civic-sm border border-civic-border bg-white px-3 text-sm font-semibold" href={data.openSidAdminUrl} target="_blank" rel="noreferrer">OpenSID <ExternalLink size={16} /></a> : null}
      </div>

      {editing && metadata ? (
        <form className="civic-card mt-5 space-y-4 p-4" onSubmit={save}>
          <div><p className="text-xs font-semibold text-village-700">Edit metadata</p><h2 className="mt-1 text-lg font-bold leading-6">{editing.entry.title}</h2></div>
          <TextArea label="Ringkasan" value={metadata.summary} onChange={(value) => updateMetadata("summary", value)} />
          <TextField label="Unit penguasa" value={metadata.controllingUnit} onChange={(value) => updateMetadata("controllingUnit", value)} />
          <TextField label="Penanggung jawab" value={metadata.responsibleOfficial} onChange={(value) => updateMetadata("responsibleOfficial", value)} />
          <TextField label="Penerbit" value={metadata.publisher} onChange={(value) => updateMetadata("publisher", value)} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Tanggal dibuat" type="date" value={metadata.createdDate} onChange={(value) => updateMetadata("createdDate", value)} />
            <TextField label="Tempat dibuat" value={metadata.createdPlace} onChange={(value) => updateMetadata("createdPlace", value)} />
          </div>
          <TextField label="Frekuensi pembaruan" value={metadata.updateFrequency} onChange={(value) => updateMetadata("updateFrequency", value)} />
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input className="h-5 w-5 accent-village-800" type="checkbox" checked={metadata.isListed} onChange={(event) => updateMetadata("isListed", event.target.checked)} /> Tampilkan di DIP publik</label>
          <div className="flex gap-2">
            <button className="h-11 flex-1 rounded-civic-sm bg-village-800 px-3 text-sm font-semibold text-white disabled:opacity-60" disabled={loading || !data?.canEdit}>Simpan</button>
            <button className="h-11 rounded-civic-sm border border-civic-border bg-white px-3 text-sm font-semibold" onClick={() => setEditing(null)} type="button">Batal</button>
          </div>
        </form>
      ) : null}

      <section className="mt-5 space-y-3" aria-busy={loading}>
        {data?.documents.map((document) => (
          <article className="civic-card p-4" key={document.entry.documentId}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${document.complete ? "bg-village-100 text-village-800" : "bg-civic-warning-bg text-civic-warning-ink"}`}>{document.complete ? "Lengkap" : "Belum lengkap"}</span><h2 className="mt-2 text-[15px] font-semibold leading-[22px]">{document.entry.title}</h2></div>
              {document.complete ? <CheckCircle2 className="shrink-0 text-village-700" size={20} /> : <FileText className="shrink-0 text-civic-muted" size={20} />}
            </div>
            <button className="mt-3 h-11 w-full rounded-civic-sm bg-civic-soft text-sm font-semibold text-village-800 disabled:opacity-50" disabled={!data.canEdit} onClick={() => beginEdit(document)}>Kelola metadata</button>
          </article>
        ))}
      </section>
    </>,
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="civic-card p-4"><p className="text-2xl font-bold text-village-800">{value}</p><p className="mt-1 text-xs text-civic-muted">{label}</p></div>;
}

function TextField({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="block text-sm font-semibold">{label}<input className="civic-control mt-2 w-full px-3 text-sm" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TextArea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="block text-sm font-semibold">{label}<textarea className="civic-control mt-2 min-h-28 w-full resize-y px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Status({ children, tone }: { children: React.ReactNode; tone: "error" | "sample" | "success" }) {
  const styles = tone === "error" ? "border-civic-danger/20 bg-civic-danger-bg text-civic-danger" : tone === "success" ? "border-village-100 bg-village-50 text-village-800" : "border-civic-warning/20 bg-civic-warning-bg text-civic-warning-ink";
  return <p className={`mt-4 rounded-civic-sm border px-3 py-3 text-sm leading-[22px] ${styles}`}>{children}</p>;
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
