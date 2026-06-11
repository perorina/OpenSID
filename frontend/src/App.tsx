import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Grid2X2,
  Headphones,
  Home,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  Newspaper,
  Search,
  Send,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";
import { apiGet, apiPost } from "./api";
import type {
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

type Tab = "home" | "services" | "info" | "account";
type StatKey = "penduduk_aktif" | "keluarga" | "wilayah" | "permohonan_baru" | "surat_tercetak" | "dtks";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85";

const serviceItems = [
  { label: "Surat Online", icon: FileText, tone: "green", target: "account" as Tab },
  { label: "Pengaduan", icon: MessageCircle, tone: "orange", target: "services" as Tab },
  { label: "Berita Desa", icon: Newspaper, tone: "blue", target: "info" as Tab },
  { label: "Agenda", icon: CalendarDays, tone: "purple", target: "info" as Tab },
  { label: "UMKM", icon: Store, tone: "green", target: "services" as Tab },
  { label: "Data Warga", icon: UsersRound, tone: "blue", target: "info" as Tab },
  { label: "Pengumuman", icon: Megaphone, tone: "red", target: "info" as Tab },
  { label: "Lainnya", icon: Grid2X2, tone: "yellow", target: "services" as Tab },
];

const bottomTabs: Array<{ key: Tab; label: string; icon: typeof Home }> = [
  { key: "home", label: "Beranda", icon: Home },
  { key: "services", label: "Layanan", icon: Grid2X2 },
  { key: "info", label: "Informasi", icon: Newspaper },
  { key: "account", label: "Akun", icon: ShieldCheck },
];

const fallbackAgenda = {
  date: "24",
  month: "Mei",
  year: "2025",
  title: "Posyandu Balita & Lansia",
  place: "Balai Desa Yamansari",
  time: "08.00 - 11.00 WIB",
};

const fallbackDtks: Dtks = {
  status: "contoh",
  ruta: 184,
  anggota: 642,
  lampiran: 38,
  rtm_terdaftar_dtks: 128,
  versi_kuisioner: [{ versi: "2025", jumlah: 184 }],
  catatan: "Data contoh saat API lokal belum aktif.",
};

const fallbackRingkasan: Ringkasan = {
  profil: {
    nama: "Yamansari",
    kode: { desa: "3328062005", kecamatan: "332806", kabupaten: "3328", provinsi: "33" },
    wilayah: { desa: "Yamansari", kecamatan: "Lebaksiu", kabupaten: "Tegal", provinsi: "Jawa Tengah" },
    alamat: "Desa Yamansari, Kecamatan Lebaksiu, Kabupaten Tegal",
    kontak: { telepon: null, email: null, website: null },
    logoUrl: "/yamansari-mark.svg",
  },
  statistik: [
    { key: "penduduk_aktif", label: "Penduduk", value: 3245 },
    { key: "keluarga", label: "Keluarga", value: 1128 },
    { key: "wilayah", label: "RT/RW", value: 16 },
    { key: "permohonan_baru", label: "Permohonan baru", value: 8 },
    { key: "surat_tercetak", label: "Surat tercetak", value: 18 },
    { key: "dtks", label: "DTKS", value: fallbackDtks.ruta },
  ],
  dtks: fallbackDtks,
};

const fallbackArtikel: Artikel[] = [
  {
    id: 1,
    judul: "Gotong Royong Warga Bangun Jalan Lingkungan",
    ringkasan: "Warga bersama perangkat desa memperbaiki akses lingkungan.",
    tanggal: "20 Mei 2025",
    gambarUrl: `${HERO_IMAGE}&ixid=artikel-1`,
    url: "#",
    jumlahDilihat: 128,
  },
  {
    id: 2,
    judul: "Musdes Bahas RKPDes 2026 Desa Yamansari",
    ringkasan: "Musyawarah desa membahas prioritas kerja dan pelayanan warga.",
    tanggal: "18 Mei 2025",
    gambarUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=500&q=80",
    url: "#",
    jumlahDilihat: 93,
  },
];

const fallbackPembangunan: Pembangunan[] = [
  {
    id: 1,
    judul: "Perbaikan Jalan Lingkungan RT 001",
    ringkasan: "Peningkatan akses warga menuju area pelayanan dan pertanian.",
    lokasi: "RT 001 Yamansari",
    tahunAnggaran: "2025",
    anggaran: 180000000,
    pelaksana: "TPK Desa",
    status: "Berjalan",
    fotoUrl: HERO_IMAGE,
    url: "#",
  },
];

const fallbackProgram: ProgramBantuan[] = [
  {
    id: 1,
    nama: "Bantuan Pangan Yamansari",
    sasaran: { kode: 1, label: "Keluarga" },
    deskripsi: "Pendataan dan bantuan pangan untuk keluarga prioritas.",
    mulai: "2025-05-01",
    selesai: "2025-12-31",
    asalDana: "Dana Desa",
    jumlahPeserta: 50,
    status: "Aktif",
  },
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
  const [sessionChecked, setSessionChecked] = useState(false);
  const publicLoadedRef = useRef(false);

  const loadPublic = useCallback(async () => {
    setLoading(true);
    try {
      await apiGet<unknown>("/health");
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
      setRingkasan(fallbackRingkasan);
      setArtikel(fallbackArtikel);
      setPembangunan(fallbackPembangunan);
      setProgram(fallbackProgram);
      setDtks(fallbackDtks);
      console.info(error instanceof Error ? error.message : "Data publik belum bisa dimuat.");
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
    if (publicLoadedRef.current) return;
    publicLoadedRef.current = true;
    void loadPublic();
  }, [loadPublic]);

  useEffect(() => {
    if (tab !== "account" || sessionChecked) return;
    setSessionChecked(true);
    void restoreSession();
  }, [restoreSession, sessionChecked, tab]);

  const statMap = useMemo(() => {
    return new Map(ringkasan?.statistik.map((item) => [item.key, item]) ?? []);
  }, [ringkasan]);

  const villageName = ringkasan?.profil.nama ?? "Yamansari";
  const location = [
    ringkasan?.profil.wilayah.kecamatan,
    ringkasan?.profil.wilayah.kabupaten,
  ].filter(Boolean).join(", ") || "Lebaksiu, Tegal";

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 md:py-6">
      <section className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] md:rounded-[34px] md:border md:border-white">
        <div className="px-6 pb-32 pt-5">
          <VillageHeader villageName={villageName} location={location} logoUrl={ringkasan?.profil.logoUrl} />
          <SearchBar />

          {notice ? (
            <button
              className="mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-900"
              onClick={() => setNotice(null)}
            >
              {notice}
            </button>
          ) : null}

          {loading && tab === "home" ? (
            <LoadingState />
          ) : (
            <>
              {tab === "home" ? (
                <HomeScreen
                  artikel={artikel}
                  dtks={dtks}
                  program={program}
                  setTab={setTab}
                  statMap={statMap}
                  villageName={villageName}
                />
              ) : null}
              {tab === "services" ? (
                <ServicesScreen pembangunan={pembangunan} program={program} setTab={setTab} />
              ) : null}
              {tab === "info" ? (
                <InfoScreen artikel={artikel} dtks={dtks} pembangunan={pembangunan} statMap={statMap} />
              ) : null}
              {tab === "account" ? (
                <AccountScreen
                  arsip={arsip}
                  loading={mandiriLoading}
                  onChanged={async () => {
                    await Promise.all([loadMandiri(), loadPublic()]);
                  }}
                  onNotice={setNotice}
                  permohonan={permohonan}
                  setUser={setUser}
                  templates={templates}
                  user={user}
                />
              ) : null}
            </>
          )}
        </div>

        <BottomNavigation current={tab} setTab={setTab} />
      </section>
    </main>
  );
}

