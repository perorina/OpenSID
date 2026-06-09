import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Building2,
  FileText,
  HandHeart,
  Home,
  Loader2,
  LogIn,
  LogOut,
  Newspaper,
  RefreshCw,
  Send,
  ShieldCheck,
  Sprout,
  UserRound,
} from "lucide-react";
import {
  apiGet,
  apiPost,
  ArsipSurat,
  Artikel,
  Dtks,
  MandiriUser,
  Pembangunan,
  PermohonanSurat,
  ProgramBantuan,
  Ringkasan,
  SuratTemplate,
} from "./api";

type Tab = "home" | "artikel" | "pembangunan" | "bantuan" | "dtks" | "mandiri";

const tabs: Array<{ key: Tab; label: string; icon: typeof Home }> = [
  { key: "home", label: "Home", icon: Home },
  { key: "artikel", label: "Artikel", icon: Newspaper },
  { key: "pembangunan", label: "Pembangunan", icon: Building2 },
  { key: "bantuan", label: "Bantuan", icon: HandHeart },
  { key: "dtks", label: "DTKS", icon: Sprout },
  { key: "mandiri", label: "Mandiri", icon: ShieldCheck },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [artikel, setArtikel] = useState<Artikel[]>([]);
  const [pembangunan, setPembangunan] = useState<Pembangunan[]>([]);
  const [program, setProgram] = useState<ProgramBantuan[]>([]);
  const [dtks, setDtks] = useState<Dtks | null>(null);
  const [user, setUser] = useState<MandiriUser | null>(null);
  const [templates, setTemplates] = useState<SuratTemplate[]>([]);
  const [permohonan, setPermohonan] = useState<PermohonanSurat[]>([]);
  const [arsip, setArsip] = useState<ArsipSurat[]>([]);
  const [loading, setLoading] = useState(true);
  const [mandiriLoading, setMandiriLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPublic = useCallback(async () => {
    setLoading(true);
    try {
      const [summary, articles, works, aids, dtksData] = await Promise.all([
        apiGet<Ringkasan>("/ringkasan"),
        apiGet<Artikel[]>("/artikel?limit=6"),
        apiGet<Pembangunan[]>("/pembangunan?limit=6"),
        apiGet<ProgramBantuan[]>("/program-bantuan?limit=6"),
        apiGet<Dtks>("/dtks"),
      ]);
      setRingkasan(summary);
      setArtikel(articles);
      setPembangunan(works);
      setProgram(aids);
      setDtks(dtksData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Data publik belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMandiri = useCallback(async () => {
    setMandiriLoading(true);
    try {
      const [suratTemplates, suratPermohonan, suratArsip] = await Promise.all([
        apiGet<SuratTemplate[]>("/mandiri/surat/templates"),
        apiGet<PermohonanSurat[]>("/mandiri/surat/permohonan"),
        apiGet<ArsipSurat[]>("/mandiri/surat/arsip"),
      ]);
      setTemplates(suratTemplates);
      setPermohonan(suratPermohonan);
      setArsip(suratArsip);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Data mandiri belum bisa dimuat.");
    } finally {
      setMandiriLoading(false);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const me = await apiGet<{ user: MandiriUser }>("/mandiri/me");
      setUser(me.user);
      await loadMandiri();
    } catch {
      try {
        const refreshed = await apiPost<{ user: MandiriUser }>("/mandiri/auth/refresh", undefined, false);
        setUser(refreshed.user);
        await loadMandiri();
      } catch {
        setUser(null);
      }
    }
  }, [loadMandiri]);

  useEffect(() => {
    void loadPublic();
    void restoreSession();
  }, [loadPublic, restoreSession]);

  const statMap = useMemo(() => {
    return new Map(ringkasan?.statistik.map((item) => [item.key, item]) ?? []);
  }, [ringkasan]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/yamansari-mark.svg" alt="Yamansari" />
          <div>
            <strong>Yamansari</strong>
            <span>Digital</span>
          </div>
        </div>
        <nav className="nav-tabs" aria-label="Navigasi utama">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button className="ghost-button" onClick={() => void loadPublic()}>
          <RefreshCw size={16} />
          Sinkron
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p>{ringkasan?.profil.wilayah.kecamatan ?? "Lebaksiu"}</p>
            <h1>Desa {ringkasan?.profil.nama ?? "Yamansari"}</h1>
          </div>
          <div className="session-pill">
            <UserRound size={16} />
            <span>{user?.nama ?? "Warga"}</span>
          </div>
        </header>

        {notice && (
          <button className="notice" onClick={() => setNotice(null)}>
            {notice}
          </button>
        )}

        {loading ? (
          <div className="loading"><Loader2 className="spin" /> Memuat data Yamansari</div>
        ) : (
          <>
            {tab === "home" && <HomeView ringkasan={ringkasan} statMap={statMap} artikel={artikel} />}
            {tab === "artikel" && <ArtikelView items={artikel} />}
            {tab === "pembangunan" && <PembangunanView items={pembangunan} />}
            {tab === "bantuan" && <ProgramView items={program} />}
            {tab === "dtks" && <DtksView data={dtks} />}
            {tab === "mandiri" && (
              <MandiriView
                user={user}
                setUser={setUser}
                templates={templates}
                permohonan={permohonan}
                arsip={arsip}
                loading={mandiriLoading}
                onChanged={async () => {
                  await Promise.all([loadMandiri(), loadPublic()]);
                }}
                onNotice={setNotice}
              />
            )}
          </>
        )}
      </section>
    </main>
  );
}

function HomeView({ ringkasan, statMap, artikel }: { ringkasan: Ringkasan | null; statMap: Map<string, { value: number; label: string }>; artikel: Artikel[] }) {
  const mainStats = ["penduduk_aktif", "keluarga", "permohonan_baru", "dtks"];
  return (
    <div className="stack">
      <section className="village-band">
        <img src={ringkasan?.profil.logoUrl ?? "/yamansari-mark.svg"} alt="Lambang desa" />
        <div>
          <h2>Operasional warga yang ringkas, cepat, dan jelas.</h2>
          <p>{ringkasan?.profil.alamat ?? "Yamansari, Lebaksiu, Tegal, Jawa Tengah"}</p>
        </div>
      </section>
      <section className="metric-grid">
        {mainStats.map((key) => {
          const item = statMap.get(key);
          return <Metric key={key} label={item?.label ?? key} value={item?.value ?? 0} />;
        })}
      </section>
      <section className="two-column">
        <Panel title="Artikel terbaru" icon={Newspaper}>{artikel.slice(0, 3).map((item) => <ArticleRow key={item.id} item={item} />)}</Panel>
        <Panel title="DTKS" icon={Sprout}>
          <div className="dtks-compact"><strong>{formatNumber(ringkasan?.dtks.ruta ?? 0)}</strong><span>ruta terdata</span></div>
          <div className="dtks-compact"><strong>{formatNumber(ringkasan?.dtks.anggota ?? 0)}</strong><span>anggota</span></div>
        </Panel>
      </section>
    </div>
  );
}

function ArtikelView({ items }: { items: Artikel[] }) {
  return <ListPanel title="Artikel" items={items} render={(item) => <ArticleRow key={item.id} item={item} />} />;
}

function PembangunanView({ items }: { items: Pembangunan[] }) {
  return (
    <ListPanel
      title="Pembangunan"
      items={items}
      render={(item) => (
        <article key={item.id} className="item-card">
          {item.fotoUrl && <img src={item.fotoUrl} alt="" />}
          <div>
            <h3>{item.judul}</h3>
            <p>{item.ringkasan || item.lokasi}</p>
            <div className="chips"><span>{item.tahunAnggaran ?? "-"}</span><span>{rupiah(item.anggaran)}</span><span>{item.status}</span></div>
          </div>
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Buka ${item.judul}`}><ArrowUpRight size={18} /></a>
        </article>
      )}
    />
  );
}

function ProgramView({ items }: { items: ProgramBantuan[] }) {
  return (
    <ListPanel
      title="Program bantuan"
      items={items}
      render={(item) => (
        <article key={item.id} className="aid-row">
          <HandHeart size={20} />
          <div>
            <h3>{item.nama}</h3>
            <p>{item.deskripsi ?? item.asalDana ?? "Program bantuan desa"}</p>
          </div>
          <strong>{formatNumber(item.jumlahPeserta)}</strong>
          <span>{item.sasaran.label}</span>
        </article>
      )}
    />
  );
}

function DtksView({ data }: { data: Dtks | null }) {
  return (
    <div className="stack">
      <section className="metric-grid">
        <Metric label="Ruta" value={data?.ruta ?? 0} />
        <Metric label="Anggota" value={data?.anggota ?? 0} />
        <Metric label="Lampiran" value={data?.lampiran ?? 0} />
        <Metric label="RTM DTKS" value={data?.rtm_terdaftar_dtks ?? 0} />
      </section>
      <Panel title="Versi kuisioner" icon={Sprout}>
        {(data?.versi_kuisioner.length ? data.versi_kuisioner : [{ versi: data?.status ?? "menunggu_impor", jumlah: 0 }]).map((item, index) => (
          <div className="table-row" key={`${item.versi}-${index}`}><span>{item.versi ?? "-"}</span><strong>{formatNumber(item.jumlah)}</strong></div>
        ))}
      </Panel>
    </div>
  );
}

function MandiriView({
  user,
  setUser,
  templates,
  permohonan,
  arsip,
  loading,
  onChanged,
  onNotice,
}: {
  user: MandiriUser | null;
  setUser: (user: MandiriUser | null) => void;
  templates: SuratTemplate[];
  permohonan: PermohonanSurat[];
  arsip: ArsipSurat[];
  loading: boolean;
  onChanged: () => Promise<void>;
  onNotice: (message: string | null) => void;
}) {
  if (!user) return <LoginPanel setUser={setUser} onChanged={onChanged} onNotice={onNotice} />;
  return (
    <div className="stack">
      <section className="mandiri-head">
        <div><p>Layanan Mandiri</p><h2>{user.nama}</h2><span>{maskNik(user.nik)}</span></div>
        <button className="ghost-button" onClick={async () => { await apiPost("/mandiri/auth/keluar", {}); setUser(null); }}><LogOut size={16} /> Keluar</button>
      </section>
      {loading && <div className="loading"><Loader2 className="spin" /> Memuat layanan mandiri</div>}
      <SuratForm templates={templates} onChanged={onChanged} onNotice={onNotice} />
      <section className="two-column">
        <Panel title="Permohonan" icon={FileText}>{permohonan.length ? permohonan.map((item) => <PermohonanRow key={item.id} item={item} onChanged={onChanged} onNotice={onNotice} />) : <Empty text="Belum ada permohonan" />}</Panel>
        <Panel title="Arsip" icon={Archive}>{arsip.length ? arsip.map((item) => <ArsipRow key={item.id} item={item} />) : <Empty text="Belum ada arsip" />}</Panel>
      </section>
    </div>
  );
}

function LoginPanel({ setUser, onChanged, onNotice }: { setUser: (user: MandiriUser | null) => void; onChanged: () => Promise<void>; onNotice: (message: string | null) => void }) {
  const [nik, setNik] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await apiPost<{ user: MandiriUser }>("/mandiri/auth/masuk", { nik, pin }, false);
      setUser(data.user);
      await onChanged();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Login gagal.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="login-panel" onSubmit={submit}>
      <ShieldCheck size={28} />
      <h2>Masuk Mandiri</h2>
      <label>NIK<input value={nik} onChange={(event) => setNik(event.target.value)} inputMode="numeric" autoComplete="username" /></label>
      <label>PIN<input value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete="current-password" /></label>
      <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={16} /> : <LogIn size={16} />} Masuk</button>
    </form>
  );
}

function SuratForm({ templates, onChanged, onNotice }: { templates: SuratTemplate[]; onChanged: () => Promise<void>; onNotice: (message: string | null) => void }) {
  const [idSurat, setIdSurat] = useState("");
  const [phone, setPhone] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [keperluan, setKeperluan] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = templates.find((item) => String(item.id) === idSurat);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const syarat = Object.fromEntries(selected.syarat_ids.map((id) => [String(id), -1]));
      await apiPost("/mandiri/surat/permohonan", { id_surat: selected.id, no_hp_aktif: phone, keterangan, isian_form: { keperluan }, syarat });
      setKeterangan(""); setKeperluan(""); setPhone("");
      await onChanged();
      onNotice("Permohonan surat tersimpan.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Permohonan belum bisa dibuat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="surat-form" onSubmit={submit}>
      <div><h2>Permohonan surat</h2><p>{templates.length} template tersedia</p></div>
      <select value={idSurat} onChange={(event) => setIdSurat(event.target.value)} required>
        <option value="">Pilih template</option>
        {templates.map((item) => <option value={item.id} key={item.id}>{item.nama}</option>)}
      </select>
      <input placeholder="No. HP aktif" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" required />
      <textarea placeholder="Keperluan" value={keperluan} onChange={(event) => setKeperluan(event.target.value)} />
      <input placeholder="Keterangan" value={keterangan} onChange={(event) => setKeterangan(event.target.value)} />
      {selected?.syarat.length ? <div className="chips">{selected.syarat.map((item) => <span key={item.id}>{item.nama ?? `Syarat ${item.id}`}: fisik</span>)}</div> : null}
      <button className="primary-button" disabled={busy || !selected}>{busy ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Kirim</button>
    </form>
  );
}

function PermohonanRow({ item, onChanged, onNotice }: { item: PermohonanSurat; onChanged: () => Promise<void>; onNotice: (message: string | null) => void }) {
  async function cancel() {
    try {
      await apiPost(`/mandiri/surat/permohonan/${item.id}/batal`, {});
      await onChanged();
      onNotice("Permohonan dibatalkan.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Permohonan tidak bisa dibatalkan.");
    }
  }
  const canCancel = item.status.kode === 0 || item.status.kode === 1;
  return (
    <div className="table-row surat-row">
      <div><strong>{item.nama_surat}</strong><span>{item.created_at}</span></div>
      <span className="status-badge">{item.status.label}</span>
      {canCancel && <button className="icon-button" onClick={cancel} aria-label="Batalkan permohonan"><LogOut size={15} /></button>}
    </div>
  );
}

function ArsipRow({ item }: { item: ArsipSurat }) {
  return (
    <div className="table-row surat-row">
      <div><strong>{item.nama_surat ?? item.nama_format ?? "Surat"}</strong><span>{item.no_surat ?? item.tanggal}</span></div>
      <a className="icon-button" href={item.cetak_url} target="_blank" rel="noreferrer" aria-label="Cetak surat"><ArrowUpRight size={15} /></a>
    </div>
  );
}

function ListPanel<T>({ title, items, render }: { title: string; items: T[]; render: (item: T) => ReactNode }) {
  return <div className="stack"><h2 className="section-title">{title}</h2>{items.length ? items.map(render) : <Empty text="Data belum tersedia" />}</div>;
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Home; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-title"><Icon size={18} /><h2>{title}</h2></div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="metric"><span>{label}</span><strong>{formatNumber(value)}</strong></article>;
}

function ArticleRow({ item }: { item: Artikel }) {
  return (
    <article className="item-card">
      {item.gambarUrl && <img src={item.gambarUrl} alt="" />}
      <div>
        <h3>{item.judul}</h3>
        <p>{item.ringkasan}</p>
        <div className="chips"><span>{item.tanggal ?? "-"}</span><span>{formatNumber(item.jumlahDilihat)} dilihat</span></div>
      </div>
      <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Buka ${item.judul}`}><ArrowUpRight size={18} /></a>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function maskNik(value: string) {
  if (value.length < 8) return value;
  return `${value.slice(0, 4)}********${value.slice(-4)}`;
}
