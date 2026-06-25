import { describe, expect, it } from "vitest";
import { render } from "../src/entry-server";
import type { PublicInitialData } from "../src/api";

function makeInitialData(name = "Sukamaju"): PublicInitialData {
  return {
    ringkasan: {
      profil: {
        nama: name,
        kode: { desa: "3328062005", kecamatan: "332806", kabupaten: "3328", provinsi: "33" },
        wilayah: { desa: name, kecamatan: "Lebaksiu", kabupaten: "Tegal", provinsi: "Jawa Tengah" },
        alamat: `Desa ${name}, Kecamatan Lebaksiu, Kabupaten Tegal`,
        kontak: { telepon: null, email: null, website: null },
        logoUrl: "/yamansari-mark.svg",
      },
      statistik: [
        { key: "penduduk_aktif", label: "Penduduk", value: 3245 },
        { key: "keluarga", label: "Keluarga", value: 1128 },
        { key: "wilayah", label: "RT/RW", value: 16 },
        { key: "dtks", label: "DTKS", value: 184 },
      ],
      dtks: makeDtks(),
    },
    dtks: makeDtks(),
    ppid: {
      profile: {
        supervisorPamongId: 16,
        ppidPamongId: 17,
        serviceOfficerPamongId: 17,
        serviceAddress: "Kantor Desa Sukamaju",
        serviceSchedule: "Senin-Jumat, 08.00-14.00 WIB",
        phone: "0283 619 2025",
        email: "ppid@sukamaju.desa.id",
        feePolicy: "Tidak dipungut biaya.",
        serviceCommitment: "Melayani informasi secara cepat dan tepat.",
        responseDays: 10,
        extensionDays: 7,
        isPublished: true,
        isSample: true,
      },
      officials: [
        { id: 16, name: "Arif Wibowo", role: "Atasan PPID", position: "Kepala Desa", photoUrl: null, isFallback: false },
        { id: 17, name: "Dwi Lestari", role: "PPID Desa", position: "Sekretaris", photoUrl: null, isFallback: false },
      ],
      documents: [
        { id: 1, title: "CONTOH - SK Penetapan PPID Desa Sukamaju", category: "Informasi Setiap Saat", url: "/dokumen/1", isSample: true },
      ],
      isSample: true,
    },
    dip: {
      items: [makeDipEntry()],
      categories: [{ code: 1, slug: "berkala", label: "Informasi Berkala", count: 1 }],
      years: ["2026"],
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
      isSample: true,
    },
    dipDetail: makeDipEntry(),
    publications: {
      documents: [
        makeDipEntry(),
        { ...makeDipEntry(), documentId: 12, title: "CONTOH - RPJMDes, RKPDes, dan DU-RKP", publicationType: "planning", summary: "Ringkasan perencanaan desa." },
        { ...makeDipEntry(), documentId: 13, title: "CONTOH - Produk Hukum Desa", publicationType: "legal", summary: "Ringkasan produk hukum desa." },
        { ...makeDipEntry(), documentId: 14, title: "CONTOH - Prosedur Informasi Darurat", publicationType: "emergency", summary: "Prosedur informasi darurat." },
      ],
      coverage: [
        { key: "budget", label: "APBDes dan Realisasi", available: 1, required: true },
        { key: "planning", label: "RPJMDes dan RKPDes", available: 1, required: true },
      ],
      completed: 2,
      required: 2,
      completeness: 100,
      isSample: true,
    },
    budget: {
      year: "2026",
      totalAnggaran: 1200000000,
      totalRealisasi: 720000000,
      items: [],
    },
    emergency: {
      items: [{
        id: 1,
        title: "CONTOH - Waspada Cuaca Ekstrem",
        severity: "warning",
        status: "published",
        statusLabel: "Terbit",
        occurredAt: "2026-06-25 08:00:00",
        location: "Balai Desa",
        affectedArea: "Wilayah rawan genangan",
        instructions: "Pantau kanal resmi desa.",
        updatedAt: "2026-06-25 08:00:00",
        isSample: true,
      }],
      contacts: [{ id: 1, kind: "emergency", label: "Mobil Siaga Desa", value: "081226061122", description: "Rujukan kesehatan" }],
      isSample: true,
    },
    ppidReport: {
      year: 2026,
      requestsTotal: 3,
      requestsByStatus: { submitted: 1, fulfilled: 2 },
      objectionsTotal: 1,
      objectionsByStatus: { submitted: 1 },
      overdueRequests: 0,
      overdueObjections: 0,
      averageResponseDays: 2,
      dipPublished: 15,
      dipVersionTotal: 15,
      emergencies: 1,
      monthlyRequests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
      generatedAt: "2026-06-25T08:00:00Z",
    },
  };
}

