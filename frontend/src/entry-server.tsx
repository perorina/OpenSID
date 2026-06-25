import React from "react";
import { renderToString } from "react-dom/server";
import App, { routeFromPathname } from "./App";
import type { PublicInitialData } from "./api";

export type RenderResult = {
  appHtml: string;
  headHtml: string;
  initialDataScript: string;
  initialRouteScript: string;
  status: number;
};

export function render(url: string, initialData: PublicInitialData = {}, siteUrl = "https://yamansari.desa.id"): RenderResult {
  const pathname = new URL(url, siteUrl).pathname;
  const initialRoute = routeFromPathname(pathname);
  const villageName = initialData.ringkasan?.profil.nama ?? "Yamansari";
  const meta = routeMeta(pathname, villageName, siteUrl, initialData);
  const appHtml = renderToString(<App initialData={initialData} initialRoute={initialRoute} />);

  return {
    appHtml,
    headHtml: renderHead(meta),
    initialDataScript: `window.__YMS_INITIAL_DATA__=${safeJson(initialData)};`,
    initialRouteScript: `window.__YMS_INITIAL_ROUTE__=${safeJson(initialRoute)};`,
    status: meta.status,
  };
}

function routeMeta(pathname: string, villageName: string, siteUrl: string, initialData: PublicInitialData) {
  const path = pathname.replace(/\/+$/, "") || "/";
  const canonical = `${siteUrl.replace(/\/+$/, "")}${path}`;
  const village = `Desa ${villageName}`;
  const isPrivate = path === "/dtks" || path.startsWith("/admin");
  const isPPIDAdmin = path === "/admin/ppid";
  const isPPIDServicesAdmin = path === "/admin/ppid-layanan";
  const isDIPAdmin = path === "/admin/dip";
  const isDIPDetail = /^\/dip\/\d+$/.test(path);
  const publicMeta: Record<string, { title: string; description: string }> = {
    "/": {
      title: `${village} Digital`,
      description: `Portal layanan dan informasi ${village} untuk surat online, berita desa, agenda, data warga, dan bantuan masyarakat.`,
    },
    "/profil": { title: `Profil ${village}`, description: `Profil wilayah, alamat, kontak, dan identitas pemerintahan ${village}.` },
    "/pemerintah-desa": { title: `Pemerintah ${village}`, description: `Struktur organisasi dan perangkat pemerintah ${village}.` },
    "/struktur-organisasi": { title: `Struktur Organisasi ${village}`, description: `Susunan organisasi dan perangkat pemerintah ${village}.` },
    "/apbdes": { title: `APBDes ${village}`, description: `Informasi APBDes dan realisasi anggaran ${village}.` },
    "/perencanaan": { title: `RPJMDes dan RKPDes ${village}`, description: `Dokumen perencanaan pembangunan desa, RPJMDes, dan RKPDes ${village}.` },
    "/program": { title: `Program dan Kegiatan ${village}`, description: `Daftar program, kegiatan, pembangunan, dan bantuan masyarakat ${village}.` },
    "/produk-hukum": { title: `Produk Hukum ${village}`, description: `Peraturan desa, keputusan kepala desa, dan dokumen hukum ${village}.` },
    "/ppid": { title: `PPID ${village}`, description: `Pejabat Pengelola Informasi dan Dokumentasi serta layanan informasi publik ${village}.` },
    "/dip": { title: `Daftar Informasi Publik ${village}`, description: `Daftar Informasi Publik yang tersedia untuk warga dan masyarakat ${village}.` },
    "/permohonan-informasi": { title: `Permohonan Informasi ${village}`, description: `Form permohonan informasi publik dan pelacakan status PPID ${village}.` },
    "/keberatan-informasi": { title: `Keberatan Informasi ${village}`, description: `Form keberatan layanan informasi publik PPID ${village}.` },
    "/laporan-ppid": { title: `Laporan PPID ${village}`, description: `Laporan ringkas permohonan informasi, keberatan, dan publikasi PPID ${village}.` },
    "/data-desa": { title: `Statistik Data ${village}`, description: `Statistik kependudukan dan data agregat publik ${village}.` },
    "/berita": { title: `Berita ${village}`, description: `Berita terbaru, agenda, dan informasi kegiatan ${village}.` },
    "/pengumuman": { title: `Pengumuman ${village}`, description: `Pengumuman resmi dan informasi penting dari pemerintah ${village}.` },
    "/pengaduan": { title: `Pengaduan Warga ${village}`, description: `Layanan pengaduan, aspirasi, dan bantuan warga ${village}.` },
    "/mobil-siaga": { title: `Mobil Siaga ${village}`, description: `Kontak mobil siaga dan bantuan transportasi darurat warga ${village}.` },
    "/darurat": { title: `Informasi Darurat ${village}`, description: `Kontak darurat, mobil siaga, dan informasi cepat untuk warga ${village}.` },
  };

  const selected = isPrivate
    ? {
        title: `${isPPIDAdmin ? "Admin PPID" : isPPIDServicesAdmin ? "Admin Layanan PPID" : isDIPAdmin ? "Admin DIP" : "Dashboard DTKS"} ${villageName}`,
        description: isPPIDAdmin
          ? "Pengaturan privat profil dan standar layanan PPID Desa Yamansari."
          : isPPIDServicesAdmin
            ? "Pengelolaan privat permohonan informasi, keberatan, darurat, laporan, dan audit PPID Desa Yamansari."
          : isDIPAdmin
            ? "Pengaturan privat metadata Daftar Informasi Publik Desa Yamansari."
          : "Dashboard agregat DTKS Desa Yamansari. Halaman ini tidak untuk diindeks mesin pencari.",
      }
    : isDIPDetail && initialData.dipDetail
      ? { title: `${initialData.dipDetail.title} | ${village}`, description: initialData.dipDetail.summary }
    : publicMeta[path] ?? publicMeta["/"];

  return {
    canonical,
    description: selected.description,
    robots: isPrivate ? "noindex, nofollow, noarchive, noimageindex" : "index, follow",
    status: path.startsWith("/_bff") || (isDIPDetail && !initialData.dipDetail) ? 404 : 200,
    title: selected.title,
  };
}

function renderHead(meta: { canonical: string; description: string; robots: string; title: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    name: meta.title,
    url: meta.canonical,
  };

  return [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}">`,
    `<meta name="robots" content="${escapeHtml(meta.robots)}">`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}">`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}">`,
    `<meta property="og:url" content="${escapeHtml(meta.canonical)}">`,
    `<meta property="og:type" content="website">`,
    `<script type="application/ld+json">${safeJson(jsonLd)}</script>`,
  ].join("\n    ");
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