function VillageHeader({
  villageName,
  location,
  logoUrl,
}: {
  villageName: string;
  location: string;
  logoUrl: string | null | undefined;
}) {
  return (
    <header className="mt-6 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        <img
          src={logoUrl ?? "/yamansari-mark.svg"}
          alt="Lambang desa"
          className="h-12 w-12 shrink-0 rounded-2xl object-contain shadow-[0_6px_18px_rgba(15,138,67,0.16)]"
        />
        <div className="min-w-0">
          <h1 className="truncate text-[27px] font-bold leading-tight tracking-normal text-slate-950">Desa {villageName}</h1>
          <p className="truncate text-[15px] font-medium leading-snug text-slate-500">{location}</p>
        </div>
      </div>
      <button className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-slate-100 bg-white text-emerald-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)]" aria-label="Notifikasi">
        <Bell size={24} />
        <span className="absolute -right-0.5 -top-1 grid h-7 min-w-7 place-items-center rounded-full bg-red-500 px-1 text-sm font-bold text-white">3</span>
      </button>
    </header>
  );
}

function SearchBar() {
  return (
    <label className="mt-6 flex h-14 items-center gap-3 rounded-[20px] border border-slate-200 bg-white px-4 text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <Search size={25} className="shrink-0 text-slate-600" />
      <input
        className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:text-slate-500"
        placeholder="Cari layanan, informasi, berita..."
        type="search"
      />
      <Menu size={24} className="shrink-0 text-slate-600" />
    </label>
  );
}

