import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Database,
  Eye,
  FileArchive,
  FileText,
  Grid2X2,
  Headphones,
  Home,
  Landmark,
  ListChecks,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  MessageCircle,
  Newspaper,
  PhoneCall,
  Scale,
  Send,
  ShieldCheck,
  Siren,
  Store,
  WalletCards,
  X,
  UsersRound,
} from "lucide-react";
import { apiGet, apiPost } from "./api";
import type {
  AdminDTKSDetail,
  AdminDTKSItem,
  AdminDTKSList,
  AdminDTKSSeedResult,
  AdminUser,
  ArsipSurat,
  Artikel,
  Dtks,
  MandiriUser,
  Pembangunan,
  PermohonanSurat,
  ProgramBantuan,
  PublicInitialData,
  Ringkasan,
  SuratTemplate,
} from "./api";

type Tab = "home" | "services" | "info" | "account";
const publicRouteKeys = [
  "profil",
  "pemerintah-desa",
  "struktur-organisasi",
  "apbdes",
  "perencanaan",
  "program",
  "produk-hukum",
  "ppid",
  "dip",
  "data-desa",
  "berita",
  "pengumuman",
  "pengaduan",
  "mobil-siaga",
  "darurat",
] as const;

export type PublicRouteKey = (typeof publicRouteKeys)[number];
export type PageRoute = "portal" | "dtks" | PublicRouteKey;
type DrawerKind = "services" | "information";
type MenuTarget = PublicRouteKey | "dtks" | "account";
type ServiceTarget = MenuTarget;
type StatKey = "penduduk_aktif" | "keluarga" | "wilayah" | "permohonan_baru" | "surat_tercetak" | "dtks";

type AppProps = {
  initialData?: PublicInitialData;
  initialRoute?: PageRoute;
};

const HERO_IMAGE = "/hero-sawah.webp";
const HERO_IMAGE_SRCSET = "/hero-sawah-384.webp 384w, /hero-sawah.webp 480w";
const HERO_IMAGE_SIZES = "(max-width: 425px) calc(100vw - 32px), 393px";

const publicRouteSet = new Set<string>(publicRouteKeys);

const serviceItems: Array<{ label: string; icon: typeof Home; tone: string; target: ServiceTarget }> = [
  { label: "Surat Online", icon: FileText, tone: "green", target: "account" },
  { label: "Pengaduan", icon: MessageCircle, tone: "orange", target: "pengaduan" },
  { label: "Berita Desa", icon: Newspaper, tone: "blue", target: "berita" },
  { label: "Agenda", icon: CalendarDays, tone: "purple", target: "pengumuman" },
  { label: "UMKM", icon: Store, tone: "green", target: "program" },
  { label: "Data Desa", icon: UsersRound, tone: "blue", target: "data-desa" },
  { label: "Pengumuman", icon: Megaphone, tone: "red", target: "pengumuman" },
  { label: "Lainnya", icon: Grid2X2, tone: "yellow", target: "profil" },
];

const serviceCopy: Record<string, string> = {
  "Surat Online": "Ajukan surat mandiri",
  Pengaduan: "Kirim laporan warga",
  "Berita Desa": "Kabar terbaru",
  Agenda: "Jadwal kegiatan",
  UMKM: "Produk dan bantuan",
  "Data Desa": "Statistik publik",
  Pengumuman: "Informasi resmi",
  Lainnya: "Profil dan dokumen",
};

const serviceDrawerItems: Array<{ label: string; description: string; icon: typeof Home; tone: string; target: MenuTarget }> = [
  { label: "Surat Online", description: "Layanan mandiri", icon: FileText, tone: "green", target: "account" },
  { label: "Pengaduan", description: "Aspirasi warga", icon: MessageCircle, tone: "orange", target: "pengaduan" },
  { label: "Mobil Siaga", description: "Kontak cepat", icon: PhoneCall, tone: "green", target: "mobil-siaga" },
  { label: "Darurat", description: "Info penting", icon: Siren, tone: "red", target: "darurat" },
  { label: "Program", description: "Kegiatan desa", icon: ClipboardList, tone: "blue", target: "program" },
];

const informationDrawerItems: Array<{ label: string; description: string; icon: typeof Home; tone: string; target: MenuTarget }> = [
  { label: "Profil Desa", description: "Identitas wilayah", icon: Landmark, tone: "green", target: "profil" },
  { label: "Pemerintah", description: "Perangkat desa", icon: Building2, tone: "blue", target: "pemerintah-desa" },
  { label: "Struktur", description: "Organisasi", icon: UsersRound, tone: "green", target: "struktur-organisasi" },
  { label: "APBDes", description: "Anggaran", icon: WalletCards, tone: "orange", target: "apbdes" },
  { label: "RPJM/RKP", description: "Perencanaan", icon: BookOpen, tone: "purple", target: "perencanaan" },
  { label: "Produk Hukum", description: "Regulasi desa", icon: Scale, tone: "blue", target: "produk-hukum" },
  { label: "PPID", description: "Info publik", icon: ShieldCheck, tone: "green", target: "ppid" },
  { label: "DIP", description: "Daftar informasi", icon: FileArchive, tone: "orange", target: "dip" },
  { label: "Data Desa", description: "Statistik", icon: Database, tone: "blue", target: "data-desa" },
  { label: "Berita", description: "Kabar terbaru", icon: Newspaper, tone: "green", target: "berita" },
  { label: "Pengumuman", description: "Informasi resmi", icon: Megaphone, tone: "red", target: "pengumuman" },
];

const publicPageConfig: Record<PublicRouteKey, { eyebrow: string; title: string; description: string; icon: typeof Home; tone: string }> = {
  profil: {
    eyebrow: "Profil Desa",
    title: "Profil Desa",
    description: "Identitas, wilayah, alamat, dan kontak publik desa.",
    icon: Landmark,
    tone: "green",
  },
  "pemerintah-desa": {
    eyebrow: "Pemerintahan",
    title: "Pemerintah Desa",
    description: "Ringkasan pemerintah desa dan perangkat pelayanan warga.",
    icon: Building2,
    tone: "blue",
  },
  "struktur-organisasi": {
    eyebrow: "Organisasi",
    title: "Struktur Organisasi",
    description: "Susunan organisasi pemerintah desa dari data pamong OpenSID.",
    icon: UsersRound,
    tone: "green",
  },
  apbdes: {
    eyebrow: "Transparansi",
    title: "APBDes & Realisasi",
    description: "Informasi anggaran desa, realisasi, dan ringkasan belanja publik.",
    icon: WalletCards,
    tone: "orange",
  },
  perencanaan: {
    eyebrow: "Perencanaan",
    title: "RPJMDes & RKPDes",
    description: "Dokumen rencana pembangunan jangka menengah dan tahunan desa.",
    icon: BookOpen,
    tone: "purple",
  },
  program: {
    eyebrow: "Kegiatan Desa",
    title: "Program & Kegiatan",
    description: "Program bantuan, pembangunan, dan kegiatan prioritas desa.",
    icon: ClipboardList,
    tone: "blue",
  },
  "produk-hukum": {
    eyebrow: "Regulasi",
    title: "Produk Hukum Desa",
    description: "Peraturan desa, keputusan kepala desa, dan dokumen hukum.",
    icon: Scale,
    tone: "blue",
  },
  ppid: {
    eyebrow: "Informasi Publik",
    title: "PPID Desa",
    description: "Pejabat Pengelola Informasi dan Dokumentasi tingkat desa.",
    icon: ShieldCheck,
    tone: "green",
  },
  dip: {
    eyebrow: "Dokumen Publik",
    title: "Daftar Informasi Publik",
    description: "Daftar informasi yang tersedia setiap saat, berkala, dan serta merta.",
    icon: FileArchive,
    tone: "orange",
  },
  "data-desa": {
    eyebrow: "Statistik",
    title: "Statistik Data Desa",
    description: "Data agregat penduduk, keluarga, wilayah, layanan, dan DTKS.",
    icon: Database,
    tone: "blue",
  },
  berita: {
    eyebrow: "Publikasi",
    title: "Berita Desa",
    description: "Berita terbaru, agenda kegiatan, dan kabar pembangunan desa.",
    icon: Newspaper,
    tone: "green",
  },
  pengumuman: {
    eyebrow: "Informasi Resmi",
    title: "Berita & Pengumuman",
    description: "Pengumuman resmi, agenda, dan informasi penting untuk warga.",
    icon: Megaphone,
    tone: "red",
  },
  pengaduan: {
    eyebrow: "Layanan Warga",
    title: "Layanan Pengaduan",
    description: "Kirim aspirasi, laporan, atau pertanyaan kepada perangkat desa.",
    icon: MessageCircle,
    tone: "orange",
  },
  "mobil-siaga": {
    eyebrow: "Bantuan Cepat",
    title: "Mobil Siaga",
    description: "Kontak mobil siaga dan bantuan transportasi darurat warga.",
    icon: PhoneCall,
    tone: "green",
  },
  darurat: {
    eyebrow: "Darurat",
    title: "Informasi Darurat",
    description: "Kontak cepat dan arahan awal saat kondisi mendesak.",
    icon: Siren,
    tone: "red",
  },
};

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
  status: "terdata",
  ruta: 184,
  anggota: 642,
  lampiran: 38,
  rtm_terdaftar_dtks: 128,
  versi_kuisioner: [{ versi: "2025", jumlah: 184 }],
  catatan: "Ringkasan keluarga penerima manfaat dan rumah tangga sasaran.",
};

