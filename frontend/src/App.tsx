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
  ExternalLink,
  FileArchive,
  FileText,
  Grid2X2,
  Home,
  Landmark,
  ListChecks,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  Menu,
  MapPin,
  Megaphone,
  MessageCircle,
  Newspaper,
  PhoneCall,
  Scale,
  Save,
  Send,
  ShieldCheck,
  Siren,
  Store,
  WalletCards,
  X,
  UsersRound,
} from "lucide-react";
import { apiGet, apiPost } from "./api";
import { loginAdmin, logoutAdmin, restoreAdminSession } from "./admin-auth";
import { DIPAdminPage, DIPDetailPage, DIPListPage } from "./dip-pages";
import {
  BudgetSummary,
  EmergencyPublicPage,
  InformationObjectionPage,
  InformationRequestPage,
  PPIDReportPage,
  PPIDServicesAdminPage,
  PublicationCoveragePanel,
  PublicationDocuments,
} from "./ppid-service-pages";
import type {
  AdminDTKSDetail,
  AdminDTKSItem,
  AdminDTKSList,
  AdminDTKSSeedResult,
  AdminPPIDPayload,
  AdminPPIDSeedResult,
  AdminUser,
  ArsipSurat,
  Artikel,
  BudgetData,
  Dtks,
  DIPEntry,
  DIPListPayload,
  EmergencyData,
  MandiriUser,
  Pembangunan,
  PermohonanSurat,
  ProgramBantuan,
  PPIDReport,
  PPIDProfile,
  PPIDPublicData,
  PublicationCatalog,
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
  "permohonan-informasi",
  "keberatan-informasi",
  "laporan-ppid",
  "data-desa",
  "berita",
  "pengumuman",
  "pengaduan",
  "mobil-siaga",
  "darurat",
] as const;

export type PublicRouteKey = (typeof publicRouteKeys)[number];
export type PageRoute = "portal" | "dtks" | "admin-ppid" | "admin-ppid-layanan" | "admin-dip" | "dip-detail" | PublicRouteKey;
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
const HERO_IMAGE_SIZES = "(max-width: 430px) calc(100vw - 32px), 398px";

const publicRouteSet = new Set<string>(publicRouteKeys);

const serviceItems: Array<{ label: string; icon: typeof Home; tone: string; target: ServiceTarget }> = [
  { label: "Surat Online", icon: FileText, tone: "green", target: "account" },
  { label: "Pengaduan", icon: MessageCircle, tone: "green", target: "pengaduan" },
  { label: "Berita Desa", icon: Newspaper, tone: "green", target: "berita" },
  { label: "Agenda", icon: CalendarDays, tone: "green", target: "pengumuman" },
  { label: "UMKM", icon: Store, tone: "green", target: "program" },
  { label: "Data Desa", icon: UsersRound, tone: "green", target: "data-desa" },
  { label: "Pengumuman", icon: Megaphone, tone: "green", target: "pengumuman" },
  { label: "Lainnya", icon: Grid2X2, tone: "green", target: "profil" },
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
  { label: "Pengaduan", description: "Aspirasi warga", icon: MessageCircle, tone: "green", target: "pengaduan" },
  { label: "Permohonan Info", description: "Layanan PPID", icon: FileText, tone: "green", target: "permohonan-informasi" },
  { label: "Keberatan PPID", description: "Tindak lanjut", icon: Scale, tone: "green", target: "keberatan-informasi" },
  { label: "Mobil Siaga", description: "Kontak cepat", icon: PhoneCall, tone: "green", target: "mobil-siaga" },
  { label: "Darurat", description: "Info penting", icon: Siren, tone: "red", target: "darurat" },
  { label: "Program", description: "Kegiatan desa", icon: ClipboardList, tone: "green", target: "program" },
];