function makeDipEntry() {
  return {
    documentId: 11,
    title: "CONTOH - Ringkasan APBDes dan Realisasi",
    publicationType: "budget",
    category: { code: 1, slug: "berkala", label: "Informasi Berkala" },
    year: "2026",
    summary: "Ringkasan contoh pendapatan, belanja, pembiayaan, dan realisasi APBDes.",
    controllingUnit: "Kaur Keuangan",
    responsibleOfficial: "Kaur Keuangan",
    publisher: "Pemerintah Desa Sukamaju",
    createdDate: "2026-06-24",
    createdPlace: "Sukamaju",
    updateFrequency: "Setiap triwulan",
    format: "PDF",
    publishedAt: "2026-06-24",
    retentionLabel: "Selama informasi berlaku",
    viewUrl: "/dokumen/11",
    isSample: true,
  };
}

function makeDtks() {
  return {
    status: "contoh",
    ruta: 184,
    anggota: 642,
    lampiran: 38,
    rtm_terdaftar_dtks: 128,
    versi_kuisioner: [{ versi: "2025", jumlah: 184 }],
    catatan: "Data contoh test.",
  };
}

function visibleHtml(html: string) {
  return html.replace(/<!-- -->/g, "");
}

describe("SSR entry", () => {
  it("renders public route HTML with SEO metadata", () => {
    const result = render("https://desa.example/profil", makeInitialData(), "https://desa.example");

    expect(result.status).toBe(200);
    expect(visibleHtml(result.appHtml)).toContain("Desa Sukamaju");
    expect(result.headHtml).toContain("<title>Profil Desa Sukamaju</title>");
    expect(result.headHtml).toContain('<meta name="robots" content="index, follow">');
    expect(result.headHtml).toContain('<link rel="canonical" href="https://desa.example/profil">');
    expect(result.initialDataScript).toContain("window.__YMS_INITIAL_DATA__=");
    expect(result.initialRouteScript).toBe('window.__YMS_INITIAL_ROUTE__="profil";');
  });

  it("renders added public feature routes through SSR", () => {
    const result = render("https://desa.example/struktur-organisasi", makeInitialData(), "https://desa.example");

    expect(result.status).toBe(200);
    expect(visibleHtml(result.appHtml)).toContain("Struktur Organisasi");
    expect(result.headHtml).toContain("<title>Struktur Organisasi Desa Sukamaju</title>");
    expect(result.headHtml).toContain('<link rel="canonical" href="https://desa.example/struktur-organisasi">');
    expect(result.initialRouteScript).toBe('window.__YMS_INITIAL_ROUTE__="struktur-organisasi";');
  });

  it("renders PPID service routes from SSR data", () => {
    const request = render("https://desa.example/permohonan-informasi", makeInitialData(), "https://desa.example");
    const objection = render("https://desa.example/keberatan-informasi", makeInitialData(), "https://desa.example");
    const report = render("https://desa.example/laporan-ppid", makeInitialData(), "https://desa.example");

    expect(visibleHtml(request.appHtml)).toContain("Form permohonan informasi");
    expect(visibleHtml(objection.appHtml)).toContain("Form keberatan informasi");
    expect(visibleHtml(report.appHtml)).toContain("Permohonan per bulan");
    expect(report.headHtml).toContain("<title>Laporan PPID Desa Sukamaju</title>");
  });

  it("renders publication and emergency pages from SSR data", () => {
    const apbdes = render("https://desa.example/apbdes", makeInitialData(), "https://desa.example");
    const darurat = render("https://desa.example/darurat", makeInitialData(), "https://desa.example");

    expect(visibleHtml(apbdes.appHtml)).toContain("Anggaran 2026");
    expect(visibleHtml(apbdes.appHtml)).toContain("Ringkasan APBDes dan Realisasi");
    expect(visibleHtml(darurat.appHtml)).toContain("Waspada Cuaca Ekstrem");
    expect(visibleHtml(darurat.appHtml)).toContain("Prosedur Informasi Darurat");
  });

  it("marks DTKS as a private noindex route", () => {
    const result = render("https://desa.example/dtks", makeInitialData(), "https://desa.example");

    expect(result.status).toBe(200);
    expect(result.appHtml).toContain("Admin DTKS");
    expect(result.headHtml).toContain("<title>Dashboard DTKS Sukamaju</title>");
    expect(result.headHtml).toContain('<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">');
    expect(result.initialRouteScript).toBe('window.__YMS_INITIAL_ROUTE__="dtks";');
  });

  it("renders PPID content in initial HTML without a complaint shortcut", () => {
    const result = render("https://desa.example/ppid", makeInitialData(), "https://desa.example");
    const html = visibleHtml(result.appHtml);

    expect(result.status).toBe(200);
    expect(html).toContain("Atasan PPID");
    expect(html).toContain("SK Penetapan PPID Desa Sukamaju");
    expect(html).toContain("Contoh");
    expect(html).not.toContain("Ajukan Pengaduan atau Permohonan");
    expect(result.headHtml).toContain("<title>PPID Desa Sukamaju</title>");
    expect(result.headHtml).toContain('<meta name="robots" content="index, follow">');
  });

  it("marks the PPID admin route noindex", () => {
    const result = render("https://desa.example/admin/ppid", makeInitialData(), "https://desa.example");

    expect(result.status).toBe(200);
    expect(result.appHtml).toContain("Admin PPID");
    expect(result.headHtml).toContain("<title>Admin PPID Sukamaju</title>");
    expect(result.headHtml).toContain('<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">');
    expect(result.initialRouteScript).toBe('window.__YMS_INITIAL_ROUTE__="admin-ppid";');
  });

  it("renders the DIP list from SSR data", () => {
    const result = render("https://desa.example/dip", makeInitialData(), "https://desa.example");
    const html = visibleHtml(result.appHtml);

    expect(result.status).toBe(200);
    expect(html).toContain("Ringkasan APBDes dan Realisasi");
    expect(html).toContain("Kaur Keuangan");
    expect(html).toContain('href="/dip/11"');
    expect(result.headHtml).toContain("<title>Daftar Informasi Publik Desa Sukamaju</title>");
  });

  it("renders a DIP detail with dynamic metadata and inline document route", () => {
    const result = render("https://desa.example/dip/11", makeInitialData(), "https://desa.example");
    const html = visibleHtml(result.appHtml);

    expect(result.status).toBe(200);
    expect(html).toContain("Unit penguasa");
    expect(html).toContain('href="/dokumen/11"');
    expect(html).toContain('target="_blank"');
    expect(result.headHtml).toContain("Ringkasan APBDes dan Realisasi | Desa Sukamaju");
    expect(result.initialRouteScript).toBe('window.__YMS_INITIAL_ROUTE__="dip-detail";');
  });

  it("marks the DIP admin route noindex", () => {
    const result = render("https://desa.example/admin/dip", makeInitialData(), "https://desa.example");

    expect(result.status).toBe(200);
    expect(result.appHtml).toContain("Admin DIP");
    expect(result.headHtml).toContain("<title>Admin DIP Sukamaju</title>");
    expect(result.headHtml).toContain('<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">');
    expect(result.initialRouteScript).toBe('window.__YMS_INITIAL_ROUTE__="admin-dip";');
  });

  it("marks the PPID services admin route noindex", () => {
    const result = render("https://desa.example/admin/ppid-layanan", makeInitialData(), "https://desa.example");

    expect(result.status).toBe(200);
    expect(result.appHtml).toContain("Layanan PPID");
    expect(result.headHtml).toContain("<title>Admin Layanan PPID Sukamaju</title>");
    expect(result.headHtml).toContain('<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">');
    expect(result.initialRouteScript).toBe('window.__YMS_INITIAL_ROUTE__="admin-ppid-layanan";');
  });

  it("escapes initial data before embedding it into the SSR script", () => {
    const result = render("/", makeInitialData("<script>alert(1)</script>"), "https://desa.example");

    expect(result.initialDataScript).not.toContain("<script>");
    expect(result.initialDataScript).toContain("\\u003cscript>");
  });
});
