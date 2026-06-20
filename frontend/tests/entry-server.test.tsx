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

  it("marks DTKS as a private noindex route", () => {
    const result = render("https://desa.example/dtks", makeInitialData(), "https://desa.example");

    expect(result.status).toBe(200);
    expect(result.appHtml).toContain("Admin DTKS");
    expect(result.headHtml).toContain("<title>Dashboard DTKS Sukamaju</title>");
    expect(result.headHtml).toContain('<meta name="robots" content="noindex, nofollow, noarchive, noimageindex">');
    expect(result.initialRouteScript).toBe('window.__YMS_INITIAL_ROUTE__="dtks";');
  });

  it("escapes initial data before embedding it into the SSR script", () => {
    const result = render("/", makeInitialData("<script>alert(1)</script>"), "https://desa.example");

    expect(result.initialDataScript).not.toContain("<script>");
    expect(result.initialDataScript).toContain("\\u003cscript>");
  });
});