function HomeScreen({
  artikel,
  dtks,
  program,
  setTab,
  statMap,
  villageName,
}: {
  artikel: Artikel[];
  dtks: Dtks | null;
  program: ProgramBantuan[];
  setTab: (tab: Tab) => void;
  statMap: Map<string, { value: number; label: string }>;
  villageName: string;
}) {
  return (
    <div className="mt-7 space-y-7">
      <HeroBanner villageName={villageName} />
      <ServicesGrid setTab={setTab} />
      <QuickInfo statMap={statMap} dtks={dtks} />
      <SectionHeader title="Berita Terbaru" onClick={() => setTab("info")} />
      <NewsList items={artikel.slice(0, 2)} />
      <SectionHeader title="Agenda Desa" onClick={() => setTab("info")} />
      <AgendaCard />
      <HelpCard primaryProgram={program[0]} />
    </div>
  );
}

function HeroBanner({ villageName }: { villageName: string }) {
  return (
    <section className="relative h-[238px] overflow-hidden rounded-[26px] bg-slate-800">
      <img src={HERO_IMAGE} alt="Pemandangan sawah dan desa" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/30 to-transparent" />
      <div className="relative flex h-full flex-col justify-between px-5 py-6 text-white">
        <div>
          <p className="text-[21px] font-bold leading-tight">Selamat Datang di</p>
          <h2 className="mt-1 max-w-[330px] text-[31px] font-bold leading-[1.05] tracking-normal">Desa {villageName}</h2>
          <p className="mt-3 max-w-[275px] text-[16px] font-semibold leading-6 text-white/95">
            Layanan desa dalam genggaman. Informasi cepat, layanan mudah.
          </p>
        </div>
        <div className="flex items-end justify-between">
          <button className="inline-flex h-14 items-center gap-3 rounded-[18px] bg-white px-6 text-[16px] font-bold text-emerald-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)]">
            Selengkapnya <ChevronRight size={22} />
          </button>
          <div className="mb-2 flex gap-2">
            <span className="h-2.5 w-7 rounded-full bg-white" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/55" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/55" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/55" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ServicesGrid({ setTab }: { setTab: (tab: Tab) => void }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-4 gap-x-2 gap-y-5">
        {serviceItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} className="group grid min-h-[74px] place-items-center gap-2 text-center" onClick={() => setTab(item.target)}>
              <span className={`grid h-14 w-14 place-items-center rounded-2xl ${toneClass(item.tone)}`}>
                <Icon size={28} strokeWidth={2.4} />
              </span>
              <span className="text-[13px] font-semibold leading-tight text-slate-950">{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function QuickInfo({ statMap, dtks }: { statMap: Map<string, { value: number; label: string }>; dtks: Dtks | null }) {
  const stats = [
    { key: "penduduk_aktif" as StatKey, label: "Penduduk", value: statValue(statMap, "penduduk_aktif"), unit: "Jiwa", icon: UsersRound, tone: "green" },
    { key: "keluarga" as StatKey, label: "Keluarga", value: statValue(statMap, "keluarga"), unit: "KK", icon: UsersRound, tone: "blue" },
    { key: "wilayah" as StatKey, label: "RT/RW", value: statValue(statMap, "wilayah"), unit: "Wilayah", icon: Building2, tone: "orange" },
    { key: "dtks" as StatKey, label: "DTKS", value: dtks?.ruta ?? statValue(statMap, "dtks"), unit: "Ruta", icon: CircleDollarSign, tone: "green" },
  ];

  return (
    <section>
      <SectionHeader title="Info Cepat" />
      <div className="-mx-6 mt-3 flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.key} className="flex h-[95px] min-w-[180px] items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${toneClass(item.tone)}`}>
                <Icon size={28} />
              </span>
              <div>
                <p className="text-[13px] font-medium text-slate-500">{item.label}</p>
                <strong className="mt-1 block text-[21px] font-bold leading-none text-emerald-700">{formatNumber(item.value)}</strong>
                <span className="mt-1 block text-[13px] font-medium text-slate-500">{item.unit}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ServicesScreen({
  pembangunan,
  program,
  setTab,
}: {
  pembangunan: Pembangunan[];
  program: ProgramBantuan[];
  setTab: (tab: Tab) => void;
}) {
  return (
    <div className="mt-7 space-y-6">
      <ServicesGrid setTab={setTab} />
      <Panel title="Layanan Prioritas">
        <LargeService title="Pengurusan Surat Keterangan" copy="Ajukan surat secara online, pantau status, lalu unduh arsip ketika selesai." icon={FileText} onClick={() => setTab("account")} />
        <LargeService title="Program Bantuan" copy={`${formatNumber(program[0]?.jumlahPeserta ?? 0)} peserta terdata pada program prioritas.`} icon={CircleDollarSign} onClick={() => setTab("info")} />
      </Panel>
      <Panel title="Pembangunan Desa">
        {pembangunan.slice(0, 3).map((item) => <DevelopmentRow key={item.id} item={item} />)}
        {!pembangunan.length ? <Empty text="Data pembangunan belum tersedia" /> : null}
      </Panel>
    </div>
  );
}

function InfoScreen({
  artikel,
  dtks,
  pembangunan,
  statMap,
}: {
  artikel: Artikel[];
  dtks: Dtks | null;
  pembangunan: Pembangunan[];
  statMap: Map<string, { value: number; label: string }>;
}) {
  return (
    <div className="mt-7 space-y-6">
      <QuickInfo statMap={statMap} dtks={dtks} />
      <Panel title="Berita Desa">
        <NewsList items={artikel} />
      </Panel>
      <Panel title="Agenda Desa">
        <AgendaCard />
      </Panel>
      <Panel title="Pembangunan">
        {pembangunan.slice(0, 4).map((item) => <DevelopmentRow key={item.id} item={item} />)}
        {!pembangunan.length ? <Empty text="Data pembangunan belum tersedia" /> : null}
      </Panel>
    </div>
  );
}

function AccountScreen({
  arsip,
  loading,
  onChanged,
  onNotice,
  permohonan,
  setUser,
  templates,
  user,
}: {
  arsip: ArsipSurat[];
  loading: boolean;
  onChanged: () => Promise<void>;
  onNotice: (message: string | null) => void;
  permohonan: PermohonanSurat[];
  setUser: (user: MandiriUser | null) => void;
  templates: SuratTemplate[];
  user: MandiriUser | null;
}) {
  if (!user) {
    return (
      <div className="mt-7">
        <LoginPanel setUser={setUser} onChanged={onChanged} onNotice={onNotice} />
      </div>
    );
  }

  return (
    <div className="mt-7 space-y-6">
      <section className="rounded-[24px] bg-emerald-700 p-5 text-white shadow-[0_10px_26px_rgba(15,138,67,0.18)]">
        <p className="text-sm font-semibold text-white/80">Layanan Mandiri</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold tracking-normal">{user.nama}</h2>
            <p className="mt-1 text-sm font-medium text-white/80">{maskNik(user.nik)}</p>
          </div>
          <button
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15"
            onClick={async () => {
              await apiPost("/mandiri/auth/keluar", {});
              setUser(null);
            }}
            aria-label="Keluar akun"
          >
            <LogOut size={22} />
          </button>
        </div>
      </section>
      {loading ? <LoadingState compact /> : null}
      <SuratForm templates={templates} onChanged={onChanged} onNotice={onNotice} />
      <Panel title="Permohonan Surat">
        {permohonan.length ? permohonan.map((item) => <PermohonanRow key={item.id} item={item} onChanged={onChanged} onNotice={onNotice} />) : <Empty text="Belum ada permohonan" />}
      </Panel>
      <Panel title="Arsip Surat">
        {arsip.length ? arsip.map((item) => <ArsipRow key={item.id} item={item} />) : <Empty text="Belum ada arsip" />}
      </Panel>
    </div>
  );
}

function NewsList({ items }: { items: Artikel[] }) {
  if (!items.length) return <Empty text="Berita belum tersedia" />;
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      {items.map((item, index) => (
        <article key={item.id} className="grid min-h-[110px] grid-cols-[86px_1fr_24px] items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
          <img
            src={item.gambarUrl ?? `${HERO_IMAGE}&sig=${item.id}`}
            alt=""
            className="h-[78px] w-[86px] rounded-2xl object-cover"
          />
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {index % 2 === 0 ? "Pembangunan" : "Pemerintahan"}
            </span>
            <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-slate-950">{item.judul}</h3>
            <p className="mt-2 text-[13px] font-medium text-slate-500">{item.tanggal ?? "Tanggal belum tersedia"}</p>
          </div>
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Buka ${item.judul}`} className="text-slate-600">
            <ChevronRight size={24} />
          </a>
        </article>
      ))}
    </div>
  );
}