const fallbackRingkasan: Ringkasan = {
  profil: {
    nama: "Yamansari",
    kode: { desa: "3328062005", kecamatan: "332806", kabupaten: "3328", provinsi: "33" },
    wilayah: { desa: "Yamansari", kecamatan: "Lebaksiu", kabupaten: "Tegal", provinsi: "Jawa Tengah" },
    alamat: "Desa Yamansari, Kecamatan Lebaksiu, Kabupaten Tegal",
    kontak: { telepon: "0283 619 2025", email: "pemdes@yamansari.desa.id", website: "https://yamansari.desa.id" },
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
    gambarUrl: "/article-gotong.webp",
    url: "#",
    jumlahDilihat: 128,
  },
  {
    id: 2,
    judul: "Musdes Bahas RKPDes 2026 Desa Yamansari",
    ringkasan: "Musyawarah desa membahas prioritas kerja dan pelayanan warga.",
    tanggal: "18 Mei 2025",
    gambarUrl: "/article-musdes.webp",
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

const dummyOfficials = [
  { role: "Kepala Desa", name: "Bapak Ahmad Suryono", area: "Pimpinan penyelenggaraan pemerintahan desa", phone: "0812 2606 0001" },
  { role: "Sekretaris Desa", name: "Ibu Rina Wulandari", area: "Koordinasi administrasi dan PPID desa", phone: "0812 2606 0002" },
  { role: "Kaur Perencanaan", name: "Bapak Dedi Prasetyo", area: "RPJMDes, RKPDes, dan pelaporan program", phone: "0812 2606 0003" },
  { role: "Kasi Pemerintahan", name: "Ibu Siti Nurhayati", area: "Data penduduk, wilayah, dan pelayanan umum", phone: "0812 2606 0004" },
  { role: "Kepala Dusun I", name: "Bapak Wahyu Setiawan", area: "Wilayah Kadus I, RT 001-004", phone: "0812 2606 0005" },
];

const dummyBudgetRows = [
  { label: "Pendapatan Desa", value: 2450000000, percent: 100, note: "Pagu APBDes 2025" },
  { label: "Belanja Desa", value: 2185000000, percent: 64, note: "Realisasi berjalan" },
  { label: "Pembangunan Desa", value: 820000000, percent: 58, note: "Jalan lingkungan, drainase, dan sarpras" },
  { label: "Pembinaan & Pemberdayaan", value: 365000000, percent: 72, note: "Kelembagaan, UMKM, dan pelatihan warga" },
];

const dummyPlanningDocs = [
  { title: "RPJMDes Yamansari 2020-2026", category: "RPJMDes", date: "12 Jan 2025", status: "Tersedia" },
  { title: "RKPDes Yamansari Tahun 2025", category: "RKPDes", date: "21 Feb 2025", status: "Tersedia" },
  { title: "Daftar Usulan RKPDes 2026", category: "DU-RKP", date: "18 Mei 2025", status: "Draft musdes" },
];

const dummyLawDocs = [
  { title: "Perdes APBDes Tahun Anggaran 2025", category: "Peraturan Desa", date: "03 Jan 2025", status: "Berlaku" },
  { title: "Perkades Penjabaran APBDes 2025", category: "Peraturan Kepala Desa", date: "07 Jan 2025", status: "Berlaku" },
  { title: "SK Tim Pelaksana Kegiatan Desa", category: "Keputusan Kepala Desa", date: "16 Feb 2025", status: "Berlaku" },
];

const dummyDipItems = [
  { title: "Profil desa dan struktur pemerintahan", category: "Berkala", date: "Update semester", status: "Publik" },
  { title: "APBDes, realisasi, dan laporan kegiatan", category: "Berkala", date: "Update triwulan", status: "Publik" },
  { title: "Daftar peraturan desa dan keputusan kepala desa", category: "Setiap saat", date: "Update bila berubah", status: "Publik" },
  { title: "Informasi darurat dan mobil siaga", category: "Serta merta", date: "Update cepat", status: "Publik" },
];

const dummyAnnouncements = [
  { title: "Pelayanan administrasi pindah sementara ke aula desa", date: "25 Mei 2025", category: "Pelayanan", copy: "Loket pelayanan tetap buka pukul 08.00-14.00 WIB selama penataan ruang kantor." },
  { title: "Musyawarah dusun penyusunan usulan RKPDes", date: "28 Mei 2025", category: "Perencanaan", copy: "Warga dapat menyampaikan usulan kegiatan melalui ketua RT/RW masing-masing." },
  { title: "Jadwal pembayaran PBB kolektif tahap pertama", date: "02 Jun 2025", category: "Pajak", copy: "Pembayaran kolektif dilayani di balai desa dan pos pelayanan wilayah." },
];

const dummyPpidServices = [
  { label: "Pejabat PPID", value: "Sekretaris Desa Yamansari" },
  { label: "Desk Layanan", value: "Kantor Desa, Senin-Jumat 08.00-14.00 WIB" },
  { label: "Waktu Respon", value: "Maksimal 10 hari kerja untuk permohonan informasi" },
  { label: "Kanal Kontak", value: "ppid@yamansari.desa.id / 0283 619 2025" },
];

const dummyEmergencyContacts = [
  { label: "Mobil Siaga Desa", value: "0812 2606 1122", note: "Rujukan kesehatan dan kondisi mendesak" },
  { label: "Kantor Desa", value: "0283 619 2025", note: "Koordinasi pelayanan umum" },
  { label: "Bidan Desa", value: "0812 2606 1199", note: "Kesehatan ibu, anak, dan lansia" },
];

export default function App({ initialData, initialRoute }: AppProps = {}) {
  const hasInitialPublicData = Boolean(initialData?.ringkasan || initialData?.artikel || initialData?.pembangunan || initialData?.program || initialData?.dtks);
  const [route, setRoute] = useState<PageRoute>(() => initialRoute ?? routeFromLocation());
  const [tab, setTab] = useState<Tab>("home");
  const [ringkasan, setRingkasan] = useState<Ringkasan>(initialData?.ringkasan ?? fallbackRingkasan);
  const [artikel, setArtikel] = useState<Artikel[]>(initialData?.artikel ?? fallbackArtikel);
  const [pembangunan, setPembangunan] = useState<Pembangunan[]>(initialData?.pembangunan ?? fallbackPembangunan);
  const [program, setProgram] = useState<ProgramBantuan[]>(initialData?.program ?? fallbackProgram);
  const [dtks, setDtks] = useState<Dtks>(initialData?.dtks ?? fallbackDtks);
  const [user, setUser] = useState<MandiriUser | null>(null);
  const [templates, setTemplates] = useState<SuratTemplate[]>([]);
  const [permohonan, setPermohonan] = useState<PermohonanSurat[]>([]);
  const [arsip, setArsip] = useState<ArsipSurat[]>([]);
  const [mandiriLoading, setMandiriLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerKind | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const publicLoadedRef = useRef(hasInitialPublicData);

  const loadPublic = useCallback(async () => {
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
      setRingkasan(fallbackRingkasan);
      setArtikel(fallbackArtikel);
      setPembangunan(fallbackPembangunan);
      setProgram(fallbackProgram);
      setDtks(fallbackDtks);
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
    const timer = window.setTimeout(() => {
      void loadPublic();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadPublic]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(routeFromLocation());
      setDrawer(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawer]);

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

  const goPortal = useCallback((nextTab: Tab = "home") => {
    setTab(nextTab);
    setRoute("portal");
    setDrawer(null);
    if (window.location.pathname !== "/") {
      window.history.pushState(null, "", "/");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openDtksDashboard = useCallback(() => {
    setRoute("dtks");
    setDrawer(null);
    if (window.location.pathname !== "/dtks") {
      window.history.pushState(null, "", "/dtks");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openPublicRoute = useCallback((nextRoute: PublicRouteKey) => {
    setRoute(nextRoute);
    setDrawer(null);
    const path = routePath(nextRoute);
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const navigateMenu = useCallback((target: MenuTarget) => {
    if (target === "account") {
      goPortal("account");
      return;
    }
    if (target === "dtks") {
      openDtksDashboard();
      return;
    }
    openPublicRoute(target);
  }, [goPortal, openDtksDashboard, openPublicRoute]);

  useRouteMetadata(route, villageName);
  const activeBottomTab = bottomTabForRoute(route, tab);

  if (route === "dtks") {
    return <DtksDashboardPage dtks={dtks} location={location} onBack={() => goPortal("home")} villageName={villageName} />;
  }

  return (
    <main className="min-h-screen bg-[#f3f6f2] text-slate-950 md:py-4">
      <section className="relative mx-auto min-h-dvh w-full max-w-[425px] overflow-x-hidden bg-[#f8faf7] md:min-h-[calc(100dvh-32px)] md:rounded-[26px] md:border md:border-slate-200 md:shadow-[0_18px_48px_rgba(15,23,42,0.10)]">
        <div className="px-4 pb-28 pt-4 max-[375px]:px-3">
          {route === "portal" && tab === "home" ? (
            <HomeTop location={location} onNavigate={navigateMenu} villageName={villageName} />
          ) : (
            <VillageHeader villageName={villageName} location={location} logoUrl={ringkasan?.profil.logoUrl} />
          )}

          {notice ? (
            <button
              className="mt-4 w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-900"
              onClick={() => setNotice(null)}
            >
              {notice}
            </button>
          ) : null}

          {isPublicRoute(route) ? (
            <PublicFeaturePage
              artikel={artikel}
              dtks={dtks}
              location={location}
              onBack={() => goPortal("home")}
              onNavigate={navigateMenu}
              onNotice={setNotice}
              pembangunan={pembangunan}
              program={program}
              ringkasan={ringkasan}
              route={route}
              statMap={statMap}
              villageName={villageName}
            />
          ) : null}

          {route === "portal" && tab === "home" ? (
            <HomeScreen
              artikel={artikel}
              dtks={dtks}
              onNavigate={navigateMenu}
              program={program}
              statMap={statMap}
            />
          ) : null}
          {route === "portal" && tab === "services" ? (
            <ServicesScreen onNavigate={navigateMenu} pembangunan={pembangunan} program={program} />
          ) : null}
          {route === "portal" && tab === "info" ? (
            <InfoScreen artikel={artikel} dtks={dtks} pembangunan={pembangunan} statMap={statMap} />
          ) : null}
          {route === "portal" && tab === "account" ? (
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
        </div>

        <BottomNavigation
          current={activeBottomTab}
          onAccount={() => goPortal("account")}
          onHome={() => goPortal("home")}
          onInfo={() => setDrawer("information")}
          onServices={() => setDrawer("services")}
        />
        <PublicMenuDrawer kind={drawer} onClose={() => setDrawer(null)} onNavigate={navigateMenu} />
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
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={logoUrl ?? "/yamansari-mark.svg"}
          alt="Lambang desa"
          className="h-11 w-11 shrink-0 rounded-xl border border-emerald-100 bg-white object-contain p-1 shadow-sm"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Portal Desa</p>
          <h1 className="truncate text-[22px] font-bold leading-tight tracking-normal text-slate-950">Desa {villageName}</h1>
          <p className="truncate text-[13px] font-semibold leading-snug text-slate-500">{location}</p>
        </div>
      </div>
      <button className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-emerald-700 shadow-sm" aria-label="Notifikasi">
        <Bell size={20} />
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">3</span>
      </button>
    </header>
  );
}

function HomeTop({
  location,
  onNavigate,
  villageName,
}: {
  location: string;
  onNavigate: (target: MenuTarget) => void;
  villageName: string;
}) {
  return (
    <header className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-emerald-700">Desa Digital</p>
          <h1 className="mt-1 truncate text-[30px] font-bold leading-none tracking-normal text-slate-950 max-[375px]:text-[27px]">{villageName}</h1>
          <p className="mt-2 truncate text-[14px] font-semibold text-slate-500">{location}</p>
        </div>
        <button className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-emerald-700 shadow-sm" aria-label="Notifikasi">
          <Bell size={20} />
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">3</span>
        </button>
      </div>

      <section className="rounded-[28px] bg-emerald-800 p-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-emerald-100">Layanan Desa</p>
            <h2 className="mt-2 max-w-[260px] text-[24px] font-bold leading-tight tracking-normal max-[375px]:text-[22px]">
              Urus informasi desa tanpa datang ke kantor
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-white/14 px-3 py-1 text-[11px] font-bold text-white">2025</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[13px] font-bold text-emerald-800" onClick={() => onNavigate("pengaduan")}>
            Pengaduan <ChevronRight size={17} />
          </button>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-3 text-[13px] font-bold text-white ring-1 ring-white/18" onClick={() => onNavigate("profil")}>
            Profil Desa <ChevronRight size={17} />
          </button>
        </div>
      </section>
    </header>
  );
}

function HomeScreen({
  artikel,
  dtks,
  onNavigate,
  program,
  statMap,
}: {
  artikel: Artikel[];
  dtks: Dtks | null;
  onNavigate: (target: MenuTarget) => void;
  program: ProgramBantuan[];
  statMap: Map<string, { value: number; label: string }>;
}) {
  return (
    <div className="mt-5 space-y-6">
      <ServicesGrid onNavigate={onNavigate} />
      <QuickInfo statMap={statMap} dtks={dtks} />
      <SectionHeader title="Berita Terbaru" onClick={() => onNavigate("berita")} />
      <NewsList items={artikel.slice(0, 2)} />
      <SectionHeader title="Agenda Desa" onClick={() => onNavigate("pengumuman")} />
      <AgendaCard />
      <HelpCard primaryProgram={program[0]} />
    </div>
  );
}

function ServicesGrid({ onNavigate }: { onNavigate: (target: MenuTarget) => void }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold leading-tight text-slate-950">Layanan Utama</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">Akses cepat untuk kebutuhan warga</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">Publik</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {serviceItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 text-left transition active:scale-[0.99]"
              onClick={() => onNavigate(item.target)}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass(item.tone)}`}>
                <Icon size={21} strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight text-slate-950">{item.label}</span>
                <span className="mt-1 block text-[11px] font-semibold leading-tight text-slate-500">{serviceCopy[item.label]}</span>
              </span>
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
      <div className="mt-3 grid grid-cols-2 gap-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.key} className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass(item.tone)}`}>
                <Icon size={21} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-slate-500">{item.label}</p>
                <strong className="mt-1 block text-[20px] font-bold leading-none text-slate-950">{formatNumber(item.value)}</strong>
                <span className="mt-1 block text-[11px] font-bold text-emerald-700">{item.unit}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ServicesScreen({
  onNavigate,
  pembangunan,
  program,
}: {
  onNavigate: (target: MenuTarget) => void;
  pembangunan: Pembangunan[];
  program: ProgramBantuan[];
}) {
  const displayPembangunan = pembangunan.length ? pembangunan : fallbackPembangunan;
  const displayProgram = program.length ? program : fallbackProgram;

  return (
    <div className="mt-7 space-y-6">
      <ServicesGrid onNavigate={onNavigate} />
      <Panel title="Layanan Prioritas">
        <LargeService title="Pengurusan Surat Keterangan" copy="Ajukan surat secara online, pantau status, lalu unduh arsip ketika selesai." icon={FileText} onClick={() => onNavigate("account")} />
        <LargeService title="Program Bantuan" copy={`${formatNumber(displayProgram[0]?.jumlahPeserta ?? 0)} peserta terdata pada program prioritas.`} icon={CircleDollarSign} onClick={() => onNavigate("program")} />
      </Panel>
      <Panel title="Pembangunan Desa">
        {displayPembangunan.slice(0, 3).map((item) => <DevelopmentRow key={item.id} item={item} />)}
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
  const displayPembangunan = pembangunan.length ? pembangunan : fallbackPembangunan;
  const displayArtikel = artikel.length ? artikel : fallbackArtikel;

  return (
    <div className="mt-7 space-y-6">
      <QuickInfo statMap={statMap} dtks={dtks} />
      <Panel title="Berita Desa">
        <NewsList items={displayArtikel} />
      </Panel>
      <Panel title="Agenda Desa">
        <AgendaCard />
      </Panel>
      <Panel title="Pembangunan">
        {displayPembangunan.slice(0, 4).map((item) => <DevelopmentRow key={item.id} item={item} />)}
      </Panel>
    </div>
  );
}

function PublicFeaturePage({
  artikel,
  dtks,
  location,
  onBack,
  onNavigate,
  onNotice,
  pembangunan,
  program,
  ringkasan,
  route,
  statMap,
  villageName,
}: {
  artikel: Artikel[];
  dtks: Dtks | null;
  location: string;
  onBack: () => void;
  onNavigate: (target: MenuTarget) => void;
  onNotice: (message: string | null) => void;
  pembangunan: Pembangunan[];
  program: ProgramBantuan[];
  ringkasan: Ringkasan;
  route: PublicRouteKey;
  statMap: Map<string, { value: number; label: string }>;
  villageName: string;
}) {
  const page = publicPageConfig[route];
  const Icon = page.icon;

  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <button className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-700" onClick={onBack}>
          <ArrowLeft size={17} /> Beranda
        </button>
        <div className="mt-4 flex items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${toneClass(page.tone)}`}>
            <Icon size={24} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">{page.eyebrow}</p>
            <h2 className="mt-1 text-[25px] font-bold leading-tight tracking-normal text-slate-950">{page.title}</h2>
            <p className="mt-2 text-[14px] font-semibold leading-6 text-slate-600">Desa {villageName} - {page.description}</p>
          </div>
        </div>
      </section>

      <PublicRouteContent
        artikel={artikel}
        dtks={dtks}
        location={location}
        onNavigate={onNavigate}
        onNotice={onNotice}
        pembangunan={pembangunan}
        program={program}
        ringkasan={ringkasan}
        route={route}
        statMap={statMap}
      />
    </div>
  );
}

function PublicRouteContent({
  artikel,
  dtks,
  location,
  onNavigate,
  onNotice,
  pembangunan,
  program,
  ringkasan,
  route,
  statMap,
}: {
  artikel: Artikel[];
  dtks: Dtks | null;
  location: string;
  onNavigate: (target: MenuTarget) => void;
  onNotice: (message: string | null) => void;
  pembangunan: Pembangunan[];
  program: ProgramBantuan[];
  ringkasan: Ringkasan;
  route: PublicRouteKey;
  statMap: Map<string, { value: number; label: string }>;
}) {
  const profil = ringkasan.profil;
  const phone = profil.kontak.telepon ?? "0283 619 2025";
  const email = profil.kontak.email ?? "pemdes@yamansari.desa.id";
  const website = profil.kontak.website ?? "https://yamansari.desa.id";
  const displayArtikel = artikel.length ? artikel : fallbackArtikel;
  const displayPembangunan = pembangunan.length ? pembangunan : fallbackPembangunan;
  const displayProgram = program.length ? program : fallbackProgram;
  const displayDtks = dtks ?? fallbackDtks;

  switch (route) {
    case "profil":
      return (
        <>
          <Panel title="Identitas Desa">
            <div className="grid grid-cols-2 gap-3">
              <MiniInfo label="Nama Desa" value={profil.nama} />
              <MiniInfo label="Kode Desa" value={profil.kode.desa ?? "-"} />
              <MiniInfo label="Kecamatan" value={profil.wilayah.kecamatan ?? "-"} />
              <MiniInfo label="Kabupaten" value={profil.wilayah.kabupaten ?? "-"} />
            </div>
            <PublicInfoCard icon={MapPin} title="Alamat Kantor Desa" copy={profil.alamat ?? `Desa ${profil.nama}, ${location}`} tone="green" />
          </Panel>
          <Panel title="Kontak Publik">
            <div className="grid grid-cols-1 gap-3">
              <MiniInfo label="Telepon" value={phone} />
              <MiniInfo label="Email" value={email} />
              <MiniInfo label="Website" value={website} />
            </div>
          </Panel>
        </>
      );
    case "pemerintah-desa":
      return (
        <>
          <PublicInfoCard
            icon={Building2}
            title="Pemerintah Desa"
            copy="Daftar perangkat desa, wilayah tugas, kontak pelayanan, dan kanal administrasi warga."
            tone="blue"
          />
          <Panel title="Perangkat Desa">
            {dummyOfficials.slice(0, 3).map((item) => <OfficialRow key={item.role} item={item} />)}
          </Panel>
          <Panel title="Pelayanan Pemerintah">
            <LargeService title="Layanan Mandiri" copy="Masuk untuk mengajukan surat dan melihat arsip layanan warga." icon={FileText} onClick={() => onNavigate("account")} />
            <LargeService title="Struktur Organisasi" copy="Lihat susunan organisasi pemerintah desa." icon={UsersRound} onClick={() => onNavigate("struktur-organisasi")} />
          </Panel>
        </>
      );
    case "struktur-organisasi":
      return (
        <Panel title="Struktur Organisasi">
          {dummyOfficials.map((item) => <OfficialRow key={item.role} item={item} />)}
        </Panel>
      );
    case "apbdes":
      return (
        <>
          <Panel title="Ringkasan Anggaran">
            <div className="grid grid-cols-2 gap-3">
              <MiniInfo label="APBDes" value={rupiah(dummyBudgetRows[0].value)} />
              <MiniInfo label="Realisasi" value={rupiah(dummyBudgetRows[1].value)} />
              <MiniInfo label="Tahun Anggaran" value="2025" />
              <MiniInfo label="Sumber" value="OpenSID Keuangan" />
            </div>
          </Panel>
          <Panel title="Realisasi Per Bidang">
            {dummyBudgetRows.map((item) => <BudgetRow key={item.label} item={item} />)}
          </Panel>
          <DocumentList title="Publikasi APBDes" copy="Dokumen anggaran desa, penjabaran APBDes, dan ringkasan realisasi untuk warga." icon={WalletCards} items={[dummyLawDocs[0], dummyLawDocs[1]]} />
        </>
      );
    case "perencanaan":
      return <DocumentList title="Dokumen RPJMDes & RKPDes" copy="Rencana pembangunan jangka menengah, rencana kerja tahunan, dan daftar usulan kegiatan desa." icon={BookOpen} items={dummyPlanningDocs} />;
    case "program":
      return (
        <>
          <Panel title="Program Bantuan">
            {displayProgram.slice(0, 4).map((item) => <ProgramRow key={item.id} item={item} />)}
          </Panel>
          <Panel title="Pembangunan Desa">
            {displayPembangunan.slice(0, 4).map((item) => <DevelopmentRow key={item.id} item={item} />)}
          </Panel>
        </>
      );
    case "produk-hukum":
      return <DocumentList title="Produk Hukum Desa" copy="Peraturan desa, peraturan kepala desa, dan keputusan kepala desa yang berlaku." icon={Scale} items={dummyLawDocs} />;
    case "ppid":
      return (
        <>
          <PublicInfoCard icon={ShieldCheck} title="PPID Desa" copy="Profil PPID, alur permohonan informasi, register layanan, dan kontak pengelola informasi publik." tone="green" />
          <Panel title="Profil PPID">
            <div className="grid grid-cols-1 gap-3">
              {dummyPpidServices.map((item) => <MiniInfo key={item.label} label={item.label} value={item.value} />)}
            </div>
          </Panel>
          <Panel title="Permohonan Informasi">
            <LargeService title="Ajukan Pengaduan atau Permohonan" copy="Gunakan kanal pengaduan untuk permintaan awal, lalu perangkat desa dapat menindaklanjuti." icon={MessageCircle} onClick={() => onNavigate("pengaduan")} />
          </Panel>
        </>
      );
    case "dip":
      return <DocumentList title="Daftar Informasi Publik" copy="Informasi berkala, tersedia setiap saat, serta merta, dan informasi yang dikecualikan." icon={FileArchive} items={dummyDipItems} />;
    case "data-desa":
      return (
        <>
          <QuickInfo statMap={statMap} dtks={displayDtks} />
          <Panel title="DTKS Agregat">
            <div className="grid grid-cols-2 gap-3">
              <MiniInfo label="Ruta DTKS" value={formatNumber(displayDtks.ruta)} />
              <MiniInfo label="Anggota" value={formatNumber(displayDtks.anggota)} />
              <MiniInfo label="Lampiran" value={formatNumber(displayDtks.lampiran)} />
              <MiniInfo label="RTM Terdaftar" value={formatNumber(displayDtks.rtm_terdaftar_dtks)} />
            </div>
          </Panel>
          <Panel title="Kebutuhan Data Publik">
            <DocumentRow item={{ title: "Penduduk menurut kelompok umur", category: "Statistik", date: "Update bulanan", status: "Publik" }} />
            <DocumentRow item={{ title: "Keluarga, wilayah RT/RW, dan layanan surat", category: "Agregat", date: "Update harian", status: "Publik" }} />
          </Panel>
        </>
      );
    case "berita":
      return (
        <>
          <Panel title="Berita Desa">
            <NewsList items={displayArtikel} />
          </Panel>
          <Panel title="Agenda Desa">
            <AgendaCard />
          </Panel>
        </>
      );
    case "pengumuman":
      return (
        <>
          <Panel title="Pengumuman Resmi">
            {dummyAnnouncements.map((item) => <AnnouncementRow key={item.title} item={item} />)}
          </Panel>
          <Panel title="Agenda Terdekat">
            <AgendaCard />
          </Panel>
        </>
      );
    case "pengaduan":
      return (
        <>
          <ComplaintForm onNotice={onNotice} />
          <EmergencyContact phone={phone} title="Butuh respon cepat?" copy="Untuk kondisi mendesak, gunakan kanal mobil siaga atau informasi darurat." />
        </>
      );
    case "mobil-siaga":
      return (
        <>
          <EmergencyContact phone={phone} title="Mobil Siaga Desa" copy="Nomor resmi mobil siaga akan mengikuti data kontak publik desa atau kurasi khusus Yamansari." />
          <Panel title="Kapan digunakan?">
            <div className="space-y-2 text-sm font-semibold leading-6 text-slate-600">
              <p>Transportasi warga sakit, rujukan fasilitas kesehatan, dan kondisi darurat yang membutuhkan koordinasi perangkat desa.</p>
              <p>Informasi layanan memuat pengemudi piket, wilayah layanan, jam aktif, dan nomor yang dapat dihubungi.</p>
            </div>
          </Panel>
          <Panel title="Kontak Piket">
            {dummyEmergencyContacts.map((item) => <ContactRow key={item.label} item={item} />)}
          </Panel>
        </>
      );
    case "darurat":
      return (
        <>
          <PublicInfoCard icon={Siren} title="Informasi Darurat" copy="Gunakan nomor desa, mobil siaga, atau perangkat wilayah terdekat untuk kondisi mendesak." tone="red" />
          <EmergencyContact phone={phone} title="Kontak Cepat" copy="Kontak ini akan diperbarui dari data publik desa dan konfigurasi mobil siaga." />
          <Panel title="Nomor Penting">
            {dummyEmergencyContacts.map((item) => <ContactRow key={item.label} item={item} />)}
          </Panel>
        </>
      );
  }
}

function PublicInfoCard({ copy, icon: Icon, title, tone }: { copy: string; icon: typeof Home; title: string; tone: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${toneClass(tone)}`}>
        <Icon size={22} />
      </span>
      <h2 className="mt-4 text-[19px] font-bold leading-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{copy}</p>
    </article>
  );
}

function OfficialRow({ item }: { item: (typeof dummyOfficials)[number] }) {
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
        <UsersRound size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-snug text-slate-950">{item.role}</p>
        <p className="mt-1 text-[15px] font-bold leading-snug text-emerald-700">{item.name}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.area}</p>
        <p className="mt-2 text-xs font-bold text-slate-600">{item.phone}</p>
      </div>
    </article>
  );
}

function BudgetRow({ item }: { item: (typeof dummyBudgetRows)[number] }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-snug text-slate-950">{item.label}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.note}</p>
        </div>
        <strong className="shrink-0 text-sm font-bold text-emerald-700">{item.percent}%</strong>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${item.percent}%` }} />
      </div>
      <p className="mt-3 text-[15px] font-bold text-slate-950">{rupiah(item.value)}</p>
    </article>
  );
}

function DocumentList({
  copy,
  icon: Icon,
  items,
  title,
}: {
  copy: string;
  icon: typeof Home;
  items: Array<{ title: string; category: string; date: string; status: string }>;
  title: string;
}) {
  return (
    <Panel title={title}>
      <div className="flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700">
          <Icon size={21} />
        </span>
        <p className="text-sm font-semibold leading-6 text-emerald-900">{copy}</p>
      </div>
      {items.map((item) => <DocumentRow key={`${item.category}-${item.title}`} item={item} />)}
    </Panel>
  );
}

function DocumentRow({ item }: { item: { title: string; category: string; date: string; status: string } }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
      <div className="min-w-0">
        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.category}</span>
        <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-slate-950">{item.title}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">{item.date}</p>
      </div>
      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">{item.status}</span>
    </article>
  );
}

function AnnouncementRow({ item }: { item: (typeof dummyAnnouncements)[number] }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.category}</span>
          <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-slate-950">{item.title}</h3>
        </div>
        <span className="shrink-0 text-xs font-bold text-slate-500">{item.date}</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item.copy}</p>
    </article>
  );
}

function ContactRow({ item }: { item: (typeof dummyEmergencyContacts)[number] }) {
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
        <PhoneCall size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-950">{item.label}</p>
        <p className="mt-1 text-[15px] font-bold text-emerald-700">{item.value}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.note}</p>
      </div>
    </article>
  );
}

function ProgramRow({ item }: { item: ProgramBantuan }) {
  const title = cleanPublicText(item.nama);
  const description = cleanPublicText(item.deskripsi ?? item.sasaran.label);

  return (
    <article className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">{item.status}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MiniInfo label="Peserta" value={formatNumber(item.jumlahPeserta)} />
        <MiniInfo label="Dana" value={item.asalDana ?? "-"} />
      </div>
    </article>
  );
}

function ComplaintForm({ onNotice }: { onNotice: (message: string | null) => void }) {
  const [form, setForm] = useState({ nama: "", telepon: "", judul: "", isi: "" });
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await apiPost("/pengaduan", form, false);
      setForm({ nama: "", telepon: "", judul: "", isi: "" });
      onNotice("Pengaduan terkirim. Perangkat desa akan menindaklanjuti.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Pengaduan belum bisa dikirim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]" onSubmit={submit}>
      <h2 className="text-xl font-bold tracking-normal text-slate-950">Kirim Pengaduan</h2>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">Isi laporan singkat. Data ini diteruskan lewat BFF ke Go API internal.</p>
      <label className="mt-4 block text-sm font-bold text-slate-700">
        Nama
        <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-emerald-600" value={form.nama} onChange={(event) => setForm((current) => ({ ...current, nama: event.target.value }))} required />
      </label>
      <label className="mt-3 block text-sm font-bold text-slate-700">
        Nomor HP
        <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-emerald-600" inputMode="tel" value={form.telepon} onChange={(event) => setForm((current) => ({ ...current, telepon: event.target.value }))} />
      </label>
      <label className="mt-3 block text-sm font-bold text-slate-700">
        Judul
        <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-base outline-none focus:border-emerald-600" value={form.judul} onChange={(event) => setForm((current) => ({ ...current, judul: event.target.value }))} />
      </label>
      <label className="mt-3 block text-sm font-bold text-slate-700">
        Isi Pengaduan
        <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-emerald-600" value={form.isi} onChange={(event) => setForm((current) => ({ ...current, isi: event.target.value }))} required />
      </label>
      <button className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-base font-bold text-white disabled:opacity-60" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Kirim Pengaduan
      </button>
    </form>
  );
}

function EmergencyContact({ copy, phone, title }: { copy: string; phone: string; title: string }) {
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;
  const waHref = phone ? `https://wa.me/${phone.replace(/[^\d]/g, "")}` : undefined;

  return (
    <article className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-5">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
        <PhoneCall size={28} />
      </span>
      <h2 className="mt-4 text-[21px] font-bold leading-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{copy}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {telHref ? (
          <a className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white" href={telHref}>
            <PhoneCall size={18} /> Telepon
          </a>
        ) : (
          <span className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-slate-400">Telepon</span>
        )}
        {waHref ? (
          <a className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-emerald-700" href={waHref} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> WhatsApp
          </a>
        ) : (
          <span className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-slate-400">WhatsApp</span>
        )}
      </div>
    </article>
  );
}

function DtksDashboardPage({
  dtks,
  location,
  onBack,
  villageName,
}: {
  dtks: Dtks;
  location: string;
  onBack: () => void;
  villageName: string;
}) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [summary, setSummary] = useState<Dtks>(dtks);
  const [items, setItems] = useState<AdminDTKSItem[]>([]);
  const [detail, setDetail] = useState<AdminDTKSDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AdminDTKSList>("/admin/dtks?limit=50");
      setSummary(data.summary);
      setItems(data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Data DTKS admin belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function restoreAdmin() {
      try {
        const me = await apiGet<{ user: AdminUser }>("/admin/me");
        if (!mounted) return;
        setAdmin(me.user);
        await loadAdminData();
      } catch {
        try {
          const refreshed = await apiPost<{ user: AdminUser }>("/admin/auth/refresh", undefined, false);
          if (!mounted) return;
          setAdmin(refreshed.user);
          await loadAdminData();
        } catch {
          if (mounted) setAdmin(null);
        }
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    void restoreAdmin();
    return () => {
      mounted = false;
    };
  }, [loadAdminData]);

  const draftCount = items.reduce((total, item) => total + (item.isDraft ? 1 : 0), 0);
  const finalCount = Math.max(0, items.length - draftCount);
  const metrics = [
    { label: "Ruta DTKS", value: summary.ruta, unit: "Ruta", tone: "green", icon: Home },
    { label: "Anggota", value: summary.anggota, unit: "Jiwa", tone: "blue", icon: UsersRound },
    { label: "Draft", value: draftCount, unit: "Data", tone: "orange", icon: FileText },
    { label: "Final", value: finalCount, unit: "Data", tone: "purple", icon: CheckCircle2 },
  ];

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading("login");
    setError(null);
    setMessage(null);
    try {
      const response = await apiPost<{ user: AdminUser }>("/admin/auth/masuk", loginForm, false);
      setAdmin(response.user);
      setMessage("Login admin berhasil.");
      await loadAdminData();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login admin gagal.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleLogout() {
    setActionLoading("logout");
    try {
      await apiPost<{ loggedOut: boolean }>("/admin/auth/keluar");
    } catch {
      // Session lokal tetap dibersihkan agar admin tidak tersangkut di UI.
    } finally {
      setAdmin(null);
      setDetail(null);
      setItems([]);
      setActionLoading(null);
      setMessage("Session admin ditutup.");
    }
  }

  async function openDetail(item: AdminDTKSItem) {
    setDetailLoading(item.id);
    setError(null);
    try {
      const data = await apiGet<AdminDTKSDetail>(`/admin/dtks/${item.id}`);
      setDetail(data);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Detail DTKS belum bisa dimuat.");
    } finally {
      setDetailLoading(null);
    }
  }

  async function updateStatus(nextDraft: boolean) {
    if (!detail) return;
    setActionLoading("status");
    setError(null);
    try {
      const response = await apiPost<{ item: AdminDTKSItem }>(`/admin/dtks/${detail.item.id}/status`, {
        isDraft: nextDraft,
        catatan: detail.item.catatan,
      });
      setDetail({ ...detail, item: response.item });
      setItems((current) => current.map((item) => (item.id === response.item.id ? response.item : item)));
      setMessage(nextDraft ? "Data dikembalikan ke draft." : "Data ditandai final.");
      await loadAdminData();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Status DTKS belum bisa diperbarui.");
    } finally {
      setActionLoading(null);
    }
  }

  async function seedDummy() {
    setActionLoading("seed");
    setError(null);
    setMessage(null);
    try {
      const result = await apiPost<AdminDTKSSeedResult>("/admin/dtks/seed-dummy", {});
      setMessage(`Data awal dibuat: ${formatNumber(result.dtksCreated)} ruta baru, ${formatNumber(result.anggotaCreated)} anggota baru.`);
      await loadAdminData();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Data awal DTKS belum bisa dibuat.");
    } finally {
      setActionLoading(null);
    }
  }

  const shell = (children: ReactNode) => (
    <main className="min-h-screen bg-slate-100 text-slate-950 md:py-6">
      <section className="relative mx-auto min-h-screen w-full max-w-[425px] overflow-x-hidden bg-white shadow-[0_18px_48px_rgba(15,23,42,0.10)] md:rounded-[26px] md:border md:border-white">
        {children}
      </section>
    </main>
  );

  if (!authChecked) {
    return shell(
      <div className="px-4 pb-10 pt-5 max-[375px]:px-3">
        <DtksAdminHeader admin={null} onBack={onBack} onLogout={handleLogout} villageName={villageName} />
        <LoadingState />
      </div>,
    );
  }

  if (!admin) {
    return shell(
      <div className="flex min-h-screen flex-col px-4 pb-10 pt-5 max-[375px]:px-3">
        <DtksAdminHeader admin={null} onBack={onBack} onLogout={handleLogout} villageName={villageName} />
        <section className="mt-8 rounded-[26px] border border-emerald-100 bg-emerald-50/70 p-5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-700 text-white">
            <ShieldCheck size={28} />
          </div>
          <h2 className="mt-5 text-[28px] font-bold leading-tight text-slate-950">Login admin DTKS</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Halaman ini khusus pengelola desa. Data detail hanya dibuka setelah session admin valid.
          </p>
        </section>

        <form className="mt-5 space-y-4" onSubmit={handleLogin}>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Username</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              autoComplete="username"
              value={loginForm.username}
              onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Password</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              type="password"
              autoComplete="current-password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
          {error ? <StatusNotice tone="error" text={error} /> : null}
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(15,138,67,0.22)] disabled:opacity-60"
            disabled={actionLoading === "login"}
            type="submit"
          >
            {actionLoading === "login" ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
            Masuk Dashboard
          </button>
        </form>

        <p className="mt-auto pt-8 text-center text-xs font-semibold leading-5 text-slate-400">
          Metadata halaman: noindex, nofollow, noarchive.
        </p>
      </div>,
    );
  }

  return (
    shell(
      <div className="px-4 pb-10 pt-5 max-[375px]:px-3">
        <DtksAdminHeader admin={admin} onBack={onBack} onLogout={handleLogout} villageName={villageName} />

        <section className="relative mt-6 overflow-hidden rounded-[26px] bg-emerald-800 p-5 text-white shadow-[0_14px_36px_rgba(15,138,67,0.18)]">
          <img
            src={HERO_IMAGE}
            srcSet={HERO_IMAGE_SRCSET}
            sizes={HERO_IMAGE_SIZES}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.16]"
            decoding="async"
            height={270}
            width={480}
          />
          <div className="absolute inset-0 bg-emerald-950/75" />
          <div className="relative">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">Admin</span>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">{location}</span>
            </div>
            <h2 className="mt-4 max-w-[310px] text-[28px] font-bold leading-tight">Dashboard DTKS Admin</h2>
            <p className="mt-3 max-w-[300px] text-[15px] font-medium leading-6 text-emerald-50">
              Pantau ruta, buka detail keluarga, dan kelola data DTKS desa.
            </p>
          </div>
        </section>

        {message ? <StatusNotice tone="success" text={message} /> : null}
        {error ? <StatusNotice tone="error" text={error} /> : null}

        <section className="mt-7">
          <SectionHeader title="Ringkasan Admin" />
          <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] max-[375px]:-mx-3 max-[375px]:px-3 [&::-webkit-scrollbar]:hidden">
            {metrics.map((item) => (
              <DtksMetric key={item.label} icon={item.icon} label={item.label} tone={item.tone} unit={item.unit} value={item.value} />
            ))}
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-60"
            disabled={loading}
            onClick={() => void loadAdminData()}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
            Muat Ulang
          </button>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-60"
            disabled={actionLoading === "seed"}
            onClick={() => void seedDummy()}
          >
            {actionLoading === "seed" ? <Loader2 className="animate-spin" size={18} /> : <ListChecks size={18} />}
            Isi Data Awal
          </button>
        </div>

        <section className="mt-7">
          <SectionHeader title="Daftar Ruta DTKS" action={summary.lastUpdated ? `Update ${summary.lastUpdated}` : undefined} />
          <div className="mt-3 space-y-3">
            {loading ? <LoadingState compact /> : null}
            {!loading && !items.length ? <Empty text="Belum ada data DTKS. Gunakan Isi Data Awal setelah API dan database aktif." /> : null}
            {items.map((item) => (
              <button
                key={item.id}
                className="w-full rounded-[22px] border border-slate-200 bg-white p-4 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition active:scale-[0.99]"
                onClick={() => void openDetail(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-bold leading-tight text-slate-950">{item.kepalaKeluarga || "Kepala keluarga belum tercatat"}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">KK {item.noKk || "-"} · {item.anggotaCount} anggota</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isDraft ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {item.isDraft ? "Draft" : "Final"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold text-slate-500">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <MapPin size={16} />
                    <span className="truncate">{wilayahLabel(item)}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-emerald-700">
                    {detailLoading === item.id ? <Loader2 className="animate-spin" size={16} /> : <Eye size={16} />}
                    Detail
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {detail ? (
          <DtksDetailCard
            detail={detail}
            loading={actionLoading === "status"}
            onClose={() => setDetail(null)}
            onToggleStatus={() => void updateStatus(!detail.item.isDraft)}
          />
        ) : null}
      </div>,
    )
  );
}

function DtksAdminHeader({
  admin,
  onBack,
  onLogout,
  villageName,
}: {
  admin: AdminUser | null;
  onBack: () => void;
  onLogout: () => void;
  villageName: string;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <button className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700" onClick={onBack} aria-label="Kembali ke portal">
        <ChevronRight className="rotate-180" size={24} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">Admin DTKS</p>
        <h1 className="truncate text-[22px] font-bold leading-tight text-slate-950">Desa {villageName}</h1>
      </div>
      {admin ? (
        <button className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700" onClick={onLogout} aria-label="Keluar admin">
          <LogOut size={21} />
        </button>
      ) : (
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">Private</span>
      )}
    </header>
  );
}

function StatusNotice({ text, tone }: { text: string; tone: "error" | "success" }) {
  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      {text}
    </div>
  );
}

function DtksDetailCard({
  detail,
  loading,
  onClose,
  onToggleStatus,
}: {
  detail: AdminDTKSDetail;
  loading: boolean;
  onClose: () => void;
  onToggleStatus: () => void;
}) {
  const item = detail.item;
  const indicators = [
    { label: "PKH", value: yesNoLabel(detail.indikator.pkh) },
    { label: "BLT Dana Desa", value: yesNoLabel(detail.indikator.bltDanaDesa) },
    { label: "BPNT/Bansos", value: yesNoLabel(detail.indikator.bssBnpt) },
    { label: "Internet sebulan", value: yesNoLabel(detail.indikator.internetSebulan) },
    { label: "Luas lantai", value: `${formatNumber(detail.indikator.luasLantai)} m2` },
    { label: "Kamar tidur", value: detail.indikator.jumlahKamarTidur || "-" },
  ];

  return (
    <article className="mt-7 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">Detail ruta</p>
          <h2 className="mt-1 truncate text-xl font-bold leading-tight text-slate-950">{item.kepalaKeluarga || "Kepala keluarga"}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">KK {item.noKk || "-"} · {wilayahLabel(item)}</p>
        </div>
        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600" onClick={onClose} aria-label="Tutup detail">
          <X size={20} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniInfo label="Status" value={item.isDraft ? "Draft" : "Final"} />
        <MiniInfo label="Versi" value={versionLabel(item.versiKuisioner)} />
        <MiniInfo label="Responden" value={item.namaResponden || "-"} />
        <MiniInfo label="Petugas" value={item.ppl || item.petugasPencacahan || "-"} />
      </div>

      <section className="mt-5">
        <h3 className="text-sm font-bold text-slate-950">Indikator cepat</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {indicators.map((indicator) => (
            <MiniInfo key={indicator.label} label={indicator.label} value={indicator.value} />
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-bold text-slate-950">Anggota keluarga</h3>
        <div className="mt-3 space-y-2">
          {detail.anggota.length ? detail.anggota.map((anggota) => (
            <div key={anggota.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-950">{anggota.nama || "Nama belum tercatat"}</p>
                <p className="text-xs font-semibold text-slate-500">{maskNik(anggota.nik)} · {yesNoLabel(anggota.bekerja)}</p>
              </div>
              <span className="shrink-0 text-xs font-bold text-emerald-700">{rupiah(anggota.pendapatanSebulan)}</span>
            </div>
          )) : <Empty text="Anggota DTKS belum tercatat" />}
        </div>
      </section>

      {item.catatan ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">{item.catatan}</p> : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-60"
          disabled={loading}
          onClick={onToggleStatus}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
          {item.isDraft ? "Finalkan" : "Jadikan Draft"}
        </button>
        <a
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
          href={item.opensidFormUrl}
          target="_blank"
          rel="noreferrer"
        >
          OpenSID <ChevronRight size={18} />
        </a>
      </div>
    </article>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold leading-snug text-slate-950">{value}</p>
    </div>
  );
}

function DtksMetric({ icon: Icon, label, tone, unit, value }: { icon: typeof Home; label: string; tone: string; unit: string; value: number }) {
  return (
    <article className="flex h-[95px] min-w-[168px] items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${toneClass(tone)}`}>
        <Icon size={24} />
      </span>
      <div>
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <strong className="mt-1 block text-[21px] font-bold leading-none text-emerald-700">{formatNumber(value)}</strong>
        <span className="mt-1 block text-[13px] font-medium text-slate-500">{unit}</span>
      </div>
    </article>
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
  const displayItems = items.length ? items : fallbackArtikel;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-3.5 shadow-sm">
      {displayItems.map((item, index) => (
        <article key={item.id} className="grid min-h-[104px] grid-cols-[78px_1fr_22px] items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
          <img
            src={item.gambarUrl ?? HERO_IMAGE}
            srcSet={item.gambarUrl ? undefined : HERO_IMAGE_SRCSET}
            sizes={item.gambarUrl ? undefined : "80px"}
            alt=""
            className="h-[72px] w-[78px] rounded-2xl object-cover"
            decoding="async"
            height={156}
            loading="lazy"
            width={172}
          />
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {index % 2 === 0 ? "Pembangunan" : "Pemerintahan"}
            </span>
            <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-slate-950">{cleanPublicText(item.judul)}</h3>
            <p className="mt-2 text-[13px] font-medium text-slate-500">{item.tanggal ?? "21 Mei 2025"}</p>
          </div>
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Buka ${cleanPublicText(item.judul)}`} className="text-slate-600">
            <ChevronRight size={24} />
          </a>
        </article>
      ))}
    </div>
  );
}

function AgendaCard() {
  return (
    <article className="flex min-h-[104px] items-center gap-3 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-3.5">
      <div className="grid h-[72px] w-[64px] shrink-0 place-items-center rounded-2xl bg-white text-center text-emerald-700">
        <strong className="block text-[25px] leading-none">{fallbackAgenda.date}</strong>
        <span className="block text-[12px] font-bold uppercase leading-tight">{fallbackAgenda.month}</span>
        <span className="block text-[12px] font-bold leading-tight">{fallbackAgenda.year}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-[17px] font-bold leading-tight text-slate-950">{fallbackAgenda.title}</h3>
        <p className="mt-2 flex items-center gap-2 text-[14px] font-medium text-slate-500"><MapPin size={17} /> {fallbackAgenda.place}</p>
        <p className="mt-1 flex items-center gap-2 text-[14px] font-medium text-slate-500"><CalendarDays size={17} /> {fallbackAgenda.time}</p>
      </div>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
        <CalendarDays size={22} />
      </span>
    </article>
  );
}

function HelpCard({ primaryProgram }: { primaryProgram: ProgramBantuan | undefined }) {
  const programName = primaryProgram?.nama ? cleanPublicText(primaryProgram.nama).toLowerCase() : "";

  return (
    <article className="flex items-center gap-3 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-3.5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
        <Headphones size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] font-bold leading-tight text-slate-950">Butuh Bantuan?</h3>
        <p className="mt-1 text-[14px] font-medium leading-snug text-slate-500">
          {programName ? `Informasi ${programName} dan layanan desa.` : "Hubungi perangkat desa untuk informasi lebih lanjut."}
        </p>
      </div>
      <a className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-emerald-700 px-3.5 text-[13px] font-bold text-white" href="https://wa.me/" target="_blank" rel="noreferrer">
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
      <img
        src={item.fotoUrl ?? HERO_IMAGE}
        srcSet={item.fotoUrl ? undefined : HERO_IMAGE_SRCSET}
        sizes={item.fotoUrl ? undefined : "80px"}
        alt=""
        className="h-20 w-20 shrink-0 rounded-2xl object-cover"
        decoding="async"
        height={156}
        loading="lazy"
        width={172}
      />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-950">{cleanPublicText(item.judul)}</h3>
        <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-slate-500">{cleanPublicText(item.lokasi ?? item.ringkasan)}</p>
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
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-[18px] font-bold tracking-normal text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function SectionHeader({ action, title, onClick }: { action?: string; title: string; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-[19px] font-bold leading-tight tracking-normal text-slate-950">{title}</h2>
      {onClick ? (
        <button className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-[13px] font-bold text-emerald-700" onClick={onClick}>
          Lihat <ChevronRight size={17} />
        </button>
      ) : action ? (
        <span className="text-right text-xs font-semibold leading-4 text-slate-500">{action}</span>
      ) : null}
    </div>
  );
}

function PublicMenuDrawer({
  kind,
  onClose,
  onNavigate,
}: {
  kind: DrawerKind | null;
  onClose: () => void;
  onNavigate: (target: MenuTarget) => void;
}) {
  if (!kind) return null;

  const items = kind === "services" ? serviceDrawerItems : informationDrawerItems;
  const title = kind === "services" ? "Pilih Layanan" : "Pilih Informasi";
  const subtitle = kind === "services" ? "Layanan warga dan bantuan cepat" : "Publikasi dan data terbuka desa";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-slate-950/45" aria-label="Tutup menu" onClick={onClose} />
      <section className="relative w-full max-w-[425px] rounded-t-[24px] border border-slate-200 bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_48px_rgba(15,23,42,0.18)] max-[375px]:px-3">
        <div className="mx-auto h-1.5 w-24 rounded-full bg-slate-300" />
        <button className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600" onClick={onClose} aria-label="Tutup drawer">
          <X size={20} />
        </button>
        <div className="mt-5 text-center">
          <h2 className="text-[18px] font-bold leading-tight text-slate-950">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="min-h-[92px] rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-3 text-center transition active:scale-[0.98]"
                onClick={() => onNavigate(item.target)}
              >
                <span className={`mx-auto grid h-10 w-10 place-items-center rounded-xl ${toneClass(item.tone)}`}>
                  <Icon size={21} />
                </span>
                <span className="mt-2 block text-[12px] font-bold leading-tight text-slate-950">{item.label}</span>
                <span className="mt-1 block text-[10px] font-semibold leading-tight text-slate-500">{item.description}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BottomNavigation({
  current,
  onAccount,
  onHome,
  onInfo,
  onServices,
}: {
  current: Tab;
  onAccount: () => void;
  onHome: () => void;
  onInfo: () => void;
  onServices: () => void;
}) {
  const actions: Record<Tab, () => void> = {
    home: onHome,
    services: onServices,
    info: onInfo,
    account: onAccount,
  };

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-20px)] max-w-[405px] -translate-x-1/2 rounded-3xl border border-slate-200 bg-white/96 px-3.5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_26px_rgba(15,23,42,0.08)] backdrop-blur max-[375px]:w-[calc(100%-16px)] max-[375px]:px-2.5" aria-label="Navigasi bawah">
      <div className="grid grid-cols-4">
        {bottomTabs.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button key={item.key} className={`grid min-h-[54px] place-items-center gap-1 rounded-2xl text-[12px] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`} onClick={actions[item.key]}>
              <Icon size={22} fill={active ? "currentColor" : "none"} strokeWidth={active ? 2.3 : 2} />
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

export function routeFromPathname(pathname: string): PageRoute {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/dtks" || path.startsWith("/admin")) return "dtks";
  const key = path.slice(1);
  if (publicRouteSet.has(key)) return key as PublicRouteKey;
  return "portal";
}

function routeFromLocation(): PageRoute {
  if (typeof window === "undefined") return "portal";
  return routeFromPathname(window.location.pathname);
}

function routePath(route: PageRoute) {
  if (route === "portal") return "/";
  return `/${route}`;
}

function isPublicRoute(route: PageRoute): route is PublicRouteKey {
  return route !== "portal" && route !== "dtks";
}

function bottomTabForRoute(route: PageRoute, tab: Tab): Tab {
  if (route === "portal") return tab;
  if (route === "dtks" || route === "pengaduan" || route === "mobil-siaga" || route === "darurat" || route === "program") return "services";
  return "info";
}

function useRouteMetadata(route: PageRoute, villageName: string) {
  useEffect(() => {
    const robots = ensureMeta("robots");
    const description = ensureMeta("description");
    const canonical = ensureCanonical();

    const pathname = window.location.pathname;
    if (route === "dtks" || pathname.startsWith("/admin")) {
      document.title = `Dashboard DTKS ${villageName}`;
      robots.content = "noindex, nofollow, noarchive, noimageindex";
      description.content = "Dashboard agregat DTKS Desa Yamansari. Halaman ini tidak untuk diindeks mesin pencari.";
      canonical.href = `${window.location.origin}/dtks`;
      return;
    }

    const meta = publicRouteMeta(pathname, villageName);
    document.title = meta.title;
    robots.content = "index, follow";
    description.content = meta.description;
    canonical.href = `${window.location.origin}${meta.canonicalPath}`;
  }, [route, villageName]);
}

function publicRouteMeta(pathname: string, villageName: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const village = `Desa ${villageName}`;
  const descriptions: Record<string, { title: string; description: string }> = {
    "/": {
      title: `${village} Digital`,
      description: `Portal layanan dan informasi ${village} untuk surat online, berita desa, agenda, data warga, dan bantuan masyarakat.`,
    },
    "/profil": {
      title: `Profil ${village}`,
      description: `Profil wilayah, alamat, kontak, dan identitas pemerintahan ${village}.`,
    },
    "/pemerintah-desa": {
      title: `Pemerintah ${village}`,
      description: `Struktur organisasi dan perangkat pemerintah ${village}.`,
    },
    "/struktur-organisasi": {
      title: `Struktur Organisasi ${village}`,
      description: `Susunan organisasi dan perangkat pemerintah ${village}.`,
    },
    "/apbdes": {
      title: `APBDes ${village}`,
      description: `Informasi APBDes dan realisasi anggaran ${village}.`,
    },
    "/perencanaan": {
      title: `RPJMDes dan RKPDes ${village}`,
      description: `Dokumen perencanaan pembangunan desa, RPJMDes, dan RKPDes ${village}.`,
    },
    "/program": {
      title: `Program dan Kegiatan ${village}`,
      description: `Daftar program, kegiatan, pembangunan, dan bantuan masyarakat ${village}.`,
    },
    "/produk-hukum": {
      title: `Produk Hukum ${village}`,
      description: `Peraturan desa, keputusan kepala desa, dan dokumen hukum ${village}.`,
    },
    "/ppid": {
      title: `PPID ${village}`,
      description: `Pejabat Pengelola Informasi dan Dokumentasi serta layanan informasi publik ${village}.`,
    },
    "/dip": {
      title: `Daftar Informasi Publik ${village}`,
      description: `Daftar Informasi Publik yang tersedia untuk warga dan masyarakat ${village}.`,
    },
    "/data-desa": {
      title: `Statistik Data ${village}`,
      description: `Statistik kependudukan dan data agregat publik ${village}.`,
    },
    "/berita": {
      title: `Berita ${village}`,
      description: `Berita terbaru, agenda, dan informasi kegiatan ${village}.`,
    },
    "/pengumuman": {
      title: `Pengumuman ${village}`,
      description: `Pengumuman resmi dan informasi penting dari pemerintah ${village}.`,
    },
    "/pengaduan": {
      title: `Pengaduan Warga ${village}`,
      description: `Layanan pengaduan, aspirasi, dan bantuan warga ${village}.`,
    },
    "/mobil-siaga": {
      title: `Mobil Siaga ${village}`,
      description: `Kontak mobil siaga dan bantuan transportasi darurat warga ${village}.`,
    },
    "/darurat": {
      title: `Informasi Darurat ${village}`,
      description: `Kontak darurat, mobil siaga, dan informasi cepat untuk warga ${village}.`,
    },
  };

  return { canonicalPath: path, ...(descriptions[path] ?? descriptions["/"]) };
}

function ensureMeta(name: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = name;
    document.head.appendChild(meta);
  }

  return meta;
}

function ensureCanonical() {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }

  return link;
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

function cleanPublicText(value: string) {
  return value.replace(/^\s*(dummy|contoh)\s*[-:]\s*/i, "").trim();
}

function maskNik(value: string) {
  if (value.length < 8) return value;
  return `${value.slice(0, 4)}********${value.slice(-4)}`;
}

function versionLabel(value: string) {
  if (value === "2") return "REGSOSEK2022.K";
  if (value === "1") return "REGSOS-EK2021.RT";
  return value || "-";
}

function yesNoLabel(value: string) {
  if (value === "1") return "Ya";
  if (value === "2") return "Tidak";
  return value || "-";
}

function wilayahLabel(item: Pick<AdminDTKSItem, "dusun" | "rt" | "rw">) {
  const parts = [
    item.dusun ? `Dusun ${item.dusun}` : "",
    item.rt ? `RT ${item.rt}` : "",
    item.rw ? `RW ${item.rw}` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" / ") : "Wilayah belum tercatat";
}