const informationDrawerItems: Array<{ label: string; description: string; icon: typeof Home; tone: string; target: MenuTarget }> = [
  { label: "Profil Desa", description: "Identitas wilayah", icon: Landmark, tone: "green", target: "profil" },
  { label: "Pemerintah", description: "Perangkat desa", icon: Building2, tone: "green", target: "pemerintah-desa" },
  { label: "Struktur", description: "Organisasi", icon: UsersRound, tone: "green", target: "struktur-organisasi" },
  { label: "APBDes", description: "Anggaran", icon: WalletCards, tone: "green", target: "apbdes" },
  { label: "RPJM/RKP", description: "Perencanaan", icon: BookOpen, tone: "green", target: "perencanaan" },
  { label: "Produk Hukum", description: "Regulasi desa", icon: Scale, tone: "green", target: "produk-hukum" },
  { label: "PPID", description: "Info publik", icon: ShieldCheck, tone: "green", target: "ppid" },
  { label: "DIP", description: "Daftar informasi", icon: FileArchive, tone: "green", target: "dip" },
  { label: "Laporan PPID", description: "Rekap layanan", icon: ListChecks, tone: "green", target: "laporan-ppid" },
  { label: "Data Desa", description: "Statistik", icon: Database, tone: "green", target: "data-desa" },
  { label: "Berita", description: "Kabar terbaru", icon: Newspaper, tone: "green", target: "berita" },
  { label: "Pengumuman", description: "Informasi resmi", icon: Megaphone, tone: "green", target: "pengumuman" },
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
    tone: "green",
  },
  "struktur-organisasi": {
    eyebrow: "Organisasi",
    title: "Struktur Organisasi",
    description: "Susunan organisasi pemerintah desa dan pembagian tanggung jawab pelayanan.",
    icon: UsersRound,
    tone: "green",
  },
  apbdes: {
    eyebrow: "Transparansi",
    title: "APBDes & Realisasi",
    description: "Informasi anggaran desa, realisasi, dan ringkasan belanja publik.",
    icon: WalletCards,
    tone: "green",
  },
  perencanaan: {
    eyebrow: "Perencanaan",
    title: "RPJMDes & RKPDes",
    description: "Dokumen rencana pembangunan jangka menengah dan tahunan desa.",
    icon: BookOpen,
    tone: "green",
  },
  program: {
    eyebrow: "Kegiatan Desa",
    title: "Program & Kegiatan",
    description: "Program bantuan, pembangunan, dan kegiatan prioritas desa.",
    icon: ClipboardList,
    tone: "green",
  },
  "produk-hukum": {
    eyebrow: "Regulasi",
    title: "Produk Hukum Desa",
    description: "Peraturan desa, keputusan kepala desa, dan dokumen hukum.",
    icon: Scale,
    tone: "green",
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
    tone: "green",
  },
  "permohonan-informasi": {
    eyebrow: "Layanan PPID",
    title: "Permohonan Informasi",
    description: "Ajukan permintaan informasi publik dan simpan token pelacakan.",
    icon: FileText,
    tone: "green",
  },
  "keberatan-informasi": {
    eyebrow: "Layanan PPID",
    title: "Keberatan Informasi",
    description: "Ajukan keberatan atas layanan informasi publik sesuai prosedur.",
    icon: Scale,
    tone: "green",
  },
  "laporan-ppid": {
    eyebrow: "Transparansi PPID",
    title: "Laporan Layanan PPID",
    description: "Rekap permohonan informasi, keberatan, tenggat, dan publikasi DIP.",
    icon: ListChecks,
    tone: "green",
  },
  "data-desa": {
    eyebrow: "Statistik",
    title: "Statistik Data Desa",
    description: "Data agregat penduduk, keluarga, wilayah, layanan, dan DTKS.",
    icon: Database,
    tone: "green",
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
    tone: "green",
  },
  pengaduan: {
    eyebrow: "Layanan Warga",
    title: "Layanan Pengaduan",
    description: "Kirim aspirasi, laporan, atau pertanyaan kepada perangkat desa.",
    icon: MessageCircle,
    tone: "green",
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

const dummyAnnouncements = [
  { title: "Pelayanan administrasi pindah sementara ke aula desa", date: "25 Mei 2025", category: "Pelayanan", copy: "Loket pelayanan tetap buka pukul 08.00-14.00 WIB selama penataan ruang kantor." },
  { title: "Musyawarah dusun penyusunan usulan RKPDes", date: "28 Mei 2025", category: "Perencanaan", copy: "Warga dapat menyampaikan usulan kegiatan melalui ketua RT/RW masing-masing." },
  { title: "Jadwal pembayaran PBB kolektif tahap pertama", date: "02 Jun 2025", category: "Pajak", copy: "Pembayaran kolektif dilayani di balai desa dan pos pelayanan wilayah." },
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
  const [ppid, setPpid] = useState<PPIDPublicData | null>(initialData?.ppid ?? null);
  const [dip] = useState<DIPListPayload | undefined>(initialData?.dip);
  const [dipDetail] = useState<DIPEntry | undefined>(initialData?.dipDetail);
  const [publications, setPublications] = useState<PublicationCatalog | undefined>(initialData?.publications);
  const [budget, setBudget] = useState<BudgetData | undefined>(initialData?.budget);
  const [emergency, setEmergency] = useState<EmergencyData | undefined>(initialData?.emergency);
  const [ppidReport, setPpidReport] = useState<PPIDReport | undefined>(initialData?.ppidReport);
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

  useEffect(() => {
    if (route !== "ppid" || ppid) return;
    let active = true;
    apiGet<PPIDPublicData>("/public/ppid")
      .then((data) => {
        if (active) setPpid(data);
      })
      .catch((loadError) => {
        if (active) setNotice(loadError instanceof Error ? loadError.message : "Profil PPID belum bisa dimuat.");
      });
    return () => {
      active = false;
    };
  }, [ppid, route]);

  useEffect(() => {
    if (publications || !["profil", "pemerintah-desa", "struktur-organisasi", "apbdes", "perencanaan", "program", "produk-hukum", "data-desa", "mobil-siaga", "darurat"].includes(route)) return;
    let active = true;
    apiGet<PublicationCatalog>("/public/publications")
      .then((data) => {
        if (active) setPublications(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [publications, route]);

  useEffect(() => {
    if (route !== "apbdes" || budget) return;
    let active = true;
    apiGet<BudgetData>(`/public/budget?year=${new Date().getFullYear()}`)
      .then((data) => {
        if (active) setBudget(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [budget, route]);

  useEffect(() => {
    if ((route !== "darurat" && route !== "mobil-siaga") || emergency) return;
    let active = true;
    apiGet<EmergencyData>("/public/emergency")
      .then((data) => {
        if (active) setEmergency(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [emergency, route]);

  useEffect(() => {
    if (route !== "laporan-ppid" || ppidReport) return;
    let active = true;
    apiGet<PPIDReport>("/public/ppid/report")
      .then((data) => {
        if (active) setPpidReport(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [ppidReport, route]);

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

  useRouteMetadata(route, villageName, dipDetail);
  const activeBottomTab = bottomTabForRoute(route, tab);

  if (route === "dtks") {
    return <DtksDashboardPage dtks={dtks} location={location} onBack={() => goPortal("home")} villageName={villageName} />;
  }

  if (route === "admin-ppid") {
    return <PPIDAdminPage onBack={() => openPublicRoute("ppid")} villageName={villageName} />;
  }

  if (route === "admin-ppid-layanan") {
    return <PPIDServicesAdminPage villageName={villageName} />;
  }

  if (route === "admin-dip") {
    return <DIPAdminPage villageName={villageName} />;
  }

  return (
    <main className="min-h-screen bg-cream-50 text-civic-text md:py-4">
      <section className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-x-hidden bg-cream-50 md:min-h-[calc(100dvh-32px)] md:rounded-civic-xl md:border md:border-civic-border md:shadow-civic-md">
        <div className="px-4 pb-24 pt-4">
          {route === "portal" && tab === "home" ? (
            <HomeTop
              location={location}
              logoUrl={ringkasan?.profil.logoUrl}
              onOpenServices={() => setDrawer("services")}
              villageName={villageName}
            />
          ) : (
            <VillageHeader villageName={villageName} location={location} logoUrl={ringkasan?.profil.logoUrl} />
          )}

          {notice ? (
            <button
              className="mt-4 w-full rounded-2xl border border-civic-warning/30 bg-civic-warning-bg px-4 py-3 text-left text-sm font-medium text-civic-warning"
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
              budget={budget}
              emergency={emergency}
              pembangunan={pembangunan}
              ppid={ppid}
              ppidReport={ppidReport}
              dip={dip}
              publications={publications}
              program={program}
              ringkasan={ringkasan}
              route={route}
              statMap={statMap}
              villageName={villageName}
            />
          ) : null}

          {route === "dip-detail" ? <DIPDetailPage item={dipDetail} /> : null}

          {route === "portal" && tab === "home" ? (
            <HomeScreen
              artikel={artikel}
              dtks={dtks}
              location={location}
              onNavigate={navigateMenu}
              ringkasan={ringkasan}
              statMap={statMap}
              villageName={villageName}
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
    <header className="flex h-14 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={logoUrl ?? "/yamansari-mark.svg"}
          alt={`Lambang Desa ${villageName}`}
          className="h-10 w-10 shrink-0 rounded-civic-sm border border-civic-border bg-civic-surface object-contain p-1 shadow-civic-sm"
        />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold leading-6 text-village-800">Desa {villageName}</h1>
          <p className="truncate text-[13px] leading-5 text-civic-muted">{location}</p>
        </div>
      </div>
      <a className="grid h-11 w-11 shrink-0 place-items-center rounded-civic-md border border-civic-border bg-civic-surface text-village-800 shadow-civic-sm" href="/pengumuman" aria-label="Buka pengumuman desa">
        <Bell size={20} />
      </a>
    </header>
  );
}

function HomeTop({
  location,
  logoUrl,
  onOpenServices,
  villageName,
}: {
  location: string;
  logoUrl: string | null | undefined;
  onOpenServices: () => void;
  villageName: string;
}) {
  return (
    <div>
      <header className="flex h-14 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={logoUrl ?? "/yamansari-mark.svg"}
            alt={`Lambang Desa ${villageName}`}
            className="h-10 w-10 shrink-0 rounded-civic-sm border border-civic-border bg-civic-surface object-contain p-1 shadow-civic-sm"
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-6 text-village-800">Desa {villageName}</h1>
            <p className="truncate text-[13px] leading-5 text-civic-muted">{location}</p>
          </div>
        </div>
        <button
          className="grid h-11 w-11 shrink-0 place-items-center rounded-civic-md border border-civic-border bg-civic-surface text-village-800 shadow-civic-sm"
          onClick={onOpenServices}
          aria-label="Buka menu layanan"
        >
          <Menu size={22} />
        </button>
      </header>

      <section className="relative mt-4 h-[240px] overflow-hidden rounded-civic-xl border border-civic-border bg-civic-surface shadow-civic-sm">
        <img
          src={HERO_IMAGE}
          srcSet={HERO_IMAGE_SRCSET}
          sizes={HERO_IMAGE_SIZES}
          alt={`Pemandangan Desa ${villageName}`}
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
          fetchPriority="high"
          height={270}
          width={480}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/10" />
        <div className="relative z-10 flex h-full max-w-[76%] flex-col justify-center p-5">
          <p className="text-sm leading-[22px] text-civic-text">Selamat datang di</p>
          <h2 className="mt-1 text-[32px] font-bold leading-10 text-village-900">Desa {villageName}</h2>
          <p className="mt-2 text-sm leading-[22px] text-civic-muted">Layanan dan informasi desa dalam satu akses yang mudah.</p>
          <button
            className="mt-4 inline-flex h-11 w-fit items-center gap-2 rounded-civic-sm bg-village-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-village-900 active:bg-village-950"
            onClick={onOpenServices}
          >
            Jelajahi Layanan <ChevronRight size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}

function HomeScreen({
  artikel,
  dtks,
  location,
  onNavigate,
  ringkasan,
  statMap,
  villageName,
}: {
  artikel: Artikel[];
  dtks: Dtks | null;
  location: string;
  onNavigate: (target: MenuTarget) => void;
  ringkasan: Ringkasan;
  statMap: Map<string, { value: number; label: string }>;
  villageName: string;
}) {
  return (
    <div className="mt-6 space-y-6">
      <ServicesGrid onNavigate={onNavigate} />
      <ImportantInfoCard onNavigate={onNavigate} />
      <section>
        <SectionHeader title="Jadwal Kegiatan" onClick={() => onNavigate("pengumuman")} />
        <div className="mt-3"><AgendaCard /></div>
      </section>
      <section>
        <SectionHeader title="Berita Desa" onClick={() => onNavigate("berita")} />
        <div className="mt-3"><NewsList items={artikel.slice(0, 2)} /></div>
      </section>
      <QuickInfo statMap={statMap} dtks={dtks} />
      <ContactFooter location={location} ringkasan={ringkasan} villageName={villageName} />
    </div>
  );
}

function ImportantInfoCard({ onNavigate }: { onNavigate: (target: MenuTarget) => void }) {
  const announcement = dummyAnnouncements[0];

  return (
    <section className="civic-card bg-civic-soft p-4">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-civic-md bg-village-800 text-white">
          <Bell size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold leading-6 text-village-800">Informasi Penting</h2>
            <span className="rounded-full bg-village-100 px-2 py-0.5 text-[11px] font-semibold text-village-800">Baru</span>
          </div>
          <p className="mt-1 line-clamp-1 text-sm font-semibold leading-5 text-civic-text">{announcement.title}</p>
          <p className="mt-1 text-xs leading-[18px] text-civic-muted">{announcement.date}</p>
        </div>
        <button className="hidden h-10 shrink-0 items-center rounded-civic-sm bg-village-800 px-4 text-sm font-semibold text-white min-[420px]:inline-flex" onClick={() => onNavigate("pengumuman")}>
          Detail
        </button>
      </div>
    </section>
  );
}

function ServicesGrid({ onNavigate }: { onNavigate: (target: MenuTarget) => void }) {
  return (
    <section>
      <SectionHeader title="Layanan Cepat" />
      <div className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {serviceItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="civic-card min-h-[124px] min-w-[112px] snap-start p-3 text-left transition-colors hover:bg-village-50 active:bg-village-100"
              onClick={() => onNavigate(item.target)}
            >
              <span className="grid h-11 w-11 place-items-center rounded-civic-md bg-village-100 text-village-700">
                <Icon size={28} strokeWidth={2} />
              </span>
              <span className="mt-3 block text-[13px] font-semibold leading-[18px] text-civic-text">{item.label}</span>
              <span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-civic-muted">{serviceCopy[item.label]}</span>
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
    { key: "keluarga" as StatKey, label: "Keluarga", value: statValue(statMap, "keluarga"), unit: "KK", icon: UsersRound, tone: "green" },
    { key: "wilayah" as StatKey, label: "RT/RW", value: statValue(statMap, "wilayah"), unit: "Wilayah", icon: Building2, tone: "green" },
    { key: "dtks" as StatKey, label: "DTKS", value: dtks?.ruta ?? statValue(statMap, "dtks"), unit: "Ruta", icon: CircleDollarSign, tone: "green" },
  ];

  return (
    <section>
      <SectionHeader title="Statistik Desa" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.key} className="civic-card min-h-[112px] p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-village-100 text-village-700">
                <Icon size={20} />
              </span>
              <strong className="mt-3 block text-xl font-bold leading-6 text-civic-text">{formatNumber(item.value)}</strong>
              <p className="mt-1 text-xs leading-[18px] text-civic-muted">{item.label} · {item.unit}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ContactFooter({ location, ringkasan, villageName }: { location: string; ringkasan: Ringkasan; villageName: string }) {
  const phone = ringkasan.profil.kontak.telepon ?? "0283 619 2025";
  const email = ringkasan.profil.kontak.email ?? "pemdes@yamansari.desa.id";

  return (
    <footer className="-mx-4 bg-village-800 px-4 py-4 text-white">
      <div className="grid gap-3 text-xs leading-[18px]">
        <div className="flex gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Desa {villageName}<br />{location}<br />Jawa Tengah</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <a className="flex min-h-11 items-center gap-2" href={`tel:${phone.replace(/[^\d+]/g, "")}`}><PhoneCall className="h-4 w-4 shrink-0" /> {phone}</a>
          <a className="flex min-h-11 items-center gap-2 break-all" href={`mailto:${email}`}><Send className="h-4 w-4 shrink-0" /> {email}</a>
        </div>
      </div>
    </footer>
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
  budget,
  dtks,
  dip,
  emergency,
  location,
  onBack,
  onNavigate,
  onNotice,
  pembangunan,
  ppid,
  ppidReport,
  publications,
  program,
  ringkasan,
  route,
  statMap,
  villageName,
}: {
  artikel: Artikel[];
  budget?: BudgetData;
  dtks: Dtks | null;
  dip?: DIPListPayload;
  emergency?: EmergencyData;
  location: string;
  onBack: () => void;
  onNavigate: (target: MenuTarget) => void;
  onNotice: (message: string | null) => void;
  pembangunan: Pembangunan[];
  ppid: PPIDPublicData | null;
  ppidReport?: PPIDReport;
  publications?: PublicationCatalog;
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
      <section className="civic-card p-4">
        <button className="inline-flex min-h-11 items-center gap-2 rounded-civic-sm bg-civic-soft px-3 text-sm font-semibold text-civic-text" onClick={onBack}>
          <ArrowLeft size={17} /> Beranda
        </button>
        <div className="mt-4 flex items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-civic-md ${toneClass(page.tone)}`}>
            <Icon size={24} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-village-700">{page.eyebrow}</p>
            <h2 className="mt-1 text-[28px] font-bold leading-9 text-civic-text">{page.title}</h2>
            <p className="mt-2 text-sm leading-[22px] text-civic-muted">Desa {villageName} - {page.description}</p>
          </div>
        </div>
      </section>

      <PublicRouteContent
        artikel={artikel}
        budget={budget}
        dtks={dtks}
        dip={dip}
        emergency={emergency}
        location={location}
        onNavigate={onNavigate}
        onNotice={onNotice}
        pembangunan={pembangunan}
        ppid={ppid}
        ppidReport={ppidReport}
        publications={publications}
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
  budget,
  dtks,
  dip,
  emergency,
  location,
  onNavigate,
  onNotice,
  pembangunan,
  ppid,
  ppidReport,
  publications,
  program,
  ringkasan,
  route,
  statMap,
}: {
  artikel: Artikel[];
  budget?: BudgetData;
  dtks: Dtks | null;
  dip?: DIPListPayload;
  emergency?: EmergencyData;
  location: string;
  onNavigate: (target: MenuTarget) => void;
  onNotice: (message: string | null) => void;
  pembangunan: Pembangunan[];
  ppid: PPIDPublicData | null;
  ppidReport?: PPIDReport;
  publications?: PublicationCatalog;
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
          <Panel title="Dokumen Profil">
            <PublicationDocuments catalog={publications} types={["profile"]} empty="Dokumen profil desa belum tersedia." />
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
            tone="green"
          />
          <Panel title="Perangkat Desa">
            {dummyOfficials.slice(0, 3).map((item) => <OfficialRow key={item.role} item={item} />)}
          </Panel>
          <Panel title="Pelayanan Pemerintah">
            <LargeService title="Layanan Mandiri" copy="Masuk untuk mengajukan surat dan melihat arsip layanan warga." icon={FileText} onClick={() => onNavigate("account")} />
            <LargeService title="Struktur Organisasi" copy="Lihat susunan organisasi pemerintah desa." icon={UsersRound} onClick={() => onNavigate("struktur-organisasi")} />
          </Panel>
          <Panel title="Dokumen Pemerintah Desa">
            <PublicationDocuments catalog={publications} types={["profile", "governance_report"]} empty="Dokumen pemerintah desa belum tersedia." />
          </Panel>
        </>
      );
    case "struktur-organisasi":
      return (
        <>
          <Panel title="Struktur Organisasi">
            {dummyOfficials.map((item) => <OfficialRow key={item.role} item={item} />)}
          </Panel>
          <Panel title="Dokumen Struktur">
            <PublicationDocuments catalog={publications} types={["profile"]} empty="Dokumen struktur organisasi belum tersedia." />
          </Panel>
        </>
      );
    case "apbdes":
      return (
        <>
          <BudgetSummary budget={budget} />
          <Panel title="Dokumen APBDes">
            <PublicationDocuments catalog={publications} types={["budget"]} empty="Dokumen APBDes dan realisasi belum tersedia." />
          </Panel>
        </>
      );
    case "perencanaan":
      return (
        <Panel title="Dokumen RPJMDes & RKPDes">
          <PublicationDocuments catalog={publications} types={["planning", "meeting"]} empty="Dokumen perencanaan belum tersedia." />
        </Panel>
      );
    case "program":
      return (
        <>
          <Panel title="Program Bantuan">
            {displayProgram.slice(0, 4).map((item) => <ProgramRow key={item.id} item={item} />)}
          </Panel>
          <Panel title="Pembangunan Desa">
            {displayPembangunan.slice(0, 4).map((item) => <DevelopmentRow key={item.id} item={item} />)}
          </Panel>
          <Panel title="Dokumen Program">
            <PublicationDocuments catalog={publications} types={["program", "bumdes"]} empty="Dokumen program dan BUM Desa belum tersedia." />
          </Panel>
        </>
      );
    case "produk-hukum":
      return (
        <Panel title="Produk Hukum Desa">
          <PublicationDocuments catalog={publications} types={["legal", "contract"]} empty="Produk hukum desa belum tersedia." />
        </Panel>
      );
    case "ppid":
      return <PPIDPublicPage data={ppid} onNavigate={onNavigate} />;
    case "dip":
      return <DIPListPage initialData={dip} />;
    case "permohonan-informasi":
      return <InformationRequestPage />;
    case "keberatan-informasi":
      return <InformationObjectionPage />;
    case "laporan-ppid":
      return <PPIDReportPage report={ppidReport} />;
    case "data-desa":
      return (
        <>
          <QuickInfo statMap={statMap} dtks={displayDtks} />
          <PublicationCoveragePanel catalog={publications} />
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
          <EmergencyPublicPage data={emergency} />
          <Panel title="Kapan digunakan?">
            <div className="space-y-2 text-sm font-semibold leading-6 text-civic-muted">
              <p>Transportasi warga sakit, rujukan fasilitas kesehatan, dan kondisi darurat yang membutuhkan koordinasi perangkat desa.</p>
              <p>Informasi layanan memuat pengemudi piket, wilayah layanan, jam aktif, dan nomor yang dapat dihubungi.</p>
            </div>
          </Panel>
        </>
      );
    case "darurat":
      return (
        <>
          <EmergencyPublicPage data={emergency} />
          <Panel title="Dokumen Darurat">
            <PublicationDocuments catalog={publications} types={["emergency"]} empty="Dokumen prosedur darurat belum tersedia." />
          </Panel>
        </>
      );
  }
}

function PPIDPublicPage({ data, onNavigate }: { data: PPIDPublicData | null; onNavigate: (target: MenuTarget) => void }) {
  if (!data) {
    return <LoadingState compact />;
  }

  const { documents, officials, profile } = data;
  if (!profile.isPublished) {
    return <PublicInfoCard icon={ShieldCheck} title="Profil PPID belum dipublikasikan" copy="Pengelola desa sedang menyiapkan profil dan standar layanan informasi publik." tone="green" />;
  }
  const telHref = profile.phone ? `tel:${profile.phone.replace(/[^\d+]/g, "")}` : undefined;
  const emailHref = profile.email ? `mailto:${profile.email}` : undefined;

  return (
    <>
      {data.isSample ? (
        <div className="flex items-start gap-3 rounded-civic-md border border-civic-warning/30 bg-civic-warning-bg px-4 py-3 text-civic-warning-ink" role="status">
          <span className="shrink-0 rounded-full bg-civic-warning-ink px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">Contoh</span>
          <p className="text-xs font-semibold leading-5">Data dan dokumen pada halaman ini masih contoh, belum ditetapkan sebagai informasi resmi Desa Yamansari.</p>
        </div>
      ) : null}

      <Panel title="Pejabat Pengelola Informasi">
        <div className="space-y-3">
          {officials.length ? officials.map((official) => (
            <article key={`${official.role}-${official.id}`} className="flex items-start gap-3 rounded-civic-md border border-civic-border-soft bg-civic-soft p-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-civic-sm bg-village-100 text-village-700">
                <ShieldCheck size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-village-700">{official.role}</p>
                <h3 className="mt-1 break-words text-[15px] font-bold leading-5 text-civic-text">{official.name || "Belum ditetapkan"}</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-civic-muted">{official.position || "Jabatan belum tersedia"}</p>
              </div>
            </article>
          )) : <Empty text="Pejabat PPID belum ditetapkan." />}
        </div>
      </Panel>

      <Panel title="Standar Layanan">
        <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
          <MiniInfo label="Meja layanan" value={profile.serviceAddress} />
          <MiniInfo label="Jadwal" value={profile.serviceSchedule} />
          <MiniInfo label="Biaya" value={profile.feePolicy} />
          <MiniInfo label="Tenggat jawaban" value={`${profile.responseDays} hari kerja + perpanjangan ${profile.extensionDays} hari kerja`} />
        </div>
      </Panel>

      <article className="civic-card bg-village-50 p-4">
        <span className="grid h-12 w-12 place-items-center rounded-civic-md bg-village-100 text-village-700">
          <CheckCircle2 size={23} />
        </span>
        <h2 className="mt-4 text-lg font-bold leading-6 text-civic-text">Maklumat Pelayanan</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-civic-muted">{profile.serviceCommitment}</p>
      </article>

      <Panel title="Tugas & Wewenang">
        <div className="space-y-3 text-sm font-medium leading-6 text-civic-muted">
          <p className="rounded-civic-sm bg-civic-soft px-3.5 py-3">Menghimpun, mendokumentasikan, menyediakan, dan melayani informasi publik desa secara akurat dan mudah dijangkau.</p>
          <p className="rounded-civic-sm bg-civic-soft px-3.5 py-3">Mengoordinasikan pengujian konsekuensi, pemutakhiran daftar informasi, serta jawaban atas permintaan informasi sesuai ketentuan.</p>
        </div>
      </Panel>

      <Panel title="Dokumen Fondasi">
        <div className="space-y-3">
          {documents.length ? documents.map((document) => {
            const content = (
              <>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-civic-sm bg-village-100 text-village-700">
                  <FileText size={21} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="break-words text-sm font-bold leading-5 text-civic-text">{document.title}</span>
                    {document.isSample ? <span className="rounded-full bg-civic-warning-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-civic-warning-ink">Contoh</span> : null}
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-civic-muted">{document.category}{document.publishedAt ? ` · ${document.publishedAt}` : ""}</span>
                </span>
                {document.url ? <ExternalLink className="shrink-0 text-village-700" size={18} aria-hidden="true" /> : null}
              </>
            );

            return document.url ? (
              <a key={document.id} className="flex min-h-16 items-center gap-3 rounded-civic-md border border-civic-border-soft bg-civic-surface p-3.5 transition hover:border-village-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-village-100" href={document.url} target="_blank" rel="noreferrer">
                {content}
              </a>
            ) : (
              <div key={document.id} className="flex min-h-16 items-center gap-3 rounded-civic-md border border-civic-border-soft bg-civic-soft p-3.5">
                {content}
              </div>
            );
          }) : <Empty text="Dokumen fondasi PPID belum dipublikasikan." />}
        </div>
      </Panel>

      <Panel title="Layanan PPID">
        <LargeService title="Permohonan Informasi" copy="Ajukan informasi publik dan simpan token pelacakan." icon={FileText} onClick={() => onNavigate("permohonan-informasi")} />
        <LargeService title="Keberatan Informasi" copy="Ajukan keberatan bila jawaban belum sesuai prosedur." icon={Scale} onClick={() => onNavigate("keberatan-informasi")} />
        <LargeService title="Laporan PPID" copy="Lihat ringkasan layanan, tenggat, dan publikasi informasi." icon={ListChecks} onClick={() => onNavigate("laporan-ppid")} />
      </Panel>

      <article className="civic-card p-4">
        <h2 className="text-lg font-bold leading-6 text-civic-text">Hubungi Desk PPID</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-civic-muted">Gunakan kontak resmi berikut untuk menanyakan ketersediaan informasi dan tata cara layanan.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 min-[375px]:grid-cols-2">
          {telHref ? (
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-4 py-3 text-sm font-semibold text-white" href={telHref}>
              <PhoneCall size={18} /> Telepon
            </a>
          ) : null}
          {emailHref ? (
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-civic-sm border border-civic-border bg-civic-surface px-4 py-3 text-sm font-semibold text-village-800" href={emailHref}>
              <Mail size={18} /> Email
            </a>
          ) : null}
        </div>
      </article>
    </>
  );
}

function PublicInfoCard({ copy, icon: Icon, title, tone }: { copy: string; icon: typeof Home; title: string; tone: string }) {
  return (
    <article className="civic-card p-4">
      <span className={`grid h-12 w-12 place-items-center rounded-civic-md ${toneClass(tone)}`}>
        <Icon size={22} />
      </span>
      <h2 className="mt-4 text-lg font-bold leading-6 text-civic-text">{title}</h2>
      <p className="mt-2 text-sm leading-[22px] text-civic-muted">{copy}</p>
    </article>
  );
}

function OfficialRow({ item }: { item: (typeof dummyOfficials)[number] }) {
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-civic-border-soft bg-civic-soft p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-village-100 text-village-700">
        <UsersRound size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold leading-snug text-civic-text">{item.role}</p>
        <p className="mt-1 text-[15px] font-bold leading-snug text-village-700">{item.name}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-civic-muted">{item.area}</p>
        <p className="mt-2 text-xs font-bold text-civic-muted">{item.phone}</p>
      </div>
    </article>
  );
}

function BudgetRow({ item }: { item: (typeof dummyBudgetRows)[number] }) {
  return (
    <article className="rounded-2xl border border-civic-border-soft bg-civic-soft p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-snug text-civic-text">{item.label}</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-civic-muted">{item.note}</p>
        </div>
        <strong className="shrink-0 text-sm font-bold text-village-700">{item.percent}%</strong>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-civic-surface">
        <div className="h-full rounded-full bg-village-600" style={{ width: `${item.percent}%` }} />
      </div>
      <p className="mt-3 text-[15px] font-bold text-civic-text">{rupiah(item.value)}</p>
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
      <div className="flex gap-3 rounded-2xl border border-village-100 bg-village-50 p-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-civic-surface text-village-700">
          <Icon size={21} />
        </span>
        <p className="text-sm font-semibold leading-6 text-village-900">{copy}</p>
      </div>
      {items.map((item) => <DocumentRow key={`${item.category}-${item.title}`} item={item} />)}
    </Panel>
  );
}

function DocumentRow({ item }: { item: { title: string; category: string; date: string; status: string } }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-2xl border border-civic-border-soft bg-civic-soft p-3.5">
      <div className="min-w-0">
        <span className="inline-flex rounded-full bg-village-100 px-2.5 py-1 text-xs font-bold text-village-700">{item.category}</span>
        <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-civic-text">{item.title}</h3>
        <p className="mt-1 text-xs font-semibold text-civic-muted">{item.date}</p>
      </div>
      <span className="shrink-0 rounded-full bg-civic-surface px-3 py-1 text-xs font-bold text-civic-muted">{item.status}</span>
    </article>
  );
}

function AnnouncementRow({ item }: { item: (typeof dummyAnnouncements)[number] }) {
  return (
    <article className="rounded-2xl border border-civic-border-soft bg-civic-soft p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-village-100 px-2.5 py-1 text-xs font-bold text-village-700">{item.category}</span>
          <h3 className="mt-2 line-clamp-2 text-[15px] font-bold leading-snug text-civic-text">{item.title}</h3>
        </div>
        <span className="shrink-0 text-xs font-bold text-civic-muted">{item.date}</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-civic-muted">{item.copy}</p>
    </article>
  );
}

function ContactRow({ item }: { item: (typeof dummyEmergencyContacts)[number] }) {
  return (
    <article className="flex items-start gap-3 rounded-2xl border border-civic-border-soft bg-civic-soft p-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-village-100 text-village-700">
        <PhoneCall size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-civic-text">{item.label}</p>
        <p className="mt-1 text-[15px] font-bold text-village-700">{item.value}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-civic-muted">{item.note}</p>
      </div>
    </article>
  );
}

function ProgramRow({ item }: { item: ProgramBantuan }) {
  const title = cleanPublicText(item.nama);
  const description = cleanPublicText(item.deskripsi ?? item.sasaran.label);

  return (
    <article className="rounded-2xl bg-civic-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-civic-text">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-civic-muted">{description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-village-100 px-3 py-1 text-xs font-bold text-village-700">{item.status}</span>
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
    <form className="civic-card p-4" onSubmit={submit}>
      <h2 className="text-lg font-bold leading-6 text-civic-text">Kirim Pengaduan</h2>
      <p className="mt-1 text-sm leading-[22px] text-civic-muted">Sampaikan laporan secara jelas agar perangkat desa dapat menindaklanjuti.</p>
      <label className="mt-4 block text-sm font-semibold text-civic-text">
        Nama
        <input className="civic-control mt-2 h-12 w-full px-4 text-base outline-none focus:border-village-600" value={form.nama} onChange={(event) => setForm((current) => ({ ...current, nama: event.target.value }))} required />
      </label>
      <label className="mt-3 block text-sm font-semibold text-civic-text">
        Nomor HP
        <input className="civic-control mt-2 h-12 w-full px-4 text-base outline-none focus:border-village-600" inputMode="tel" value={form.telepon} onChange={(event) => setForm((current) => ({ ...current, telepon: event.target.value }))} />
      </label>
      <label className="mt-3 block text-sm font-semibold text-civic-text">
        Judul
        <input className="civic-control mt-2 h-12 w-full px-4 text-base outline-none focus:border-village-600" value={form.judul} onChange={(event) => setForm((current) => ({ ...current, judul: event.target.value }))} />
      </label>
      <label className="mt-3 block text-sm font-semibold text-civic-text">
        Isi Pengaduan
        <textarea className="civic-control mt-2 min-h-28 w-full px-4 py-3 text-base outline-none focus:border-village-600" value={form.isi} onChange={(event) => setForm((current) => ({ ...current, isi: event.target.value }))} required />
      </label>
      <button className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-5 text-base font-semibold text-white transition-colors hover:bg-village-900 disabled:opacity-50" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Kirim Pengaduan
      </button>
    </form>
  );
}

function EmergencyContact({ copy, phone, title }: { copy: string; phone: string; title: string }) {
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined;
  const waHref = phone ? `https://wa.me/${phone.replace(/[^\d]/g, "")}` : undefined;

  return (
    <article className="civic-card bg-civic-soft p-4">
      <span className="grid h-14 w-14 place-items-center rounded-civic-md bg-village-100 text-village-700">
        <PhoneCall size={28} />
      </span>
      <h2 className="mt-4 text-[21px] font-bold leading-tight text-civic-text">{title}</h2>
      <p className="mt-2 text-sm leading-[22px] text-civic-muted">{copy}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {telHref ? (
          <a className="inline-flex h-12 items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-4 text-sm font-semibold text-white" href={telHref}>
            <PhoneCall size={18} /> Telepon
          </a>
        ) : (
          <span className="inline-flex h-12 items-center justify-center rounded-civic-sm bg-civic-surface px-4 text-sm font-semibold text-civic-subtle">Telepon</span>
        )}
        {waHref ? (
          <a className="inline-flex h-12 items-center justify-center gap-2 rounded-civic-sm border border-civic-border bg-civic-surface px-4 text-sm font-semibold text-village-800" href={waHref} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> WhatsApp
          </a>
        ) : (
          <span className="inline-flex h-12 items-center justify-center rounded-civic-sm bg-civic-surface px-4 text-sm font-semibold text-civic-subtle">WhatsApp</span>
        )}
      </div>
    </article>
  );
}

function PPIDAdminPage({ onBack, villageName }: { onBack: () => void; villageName: string }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<AdminPPIDPayload | null>(null);
  const [profile, setProfile] = useState<PPIDProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<AdminPPIDPayload>("/admin/ppid");
      setData(response);
      setProfile(response.profile);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Data PPID admin belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    restoreAdminSession()
      .then(async (user) => {
        if (!mounted) return;
        setAdmin(user);
        await loadAdminData();
      })
      .catch(() => {
        if (mounted) setAdmin(null);
      })
      .finally(() => {
        if (mounted) setAuthChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, [loadAdminData]);

  function updateProfile<K extends keyof PPIDProfile>(key: K, value: PPIDProfile[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading("login");
    setError(null);
    setMessage(null);
    try {
      const user = await loginAdmin(loginForm);
      setAdmin(user);
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
      await logoutAdmin();
    } catch {
      // UI tetap dibersihkan ketika session upstream sudah kedaluwarsa.
    } finally {
      setAdmin(null);
      setData(null);
      setProfile(null);
      setActionLoading(null);
      setMessage("Session admin ditutup.");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !data?.canEdit) return;
    setActionLoading("save");
    setError(null);
    setMessage(null);
    try {
      const updated = await apiPost<PPIDPublicData>("/admin/ppid", profile);
      setProfile(updated.profile);
      setData((current) => current ? { ...current, ...updated } : current);
      setMessage("Profil dan standar layanan PPID tersimpan.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profil PPID belum bisa disimpan.");
    } finally {
      setActionLoading(null);
    }
  }

  async function seedSample() {
    setActionLoading("seed");
    setError(null);
    setMessage(null);
    try {
      const result = await apiPost<AdminPPIDSeedResult>("/admin/ppid/seed-sample", {});
      setMessage(`Data contoh siap: ${result.documentsCreated} dokumen dibuat, ${result.documentsUpdated} diperbarui.`);
      await loadAdminData();
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Data contoh PPID belum bisa dibuat.");
    } finally {
      setActionLoading(null);
    }
  }

  const shell = (children: ReactNode) => (
    <main className="min-h-screen bg-cream-50 text-civic-text md:py-6">
      <section className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden bg-cream-50 md:rounded-civic-xl md:border md:border-civic-border md:shadow-civic-md">
        <div className="px-4 pb-12 pt-5">{children}</div>
      </section>
    </main>
  );

  if (!authChecked) {
    return shell(
      <>
        <AdminPageHeader admin={null} onBack={onBack} onLogout={handleLogout} section="Admin PPID" villageName={villageName} />
        <LoadingState />
      </>,
    );
  }

  if (!admin) {
    return shell(
      <>
        <AdminPageHeader admin={null} onBack={onBack} onLogout={handleLogout} section="Admin PPID" villageName={villageName} />
        <section className="civic-card mt-8 bg-village-50 p-5">
          <div className="grid h-14 w-14 place-items-center rounded-civic-md bg-village-700 text-white"><ShieldCheck size={28} /></div>
          <h2 className="mt-5 text-[28px] font-bold leading-tight text-civic-text">Login pengelola PPID</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-civic-muted">Masuk dengan akun admin OpenSID untuk mengatur profil dan standar layanan PPID.</p>
        </section>
        <form className="mt-5 space-y-4" onSubmit={handleLogin}>
          <AdminLoginFields form={loginForm} onChange={setLoginForm} />
          {error ? <StatusNotice tone="error" text={error} /> : null}
          <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-5 text-sm font-semibold text-white shadow-civic-sm disabled:opacity-50" disabled={actionLoading === "login"} type="submit">
            {actionLoading === "login" ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />} Masuk Dashboard
          </button>
        </form>
      </>,
    );
  }

  return shell(
    <>
      <AdminPageHeader admin={admin} onBack={onBack} onLogout={handleLogout} section="Admin PPID" villageName={villageName} />
      <section className="civic-card mt-6 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-village-100 px-3 py-1.5 text-xs font-bold text-village-800">Profil layanan</span>
          {data?.isSample ? <span className="rounded-full bg-civic-warning-bg px-3 py-1.5 text-xs font-bold text-civic-warning-ink">Contoh</span> : null}
          {data && !data.canEdit ? <span className="rounded-full bg-civic-danger-bg px-3 py-1.5 text-xs font-bold text-civic-danger">Baca saja</span> : null}
        </div>
        <h2 className="mt-4 text-[26px] font-bold leading-tight text-civic-text">Profil PPID Desa</h2>
        <p className="mt-2 text-sm font-medium leading-6 text-civic-muted">Pejabat mengikuti data pamong OpenSID. Berkas tetap dikelola melalui modul Informasi Publik OpenSID.</p>
      </section>

      {message ? <StatusNotice tone="success" text={message} /> : null}
      {error ? <StatusNotice tone="error" text={error} /> : null}
      {loading || !profile || !data ? <LoadingState /> : (
        <>
          <form className="mt-6 space-y-5" onSubmit={saveProfile}>
            <Panel title="Pejabat PPID">
              <div className="space-y-4">
                <AdminSelect label="Atasan PPID" value={profile.supervisorPamongId} options={data.pamongOptions} disabled={!data.canEdit} onChange={(value) => updateProfile("supervisorPamongId", value)} />
                <AdminSelect label="PPID" value={profile.ppidPamongId} options={data.pamongOptions} disabled={!data.canEdit} onChange={(value) => updateProfile("ppidPamongId", value)} />
                <AdminSelect label="Petugas layanan" value={profile.serviceOfficerPamongId} options={data.pamongOptions} disabled={!data.canEdit} onChange={(value) => updateProfile("serviceOfficerPamongId", value)} />
              </div>
            </Panel>

            <Panel title="Meja Layanan">
              <div className="space-y-4">
                <AdminTextField label="Alamat meja layanan" value={profile.serviceAddress} disabled={!data.canEdit} required onChange={(value) => updateProfile("serviceAddress", value)} />
                <AdminTextField label="Jadwal layanan" value={profile.serviceSchedule} disabled={!data.canEdit} required onChange={(value) => updateProfile("serviceSchedule", value)} />
                <div className="grid grid-cols-1 gap-4 min-[390px]:grid-cols-2">
                  <AdminTextField label="Telepon" value={profile.phone} disabled={!data.canEdit} inputMode="tel" onChange={(value) => updateProfile("phone", value)} />
                  <AdminTextField label="Email" value={profile.email} disabled={!data.canEdit} type="email" onChange={(value) => updateProfile("email", value)} />
                </div>
                <AdminTextArea label="Kebijakan biaya" value={profile.feePolicy} disabled={!data.canEdit} required onChange={(value) => updateProfile("feePolicy", value)} />
                <AdminTextArea label="Maklumat singkat" value={profile.serviceCommitment} disabled={!data.canEdit} required onChange={(value) => updateProfile("serviceCommitment", value)} />
                <div className="grid grid-cols-2 gap-4">
                  <AdminNumberField label="Jawaban (hari)" value={profile.responseDays} disabled={!data.canEdit} min={1} max={30} onChange={(value) => updateProfile("responseDays", value)} />
                  <AdminNumberField label="Perpanjangan" value={profile.extensionDays} disabled={!data.canEdit} min={0} max={14} onChange={(value) => updateProfile("extensionDays", value)} />
                </div>
                <div className="space-y-3 rounded-civic-md bg-civic-soft p-3.5">
                  <AdminCheckbox label="Tampilkan profil kepada publik" checked={profile.isPublished} disabled={!data.canEdit} onChange={(checked) => updateProfile("isPublished", checked)} />
                  <AdminCheckbox label="Tandai sebagai data contoh" checked={profile.isSample} disabled={!data.canEdit} onChange={(checked) => updateProfile("isSample", checked)} />
                </div>
              </div>
            </Panel>

            <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-5 py-3 text-sm font-semibold text-white shadow-civic-sm disabled:opacity-50" disabled={!data.canEdit || actionLoading === "save"} type="submit">
              {actionLoading === "save" ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Simpan Profil PPID
            </button>
          </form>

          <section className="mt-7">
            <SectionHeader title="Dokumen Informasi Publik" action={`${data.documents.length} dokumen`} />
            <div className="mt-3 space-y-3">
              {data.documents.length ? data.documents.map((document) => (
                <article key={document.id} className="rounded-civic-md border border-civic-border bg-civic-surface p-4 shadow-civic-sm">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-civic-sm bg-village-100 text-village-700"><FileText size={21} /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-bold leading-5 text-civic-text">{document.title}</h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-civic-muted">{document.category}{document.isSample ? " · Contoh" : ""}</p>
                    </div>
                    {document.url ? <a className="grid h-11 w-11 shrink-0 place-items-center rounded-civic-sm bg-civic-soft text-village-700" href={document.url} target="_blank" rel="noreferrer" aria-label={`Buka ${document.title}`}><ExternalLink size={18} /></a> : null}
                  </div>
                </article>
              )) : <Empty text="Belum ada dokumen PPID yang terbit." />}
            </div>
            <a className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-civic-sm border border-civic-border bg-civic-surface px-4 py-3 text-center text-sm font-semibold text-village-800" href={data.openSidAdminUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={18} /> Kelola Dokumen di OpenSID
            </a>
          </section>

          {data.sampleAvailable ? (
            <section className="mt-7 rounded-civic-lg border border-civic-warning/30 bg-civic-warning-bg p-4">
              <h2 className="text-base font-bold text-civic-text">Data contoh lokal</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-civic-muted">Seed aman dijalankan ulang dan tidak membuat dokumen ganda.</p>
              <button className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-civic-sm bg-civic-warning px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={!data.canEdit || actionLoading === "seed"} onClick={() => void seedSample()} type="button">
                {actionLoading === "seed" ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />} Isi Empat Dokumen Contoh
              </button>
            </section>
          ) : null}
        </>
      )}
    </>,
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
        const user = await restoreAdminSession();
        if (!mounted) return;
        setAdmin(user);
        await loadAdminData();
      } catch {
        if (mounted) setAdmin(null);
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
    { label: "Anggota", value: summary.anggota, unit: "Jiwa", tone: "green", icon: UsersRound },
    { label: "Draft", value: draftCount, unit: "Data", tone: "green", icon: FileText },
    { label: "Final", value: finalCount, unit: "Data", tone: "green", icon: CheckCircle2 },
  ];

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionLoading("login");
    setError(null);
    setMessage(null);
    try {
      const user = await loginAdmin(loginForm);
      setAdmin(user);
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
      await logoutAdmin();
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
    <main className="min-h-screen bg-cream-50 text-civic-text md:py-6">
      <section className="relative mx-auto min-h-screen w-full max-w-[430px] overflow-x-hidden bg-cream-50 md:rounded-civic-xl md:border md:border-civic-border md:shadow-civic-md">
        {children}
      </section>
    </main>
  );

  if (!authChecked) {
    return shell(
      <div className="px-4 pb-10 pt-5">
        <AdminPageHeader admin={null} onBack={onBack} onLogout={handleLogout} section="Admin DTKS" villageName={villageName} />
        <LoadingState />
      </div>,
    );
  }

  if (!admin) {
    return shell(
      <div className="flex min-h-screen flex-col px-4 pb-10 pt-5">
        <AdminPageHeader admin={null} onBack={onBack} onLogout={handleLogout} section="Admin DTKS" villageName={villageName} />
        <section className="civic-card mt-8 bg-village-50 p-5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-village-700 text-white">
            <ShieldCheck size={28} />
          </div>
          <h2 className="mt-5 text-[28px] font-bold leading-tight text-civic-text">Login admin DTKS</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-civic-muted">
            Halaman ini khusus pengelola desa. Masuk untuk membuka dan mengelola detail DTKS.
          </p>
        </section>

        <form className="mt-5 space-y-4" onSubmit={handleLogin}>
          <label className="block">
            <span className="text-sm font-bold text-civic-text">Username</span>
            <input
              className="civic-control mt-2 h-12 w-full px-4 text-base font-semibold outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-100"
              autoComplete="username"
              value={loginForm.username}
              onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-civic-text">Password</span>
            <input
              className="civic-control mt-2 h-12 w-full px-4 text-base font-semibold outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-100"
              type="password"
              autoComplete="current-password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
            />
          </label>
          {error ? <StatusNotice tone="error" text={error} /> : null}
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-5 text-sm font-semibold text-white shadow-civic-sm disabled:opacity-50"
            disabled={actionLoading === "login"}
            type="submit"
          >
            {actionLoading === "login" ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
            Masuk Dashboard
          </button>
        </form>

      </div>,
    );
  }

  return (
    shell(
      <div className="px-4 pb-10 pt-5">
        <AdminPageHeader admin={admin} onBack={onBack} onLogout={handleLogout} section="Admin DTKS" villageName={villageName} />

        <section className="relative mt-6 overflow-hidden rounded-civic-xl bg-village-800 p-5 text-white shadow-civic-md">
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
          <div className="absolute inset-0 bg-village-950/75" />
          <div className="relative">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-civic-surface/15 px-3 py-1.5 text-xs font-bold">Admin</span>
              <span className="rounded-full bg-civic-surface/15 px-3 py-1.5 text-xs font-bold">{location}</span>
            </div>
            <h2 className="mt-4 max-w-[310px] text-[28px] font-bold leading-tight">Dashboard DTKS Admin</h2>
            <p className="mt-3 max-w-[300px] text-[15px] font-medium leading-6 text-village-50">
              Pantau ruta, buka detail keluarga, dan kelola data DTKS desa.
            </p>
          </div>
        </section>

        {message ? <StatusNotice tone="success" text={message} /> : null}
        {error ? <StatusNotice tone="error" text={error} /> : null}

        <section className="mt-7">
          <SectionHeader title="Ringkasan Admin" />
          <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {metrics.map((item) => (
              <DtksMetric key={item.label} icon={item.icon} label={item.label} tone={item.tone} unit={item.unit} value={item.value} />
            ))}
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-civic-border bg-civic-surface px-4 text-sm font-bold text-civic-text disabled:opacity-60"
            disabled={loading}
            onClick={() => void loadAdminData()}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
            Muat Ulang
          </button>
          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-village-700 px-4 text-sm font-bold text-white disabled:opacity-60"
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
            {!loading && !items.length ? <Empty text="Belum ada data DTKS." /> : null}
            {items.map((item) => (
              <button
                key={item.id}
                className="w-full rounded-civic-lg border border-civic-border bg-civic-surface p-4 text-left shadow-civic-sm transition active:scale-[0.99]"
                onClick={() => void openDetail(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-bold leading-tight text-civic-text">{item.kepalaKeluarga || "Kepala keluarga belum tercatat"}</p>
                    <p className="mt-1 text-sm font-semibold text-civic-muted">KK {item.noKk || "-"} · {item.anggotaCount} anggota</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.isDraft ? "bg-civic-warning-bg text-civic-warning" : "bg-village-50 text-village-700"}`}>
                    {item.isDraft ? "Draft" : "Final"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold text-civic-muted">
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <MapPin size={16} />
                    <span className="truncate">{wilayahLabel(item)}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-village-700">
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

function AdminPageHeader({
  admin,
  onBack,
  onLogout,
  section,
  villageName,
}: {
  admin: AdminUser | null;
  onBack: () => void;
  onLogout: () => void;
  section: string;
  villageName: string;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <button className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-civic-border-soft text-civic-text" onClick={onBack} aria-label="Kembali ke portal">
        <ChevronRight className="rotate-180" size={24} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-village-700">{section}</p>
        <h1 className="truncate text-[22px] font-bold leading-tight text-civic-text">Desa {villageName}</h1>
      </div>
      {admin ? (
        <button className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-civic-border-soft text-civic-text" onClick={onLogout} aria-label="Keluar admin">
          <LogOut size={21} />
        </button>
      ) : (
        <span className="rounded-full bg-civic-border-soft px-3 py-1.5 text-xs font-bold text-civic-muted">Private</span>
      )}
    </header>
  );
}

function AdminLoginFields({
  form,
  onChange,
}: {
  form: { username: string; password: string };
  onChange: (value: { username: string; password: string }) => void;
}) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-bold text-civic-text">Username</span>
        <input className="civic-control mt-2 h-12 w-full px-4 text-base font-semibold outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-100" autoComplete="username" value={form.username} onChange={(event) => onChange({ ...form, username: event.target.value })} />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-civic-text">Password</span>
        <input className="civic-control mt-2 h-12 w-full px-4 text-base font-semibold outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-100" type="password" autoComplete="current-password" value={form.password} onChange={(event) => onChange({ ...form, password: event.target.value })} />
      </label>
    </>
  );
}

function AdminSelect({
  disabled,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: number) => void;
  options: AdminPPIDPayload["pamongOptions"];
  value: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-civic-text">{label}</span>
      <select className="civic-control mt-2 min-h-12 w-full px-3 text-sm font-semibold text-civic-text outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-100 disabled:opacity-60" disabled={disabled} required value={value} onChange={(event) => onChange(Number(event.target.value))}>
        <option value={0}>Pilih pamong aktif</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name} - {option.position}</option>)}
      </select>
    </label>
  );
}

function AdminTextField({
  disabled,
  inputMode,
  label,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  disabled: boolean;
  inputMode?: "email" | "search" | "tel" | "text" | "url" | "none" | "numeric" | "decimal";
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-civic-text">{label}</span>
      <input className="civic-control mt-2 min-h-12 w-full px-4 text-sm font-semibold text-civic-text outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-100 disabled:opacity-60" disabled={disabled} inputMode={inputMode} required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AdminTextArea({ disabled, label, onChange, required = false, value }: { disabled: boolean; label: string; onChange: (value: string) => void; required?: boolean; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-civic-text">{label}</span>
      <textarea className="civic-control mt-2 min-h-28 w-full resize-y px-4 py-3 text-sm font-semibold leading-6 text-civic-text outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-100 disabled:opacity-60" disabled={disabled} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function AdminNumberField({ disabled, label, max, min, onChange, value }: { disabled: boolean; label: string; max: number; min: number; onChange: (value: number) => void; value: number }) {
  return (
    <label className="block min-w-0">
      <span className="block text-sm font-bold leading-5 text-civic-text">{label}</span>
      <input className="civic-control mt-2 min-h-12 w-full px-3 text-sm font-semibold text-civic-text outline-none transition focus:border-village-500 focus:ring-4 focus:ring-village-100 disabled:opacity-60" disabled={disabled} max={max} min={min} required type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function AdminCheckbox({ checked, disabled, label, onChange }: { checked: boolean; disabled: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold leading-5 text-civic-text">
      <input className="h-5 w-5 shrink-0 accent-village-700" checked={checked} disabled={disabled} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function StatusNotice({ text, tone }: { text: string; tone: "error" | "success" }) {
  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${tone === "error" ? "border-civic-danger/30 bg-civic-danger-bg text-civic-danger" : "border-village-100 bg-village-50 text-village-800"}`} role={tone === "error" ? "alert" : "status"}>
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
    <article className="mt-7 rounded-civic-xl border border-civic-border bg-civic-surface p-4 shadow-civic-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-village-700">Detail ruta</p>
          <h2 className="mt-1 truncate text-xl font-bold leading-tight text-civic-text">{item.kepalaKeluarga || "Kepala keluarga"}</h2>
          <p className="mt-1 text-sm font-semibold text-civic-muted">KK {item.noKk || "-"} · {wilayahLabel(item)}</p>
        </div>
        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-civic-border-soft text-civic-muted" onClick={onClose} aria-label="Tutup detail">
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
        <h3 className="text-sm font-bold text-civic-text">Indikator cepat</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {indicators.map((indicator) => (
            <MiniInfo key={indicator.label} label={indicator.label} value={indicator.value} />
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-bold text-civic-text">Anggota keluarga</h3>
        <div className="mt-3 space-y-2">
          {detail.anggota.length ? detail.anggota.map((anggota) => (
            <div key={anggota.id} className="flex items-center justify-between gap-3 rounded-2xl bg-civic-soft px-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-civic-text">{anggota.nama || "Nama belum tercatat"}</p>
                <p className="text-xs font-semibold text-civic-muted">{maskNik(anggota.nik)} · {yesNoLabel(anggota.bekerja)}</p>
              </div>
              <span className="shrink-0 text-xs font-bold text-village-700">{rupiah(anggota.pendapatanSebulan)}</span>
            </div>
          )) : <Empty text="Anggota DTKS belum tercatat" />}
        </div>
      </section>

      {item.catatan ? <p className="mt-4 rounded-2xl bg-civic-warning-bg px-4 py-3 text-sm font-semibold leading-6 text-civic-warning">{item.catatan}</p> : null}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-village-700 px-4 text-sm font-bold text-white disabled:opacity-60"
          disabled={loading}
          onClick={onToggleStatus}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
          {item.isDraft ? "Finalkan" : "Jadikan Draft"}
        </button>
        <a
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-civic-border bg-civic-surface px-4 text-sm font-bold text-civic-text"
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
    <div className="rounded-2xl border border-civic-border-soft bg-civic-soft p-3">
      <p className="text-xs font-semibold text-civic-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-bold leading-snug text-civic-text">{value}</p>
    </div>
  );
}

function DtksMetric({ icon: Icon, label, tone, unit, value }: { icon: typeof Home; label: string; tone: string; unit: string; value: number }) {
  return (
    <article className="flex h-[95px] min-w-[168px] items-center gap-3 rounded-civic-lg border border-civic-border bg-civic-surface px-3.5 shadow-civic-sm">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${toneClass(tone)}`}>
        <Icon size={24} />
      </span>
      <div>
        <p className="text-[13px] font-medium text-civic-muted">{label}</p>
        <strong className="mt-1 block text-[21px] font-bold leading-none text-village-700">{formatNumber(value)}</strong>
        <span className="mt-1 block text-[13px] font-medium text-civic-muted">{unit}</span>
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
      <section className="rounded-civic-xl bg-village-800 p-5 text-white shadow-civic-md">
        <p className="text-sm font-semibold text-white/80">Layanan Mandiri</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold tracking-normal">{user.nama}</h2>
            <p className="mt-1 text-sm font-medium text-white/80">{maskNik(user.nik)}</p>
          </div>
          <button
            className="grid h-12 w-12 shrink-0 place-items-center rounded-civic-md bg-civic-surface/15"
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
    <div className="space-y-3">
      {displayItems.map((item, index) => (
        <article key={item.id} className="civic-card flex min-h-[96px] gap-3 p-3">
          <img
            src={item.gambarUrl ?? HERO_IMAGE}
            srcSet={item.gambarUrl ? undefined : HERO_IMAGE_SRCSET}
            sizes={item.gambarUrl ? undefined : "80px"}
            alt=""
            className="h-[72px] w-24 shrink-0 rounded-xl object-cover"
            decoding="async"
            height={156}
            loading="lazy"
            width={172}
          />
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-village-100 px-2 py-0.5 text-[11px] font-medium text-village-800">
              {index % 2 === 0 ? "Pembangunan" : "Pemerintahan"}
            </span>
            <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-civic-text">{cleanPublicText(item.judul)}</h3>
            <p className="mt-1 text-xs leading-[18px] text-civic-muted">{item.tanggal ?? "21 Mei 2025"}</p>
          </div>
          <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Buka ${cleanPublicText(item.judul)}`} className="ml-auto grid h-11 w-8 shrink-0 place-items-center text-civic-muted"><ChevronRight size={20} /></a>
        </article>
      ))}
    </div>
  );
}

function AgendaCard() {
  return (
    <article className="civic-card flex min-h-[104px] items-center gap-3 p-3">
      <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-village-50 text-village-800">
        <strong className="text-2xl font-bold leading-6">{fallbackAgenda.date}</strong>
        <span className="mt-1 text-[11px] font-semibold uppercase leading-3">{fallbackAgenda.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-civic-text">{fallbackAgenda.title}</h3>
        <p className="mt-2 flex items-center gap-1.5 text-xs leading-[18px] text-civic-muted"><CalendarDays size={14} /> {fallbackAgenda.time}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs leading-[18px] text-civic-muted"><MapPin size={14} /> {fallbackAgenda.place}</p>
      </div>
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
    <form className="civic-card p-4" onSubmit={submit}>
      <span className="grid h-14 w-14 place-items-center rounded-civic-md bg-village-100 text-village-700">
        <ShieldCheck size={30} />
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-normal text-civic-text">Masuk Layanan Mandiri</h2>
      <p className="mt-1 text-sm leading-[22px] text-civic-muted">Gunakan NIK dan PIN untuk mengurus surat serta melihat arsip layanan.</p>
      <label className="mt-5 block text-sm font-semibold text-civic-text">
        NIK
        <input className="civic-control mt-2 h-12 w-full px-4 text-base outline-none focus:border-village-600" value={nik} onChange={(event) => setNik(event.target.value)} inputMode="numeric" autoComplete="username" />
      </label>
      <label className="mt-4 block text-sm font-semibold text-civic-text">
        PIN
        <input className="civic-control mt-2 h-12 w-full px-4 text-base outline-none focus:border-village-600" value={pin} onChange={(event) => setPin(event.target.value)} type="password" inputMode="numeric" autoComplete="current-password" />
      </label>
      <button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-5 text-base font-semibold text-white disabled:opacity-50" disabled={busy}>
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
    <form className="civic-card p-4" onSubmit={submit}>
      <h2 className="text-xl font-bold tracking-normal text-civic-text">Permohonan Surat</h2>
      <p className="mt-1 text-sm leading-[22px] text-civic-muted">{templates.length} template tersedia</p>
      <label className="mt-4 block text-sm font-semibold text-civic-text">
        Jenis surat
      <select className="civic-control mt-2 h-12 w-full px-4 text-base outline-none focus:border-village-600" value={idSurat} onChange={(event) => setIdSurat(event.target.value)} required>
        <option value="">Pilih template</option>
        {templates.map((item) => <option value={item.id} key={item.id}>{item.nama}</option>)}
      </select>
      </label>
      <label className="mt-3 block text-sm font-semibold text-civic-text">Nomor HP aktif
        <input className="civic-control mt-2 h-12 w-full px-4 text-base outline-none focus:border-village-600" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" required />
      </label>
      <label className="mt-3 block text-sm font-semibold text-civic-text">Keperluan
        <textarea className="civic-control mt-2 min-h-24 w-full px-4 py-3 text-base outline-none focus:border-village-600" value={keperluan} onChange={(event) => setKeperluan(event.target.value)} />
      </label>
      <label className="mt-3 block text-sm font-semibold text-civic-text">Keterangan tambahan
        <input className="civic-control mt-2 h-12 w-full px-4 text-base outline-none focus:border-village-600" value={keterangan} onChange={(event) => setKeterangan(event.target.value)} />
      </label>
      {selected?.syarat.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.syarat.map((item) => <span className="rounded-full bg-village-50 px-3 py-1.5 text-xs font-semibold text-village-700" key={item.id}>{item.nama ?? `Syarat ${item.id}`}: fisik</span>)}
        </div>
      ) : null}
      <button className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-civic-sm bg-village-800 px-5 text-base font-semibold text-white disabled:opacity-50" disabled={busy || !selected}>
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
    <div className="rounded-2xl border border-civic-border-soft bg-civic-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-civic-text">{item.nama_surat}</h3>
          <p className="mt-1 text-sm font-medium text-civic-muted">{item.created_at}</p>
        </div>
        <span className="rounded-full bg-village-100 px-3 py-1 text-xs font-bold text-village-700">{item.status.label}</span>
      </div>
      {canCancel ? (
        <button className="mt-3 h-10 rounded-xl bg-civic-surface px-3 text-sm font-bold text-civic-danger" onClick={cancel}>Batalkan</button>
      ) : null}
    </div>
  );
}

function ArsipRow({ item }: { item: ArsipSurat }) {
  return (
    <a className="flex items-center justify-between gap-3 rounded-2xl border border-civic-border-soft bg-civic-soft p-4" href={item.cetak_url} target="_blank" rel="noreferrer">
      <div className="min-w-0">
        <h3 className="line-clamp-1 text-[15px] font-bold text-civic-text">{item.nama_surat ?? item.nama_format ?? "Surat"}</h3>
        <p className="mt-1 text-sm font-medium text-civic-muted">{item.no_surat ?? item.tanggal}</p>
      </div>
      <ChevronRight size={23} className="shrink-0 text-civic-muted" />
    </a>
  );
}

function DevelopmentRow({ item }: { item: Pembangunan }) {
  return (
    <article className="flex gap-3 rounded-2xl border border-civic-border-soft bg-civic-soft p-3">
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
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-civic-text">{cleanPublicText(item.judul)}</h3>
        <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-civic-muted">{cleanPublicText(item.lokasi ?? item.ringkasan)}</p>
        <p className="mt-2 text-sm font-bold text-village-700">{rupiah(item.anggaran)}</p>
      </div>
    </article>
  );
}

function LargeService({ title, copy, icon: Icon, onClick }: { title: string; copy: string; icon: typeof Home; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-4 rounded-2xl bg-civic-soft p-4 text-left" onClick={onClick}>
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-village-100 text-village-700">
        <Icon size={27} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-[16px] leading-snug text-civic-text">{title}</strong>
        <span className="mt-1 block text-sm font-medium leading-snug text-civic-muted">{copy}</span>
      </span>
      <ChevronRight size={23} className="shrink-0 text-civic-muted" />
    </button>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="civic-card space-y-3 p-4">
      <h2 className="text-lg font-bold leading-6 text-civic-text">{title}</h2>
      {children}
    </section>
  );
}

function SectionHeader({ action, title, onClick }: { action?: string; title: string; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-lg font-bold leading-6 text-civic-text">{title}</h2>
      {onClick ? (
        <button className="inline-flex min-h-11 items-center gap-1 rounded-civic-sm px-2 text-sm font-medium text-village-800" onClick={onClick}>
          Lihat semua <ChevronRight size={16} />
        </button>
      ) : action ? (
        <span className="text-right text-xs font-semibold leading-4 text-civic-muted">{action}</span>
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
      <button className="absolute inset-0 bg-village-950/50" aria-label="Tutup menu" onClick={onClose} />
      <section className="relative w-full max-w-[430px] rounded-t-civic-xl border border-civic-border bg-civic-surface px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 shadow-civic-md">
        <div className="mx-auto h-1.5 w-24 rounded-full bg-civic-subtle" />
        <button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-civic-md bg-civic-soft text-civic-muted" onClick={onClose} aria-label="Tutup drawer">
          <X size={20} />
        </button>
        <div className="mt-5 text-center">
          <h2 className="text-[18px] font-bold leading-tight text-civic-text">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-civic-muted">{subtitle}</p>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="min-h-[104px] rounded-civic-lg border border-civic-border bg-civic-soft px-2.5 py-3 text-center transition-colors active:bg-village-100"
                onClick={() => onNavigate(item.target)}
              >
                <span className={`mx-auto grid h-10 w-10 place-items-center rounded-xl ${toneClass(item.tone)}`}>
                  <Icon size={21} />
                </span>
                <span className="mt-2 block text-[12px] font-bold leading-tight text-civic-text">{item.label}</span>
                <span className="mt-1 block text-[11px] leading-4 text-civic-muted">{item.description}</span>
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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-civic-border bg-civic-surface" aria-label="Navigasi bawah">
      <div className="mx-auto grid min-h-[72px] max-w-[430px] grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {bottomTabs.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button key={item.key} className={`flex min-h-[72px] flex-col items-center justify-center gap-1 text-[11px] font-medium leading-4 ${active ? "text-village-700" : "text-civic-muted"}`} onClick={actions[item.key]} aria-current={active ? "page" : undefined}>
              <Icon size={22} strokeWidth={2} />
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
    <div className={`grid place-items-center rounded-civic-lg border border-civic-border bg-civic-surface text-sm font-semibold text-civic-muted shadow-civic-sm ${compact ? "min-h-20" : "mt-7 min-h-52"}`}>
      <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" size={18} /> Memuat data desa</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="grid min-h-20 place-items-center rounded-2xl bg-civic-soft px-4 text-center text-sm font-semibold text-civic-muted">{text}</div>;
}

export function routeFromPathname(pathname: string): PageRoute {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin/ppid") return "admin-ppid";
  if (path === "/admin/ppid-layanan") return "admin-ppid-layanan";
  if (path === "/admin/dip") return "admin-dip";
  if (/^\/dip\/\d+$/.test(path)) return "dip-detail";
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
  if (route === "admin-ppid") return "/admin/ppid";
  if (route === "admin-ppid-layanan") return "/admin/ppid-layanan";
  if (route === "admin-dip") return "/admin/dip";
  if (route === "dip-detail") return typeof window === "undefined" ? "/dip" : window.location.pathname;
  return `/${route}`;
}

function isPublicRoute(route: PageRoute): route is PublicRouteKey {
  return route !== "portal" && route !== "dtks" && route !== "admin-ppid" && route !== "admin-ppid-layanan" && route !== "admin-dip" && route !== "dip-detail";
}

function bottomTabForRoute(route: PageRoute, tab: Tab): Tab {
  if (route === "portal") return tab;
  if (route === "dtks" || route === "admin-ppid" || route === "admin-ppid-layanan" || route === "admin-dip" || route === "pengaduan" || route === "permohonan-informasi" || route === "keberatan-informasi" || route === "mobil-siaga" || route === "darurat" || route === "program") return "services";
  return "info";
}

function useRouteMetadata(route: PageRoute, villageName: string, dipDetail?: DIPEntry) {
  useEffect(() => {
    const robots = ensureMeta("robots");
    const description = ensureMeta("description");
    const canonical = ensureCanonical();

    const pathname = window.location.pathname;
    if (route === "dtks" || route === "admin-ppid" || route === "admin-ppid-layanan" || route === "admin-dip" || pathname.startsWith("/admin")) {
      const isPPIDAdmin = route === "admin-ppid" || pathname === "/admin/ppid";
      const isPPIDServicesAdmin = route === "admin-ppid-layanan" || pathname === "/admin/ppid-layanan";
      const isDIPAdmin = route === "admin-dip" || pathname === "/admin/dip";
      document.title = `${isPPIDAdmin ? "Admin PPID" : isPPIDServicesAdmin ? "Admin Layanan PPID" : isDIPAdmin ? "Admin DIP" : "Dashboard DTKS"} ${villageName}`;
      robots.content = "noindex, nofollow, noarchive, noimageindex";
      description.content = isPPIDAdmin
        ? "Pengaturan privat profil dan standar layanan PPID Desa Yamansari."
        : isPPIDServicesAdmin
          ? "Pengelolaan privat permohonan informasi, keberatan, darurat, laporan, dan audit PPID Desa Yamansari."
        : isDIPAdmin
          ? "Pengaturan privat metadata Daftar Informasi Publik Desa Yamansari."
        : "Dashboard agregat DTKS Desa Yamansari. Halaman ini tidak untuk diindeks mesin pencari.";
      canonical.href = `${window.location.origin}${isPPIDAdmin ? "/admin/ppid" : isPPIDServicesAdmin ? "/admin/ppid-layanan" : isDIPAdmin ? "/admin/dip" : "/dtks"}`;
      return;
    }

    if (route === "dip-detail" && dipDetail) {
      document.title = `${dipDetail.title} | Desa ${villageName}`;
      robots.content = "index, follow";
      description.content = dipDetail.summary;
      canonical.href = `${window.location.origin}${pathname}`;
      return;
    }

    const meta = publicRouteMeta(pathname, villageName);
    document.title = meta.title;
    robots.content = "index, follow";
    description.content = meta.description;
    canonical.href = `${window.location.origin}${meta.canonicalPath}`;
  }, [dipDetail, route, villageName]);
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
    "/permohonan-informasi": {
      title: `Permohonan Informasi ${village}`,
      description: `Form permohonan informasi publik dan pelacakan status PPID ${village}.`,
    },
    "/keberatan-informasi": {
      title: `Keberatan Informasi ${village}`,
      description: `Form keberatan layanan informasi publik PPID ${village}.`,
    },
    "/laporan-ppid": {
      title: `Laporan PPID ${village}`,
      description: `Laporan ringkas permohonan informasi, keberatan, dan publikasi PPID ${village}.`,
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
    case "orange":
    case "yellow":
      return "bg-civic-warning-bg text-civic-warning";
    case "red":
      return "bg-civic-danger-bg text-civic-danger";
    default:
      return "bg-village-100 text-village-700";
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