function AgendaCard() {
  return (
    <article className="flex min-h-[112px] items-center gap-4 rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4">
      <div className="grid h-[78px] w-[72px] shrink-0 place-items-center rounded-2xl bg-white/70 text-center text-emerald-700">
        <strong className="block text-[28px] leading-none">{fallbackAgenda.date}</strong>
        <span className="block text-[12px] font-bold uppercase leading-tight">{fallbackAgenda.month}</span>
        <span className="block text-[12px] font-bold leading-tight">{fallbackAgenda.year}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-[17px] font-bold leading-tight text-slate-950">{fallbackAgenda.title}</h3>
        <p className="mt-2 flex items-center gap-2 text-[14px] font-medium text-slate-500"><MapPin size={17} /> {fallbackAgenda.place}</p>
        <p className="mt-1 flex items-center gap-2 text-[14px] font-medium text-slate-500"><CalendarDays size={17} /> {fallbackAgenda.time}</p>
      </div>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
        <CalendarDays size={26} />
      </span>
    </article>
  );
}

function HelpCard({ primaryProgram }: { primaryProgram: ProgramBantuan | undefined }) {
  return (
    <article className="flex items-center gap-4 rounded-[22px] border border-emerald-100 bg-emerald-50/60 p-4">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
        <Headphones size={28} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] font-bold leading-tight text-slate-950">Butuh Bantuan?</h3>
        <p className="mt-1 text-[14px] font-medium leading-snug text-slate-500">
          {primaryProgram?.nama ? `Informasi ${primaryProgram.nama.toLowerCase()} dan layanan desa.` : "Hubungi perangkat desa untuk informasi lebih lanjut."}
        </p>
      </div>
      <a className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-emerald-700 px-4 text-[14px] font-bold text-white" href="https://wa.me/" target="_blank" rel="noreferrer">
        <MessageCircle size={19} /> Hubungi
      </a>
    </article>
  );
}

function LoginPanel({
  setUser,
  onChanged,
  onNotice,
}: {
  setUser: (user: MandiriUser | null) => void;
  onChanged: () => Promise<void>;
  onNotice: (message: string | null) => void;
}) {
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
    <form className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]" onSubmit={submit}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
        <ShieldCheck size={30} />
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-normal text-slate-950">Masuk Layanan Mandiri</h2>
      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">Gunakan NIK dan PIN untuk mengurus surat serta melihat arsip layanan.</p>
      <label className="mt-5 block text-sm font-semibold text-slate-600">
        NIK
        <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-emerald-600" value={nik} onChange={(event) => setNik(event.target.value)} inputMode="numeric" autoComplete="username" />
      </label>
      <label className="mt-4 block text-sm font-semibold text-slate-600">
        PIN
        <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-emerald-600" value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete="current-password" />
      </label>
      <button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-base font-bold text-white disabled:opacity-60" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />} Masuk
      </button>
    </form>
  );
}

function SuratForm({
  templates,
  onChanged,
  onNotice,
}: {
  templates: SuratTemplate[];
  onChanged: () => Promise<void>;
  onNotice: (message: string | null) => void;
}) {
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
      await apiPost("/mandiri/surat/permohonan", {
        id_surat: selected.id,
        no_hp_aktif: phone,
        keterangan,
        isian_form: { keperluan },
        syarat,
      });
      setKeterangan("");
      setKeperluan("");
      setPhone("");
      await onChanged();
      onNotice("Permohonan surat tersimpan.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Permohonan belum bisa dibuat.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]" onSubmit={submit}>
      <h2 className="text-xl font-bold tracking-normal text-slate-950">Permohonan Surat</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">{templates.length} template tersedia</p>
      <select className="mt-4 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-emerald-600" value={idSurat} onChange={(event) => setIdSurat(event.target.value)} required>
        <option value="">Pilih template</option>
        {templates.map((item) => <option value={item.id} key={item.id}>{item.nama}</option>)}
      </select>
      <input className="mt-3 h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-emerald-600" placeholder="No. HP aktif" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" required />
      <textarea className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-emerald-600" placeholder="Keperluan" value={keperluan} onChange={(event) => setKeperluan(event.target.value)} />
      <input className="mt-3 h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-emerald-600" placeholder="Keterangan tambahan" value={keterangan} onChange={(event) => setKeterangan(event.target.value)} />
      {selected?.syarat.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.syarat.map((item) => <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700" key={item.id}>{item.nama ?? `Syarat ${item.id}`}: fisik</span>)}
        </div>
      ) : null}
      <button className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-base font-bold text-white disabled:opacity-60" disabled={busy || !selected}>
        {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Kirim Permohonan
      </button>
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
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-950">{item.nama_surat}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">{item.created_at}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{item.status.label}</span>
      </div>
      {canCancel ? (
        <button className="mt-3 h-10 rounded-xl bg-white px-3 text-sm font-bold text-red-600" onClick={cancel}>Batalkan</button>
      ) : null}
    </div>
  );
}

function ArsipRow({ item }: { item: ArsipSurat }) {
  return (
    <a className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4" href={item.cetak_url} target="_blank" rel="noreferrer">
      <div className="min-w-0">
        <h3 className="line-clamp-1 text-[15px] font-bold text-slate-950">{item.nama_surat ?? item.nama_format ?? "Surat"}</h3>
        <p className="mt-1 text-sm font-medium text-slate-500">{item.no_surat ?? item.tanggal}</p>
      </div>
      <ChevronRight size={23} className="shrink-0 text-slate-500" />
    </a>
  );
}

function DevelopmentRow({ item }: { item: Pembangunan }) {
  return (
    <article className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <img src={item.fotoUrl ?? HERO_IMAGE} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-950">{item.judul}</h3>
        <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-slate-500">{item.lokasi ?? item.ringkasan}</p>
        <p className="mt-2 text-sm font-bold text-emerald-700">{rupiah(item.anggaran)}</p>
      </div>
    </article>
  );
}

function LargeService({ title, copy, icon: Icon, onClick }: { title: string; copy: string; icon: typeof Home; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-4 rounded-2xl bg-slate-50 p-4 text-left" onClick={onClick}>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
        <Icon size={27} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[16px] leading-snug text-slate-950">{title}</strong>
        <span className="mt-1 block text-sm font-medium leading-snug text-slate-500">{copy}</span>
      </span>
      <ChevronRight size={23} className="shrink-0 text-slate-500" />
    </button>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <h2 className="text-[20px] font-bold tracking-normal text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function SectionHeader({ title, onClick }: { title: string; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-[22px] font-bold leading-tight tracking-normal text-slate-950">{title}</h2>
      {onClick ? (
        <button className="inline-flex items-center gap-1 text-[14px] font-bold text-emerald-700" onClick={onClick}>
          Lihat Semua <ChevronRight size={19} />
        </button>
      ) : null}
    </div>
  );
}

function BottomNavigation({ current, setTab }: { current: Tab; setTab: (tab: Tab) => void }) {
  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-24px)] max-w-[406px] -translate-x-1/2 rounded-[28px] border border-slate-100 bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.09)] backdrop-blur" aria-label="Navigasi bawah">
      <div className="grid grid-cols-4">
        {bottomTabs.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button key={item.key} className={`grid min-h-[54px] place-items-center gap-1 text-[12px] font-semibold ${active ? "text-emerald-700" : "text-slate-500"}`} onClick={() => setTab(item.key)}>
              <Icon size={25} fill={active ? "currentColor" : "none"} strokeWidth={active ? 2.3 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function LoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid place-items-center rounded-[22px] border border-slate-200 bg-white text-sm font-semibold text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)] ${compact ? "min-h-20" : "mt-7 min-h-52"}`}>
      <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Memuat data desa</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="grid min-h-20 place-items-center rounded-2xl bg-slate-50 px-4 text-center text-sm font-semibold text-slate-500">{text}</div>;
}

function statValue(statMap: Map<string, { value: number }>, key: StatKey) {
  return statMap.get(key)?.value ?? 0;
}

function toneClass(tone: string) {
  switch (tone) {
    case "blue":
      return "bg-blue-50 text-blue-600";
    case "orange":
      return "bg-orange-50 text-orange-600";
    case "purple":
      return "bg-purple-50 text-purple-600";
    case "red":
      return "bg-red-50 text-red-500";
    case "yellow":
      return "bg-amber-50 text-amber-500";
    default:
      return "bg-emerald-50 text-emerald-700";
  }
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
