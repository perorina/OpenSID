import { createServer as createHttpServer } from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { brotliCompressSync, constants as zlibConstants, gzipSync } from "node:zlib";
import { Readable } from "node:stream";

const root = dirname(fileURLToPath(import.meta.url));
loadDotEnv();
const isProd = process.argv.includes("--prod") || process.env.NODE_ENV === "production";
const port = Number(process.env.SSR_PORT || process.env.PORT || (isProd ? 5173 : 5174));
const host = process.env.SSR_HOST || "127.0.0.1";
const siteUrl = process.env.SSR_PUBLIC_SITE_URL || `http://${host}:${port}`;
const apiBase = (process.env.YMS_API_BASE_INTERNAL || "http://127.0.0.1:8090/api/yms").replace(/\/+$/, "");
const internalKey = process.env.YMS_INTERNAL_API_KEY || (isProd ? "" : "dev-internal-key");
const clientDist = join(root, "dist", "client");
const serverEntry = [join(root, "dist", "server", "entry-server.js"), join(root, "dist", "server", "entry-server.mjs")].find(existsSync) || join(root, "dist", "server", "entry-server.js");
const initialDataCache = new Map();
const staticCompressionCache = new Map();

let vite;
let prodTemplate = "";
let prodRender;

if (!isProd) {
  const { createServer } = await import("vite");
  vite = await createServer({
    root,
    appType: "custom",
    server: { middlewareMode: true },
  });
} else {
  prodTemplate = readFileSync(join(clientDist, "index.html"), "utf-8");
  prodRender = await import(pathToFileURL(serverEntry).href);
}

const server = createHttpServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      sendJson(res, 400, { status: "error", error: { code: "bad_request", message: "Request tidak valid." } });
      return;
    }

    const url = new URL(req.url, siteUrl);
    if (/^\/dokumen\/\d+$/.test(url.pathname)) {
      await proxyDocument(req, res, url);
      return;
    }
    if (url.pathname.startsWith("/_bff")) {
      await proxyBff(req, res, url);
      return;
    }

    if (isProd && serveStatic(req, res, url.pathname)) {
      return;
    }

    if (!isProd) {
      const handled = await runViteMiddleware(req, res);
      if (handled) return;
    }

    await renderPage(req, res, url);
  } catch (error) {
    if (vite) {
      vite.ssrFixStacktrace(error);
    }
    console.error(error);
    sendHtml(req, res, 500, "text/plain; charset=utf-8", "Server SSR belum bisa merender halaman.");
  }
});

server.listen(port, host, () => {
  console.log(`Yamansari SSR listening on http://${host}:${port}`);
});

async function renderPage(req, res, url) {
  const template = isProd
    ? prodTemplate
    : await vite.transformIndexHtml(url.pathname, await readFile(join(root, "index.html"), "utf-8"));
  const renderer = isProd ? prodRender : await vite.ssrLoadModule("/src/entry-server.tsx");
  const initialData = await getInitialData(url);
  const result = renderer.render(url.href, initialData, siteUrl);

  const html = template
    .replace("<!--app-head-->", result.headHtml)
    .replace("<!--app-html-->", result.appHtml)
    .replace("<!--app-data-->", result.initialDataScript)
    .replace("<!--app-route-->", result.initialRouteScript);

  if (url.pathname === "/dtks" || url.pathname.startsWith("/admin")) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, noimageindex");
    res.setHeader("Cache-Control", "no-store");
  } else {
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  }
  sendHtml(req, res, result.status, "text/html; charset=utf-8", html);
}

async function getInitialData(url) {
  const pathname = url.pathname;
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/dtks" || pathname.startsWith("/admin")) {
    return loadPublicInitialData("private-public-shell", 30_000, 30_000);
  }

  const publicationRoutes = new Set(["/profil", "/pemerintah-desa", "/struktur-organisasi", "/apbdes", "/perencanaan", "/program", "/produk-hukum", "/data-desa", "/mobil-siaga", "/darurat"]);
  if (publicationRoutes.has(normalizedPath)) {
    const year = new Date().getFullYear();
    const tasks = [
      loadPublicInitialData("public-shell", 60_000, 120_000),
      loadCachedInitialData("route:publications", 300_000, 120_000, () => internalGet("/public/publications")),
    ];
    if (normalizedPath === "/apbdes") {
      tasks.push(loadCachedInitialData(`route:budget:${year}`, 300_000, 120_000, () => internalGet(`/public/budget?year=${year}`)));
    }
    if (normalizedPath === "/darurat" || normalizedPath === "/mobil-siaga") {
      tasks.push(loadCachedInitialData("route:emergency", 30_000, 30_000, () => internalGet("/public/emergency")));
    }
    const [base, publications, extra] = await Promise.all(tasks);
    return {
      ...base,
      publications,
      ...(normalizedPath === "/apbdes" ? { budget: extra } : {}),
      ...(normalizedPath === "/darurat" || normalizedPath === "/mobil-siaga" ? { emergency: extra } : {}),
    };
  }

  if (normalizedPath === "/ppid") {
    const [ringkasan, ppid] = await Promise.all([
      loadCachedInitialData("route:ppid:ringkasan", 60_000, 120_000, () => internalGet("/ringkasan")),
      loadCachedInitialData("route:ppid", 300_000, 120_000, () => internalGet("/public/ppid")),
    ]);
    return { ringkasan, dtks: ringkasan?.dtks, ppid };
  }

  if (normalizedPath === "/permohonan-informasi" || normalizedPath === "/keberatan-informasi") {
    const [base, ppid] = await Promise.all([
      loadPublicInitialData("public-shell", 60_000, 120_000),
      loadCachedInitialData("route:ppid", 300_000, 120_000, () => internalGet("/public/ppid")),
    ]);
    return { ...base, ppid };
  }

  if (normalizedPath === "/laporan-ppid") {
    const [base, ppidReport] = await Promise.all([
      loadPublicInitialData("public-shell", 60_000, 120_000),
      loadCachedInitialData("route:ppid:report", 60_000, 60_000, () => internalGet("/public/ppid/report")),
    ]);
    return { ...base, ppidReport };
  }

  if (normalizedPath === "/dip") {
    const ringkasan = await loadCachedInitialData("route:dip:ringkasan", 60_000, 120_000, () => internalGet("/ringkasan"));
    const query = url.searchParams.toString();
    let dip;
    try {
      dip = query
        ? await internalGet(`/public/dip?${query}`)
        : await loadCachedInitialData("route:dip", 60_000, 120_000, () => internalGet("/public/dip"));
    } catch {
      dip = await loadCachedInitialData("route:dip", 60_000, 120_000, () => internalGet("/public/dip"));
    }
    return { ringkasan, dtks: ringkasan?.dtks, dip };
  }

  const detailMatch = normalizedPath.match(/^\/dip\/(\d+)$/);
  if (detailMatch) {
    const [ringkasan, dipDetail] = await Promise.all([
      loadCachedInitialData("route:dip:ringkasan", 60_000, 120_000, () => internalGet("/ringkasan")),
      loadCachedInitialData(`route:dip:detail:${detailMatch[1]}`, 300_000, 120_000, () => internalGet(`/public/dip/${detailMatch[1]}`)),
    ]);
    return { ringkasan, dtks: ringkasan?.dtks, dipDetail };
  }

  return loadPublicInitialData("public-shell", 60_000, 120_000);
}

async function proxyDocument(req, res, url) {
  if (!internalKey) {
    sendHtml(req, res, 503, "text/plain; charset=utf-8", "Pratinjau dokumen belum dikonfigurasi.");
    return;
  }

  const id = url.pathname.slice("/dokumen/".length);
  const headers = {
    Authorization: `Bearer ${internalKey}`,
    "X-YMS-Request-ID": cryptoRandomId(),
  };
  for (const name of ["range", "if-modified-since", "if-none-match"]) {
    const value = req.headers[name];
    if (value) headers[name] = Array.isArray(value) ? value.join(", ") : value;
  }

  let upstream;
  try {
    upstream = await fetch(`${apiBase}/public/documents/${id}/content`, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers,
      redirect: "manual",
    });
  } catch {
    sendHtml(req, res, 502, "text/plain; charset=utf-8", "Dokumen belum bisa dihubungi.");
    return;
  }

  for (const name of ["accept-ranges", "cache-control", "content-disposition", "content-length", "content-range", "content-type", "etag", "last-modified", "location", "x-content-type-options"]) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }
  res.statusCode = upstream.status;
  if (req.method === "HEAD" || !upstream.body) {
    res.end();
    return;
  }
  Readable.fromWeb(upstream.body).pipe(res);
}

async function loadPublicInitialData(key, freshMs, staleMs) {
  return loadCachedInitialData(key, freshMs, staleMs, async () => {
    const [ringkasan, artikel, pembangunan, program, dtks] = await Promise.all([
      internalGet("/ringkasan"),
      internalGet("/artikel?limit=6"),
      internalGet("/pembangunan?limit=6"),
      internalGet("/program-bantuan?limit=6"),
      internalGet("/dtks"),
    ]);
    return { ringkasan, artikel, pembangunan, program, dtks };
  });
}

async function loadCachedInitialData(key, freshMs, staleMs, loader) {
  const now = Date.now();
  const cached = initialDataCache.get(key);
  if (cached && cached.freshUntil > now) {
    return cached.value;
  }
  if (cached && cached.loading) {
    return cached.value;
  }

  const load = async () => {
    const value = await loader();
    initialDataCache.set(key, { value, freshUntil: Date.now() + freshMs, staleUntil: Date.now() + freshMs + staleMs, loading: false });
    return value;
  };

  if (cached && cached.staleUntil > now) {
    initialDataCache.set(key, { ...cached, loading: true });
    load().catch((error) => {
      console.warn("SSR stale refresh failed:", error.message);
      initialDataCache.set(key, { ...cached, loading: false });
    });
    return cached.value;
  }

  try {
    return await load();
  } catch (error) {
    console.warn("SSR initial data failed:", error.message);
    return cached?.value ?? {};
  }
}

async function internalGet(path) {
  const envelope = await internalFetch(path, { method: "GET" });
  return envelope.data;
}

async function internalFetch(path, init) {
  if (!internalKey) {
    throw new Error("YMS_INTERNAL_API_KEY belum diset untuk SSR/BFF.");
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${internalKey}`,
      "X-YMS-Request-ID": cryptoRandomId(),
    },
  });
  const text = await response.text();
  let envelope;
  try {
    envelope = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Internal API returned non-JSON response (${response.status}).`);
  }
  if (!response.ok || envelope.status !== "ok") {
    throw new Error(envelope.error?.message || `Internal API request failed (${response.status}).`);
  }
  return envelope;
}

async function proxyBff(req, res, url) {
  if (!internalKey) {
    sendJson(res, 503, { status: "error", error: { code: "internal_key_not_configured", message: "SSR/BFF belum dikonfigurasi." } });
    return;
  }

  const upstreamPath = url.pathname.replace(/^\/_bff/, "") || "/";
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readRequestBody(req);
  const headers = {
    Authorization: `Bearer ${internalKey}`,
    "X-YMS-Request-ID": req.headers["x-yms-request-id"] || cryptoRandomId(),
  };
  for (const name of ["content-type", "cookie", "x-csrf-token"]) {
    const value = req.headers[name];
    if (value) headers[name] = Array.isArray(value) ? value.join("; ") : value;
  }

  let upstream;
  try {
    upstream = await fetch(`${apiBase}${upstreamPath}${url.search}`, {
      method: req.method,
      headers,
      body,
    });
  } catch (error) {
    sendJson(res, 502, { status: "error", error: { code: "internal_api_unavailable", message: "Internal API belum bisa dihubungi." } });
    return;
  }

  const responseBody = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get("content-type");
  const cacheControl = upstream.headers.get("cache-control");
  const retryAfter = upstream.headers.get("retry-after");
  if (contentType) res.setHeader("Content-Type", contentType);
  if (cacheControl) res.setHeader("Cache-Control", cacheControl);
  if (retryAfter) res.setHeader("Retry-After", retryAfter);

  const setCookies = typeof upstream.headers.getSetCookie === "function"
    ? upstream.headers.getSetCookie()
    : upstream.headers.get("set-cookie")
      ? [upstream.headers.get("set-cookie")]
      : [];
  if (setCookies.length) {
    res.setHeader("Set-Cookie", setCookies.map(rewriteCookiePath));
  }

  if (upstream.ok && req.method === "POST" && upstreamPath.startsWith("/admin/")) {
    if (upstreamPath.startsWith("/admin/ppid")) {
      for (const key of initialDataCache.keys()) {
        if (key === "route:ppid" || key === "route:ppid:report" || key === "route:emergency" || key === "route:publications") initialDataCache.delete(key);
      }
    }
    if (upstreamPath.startsWith("/admin/dip")) {
      for (const key of initialDataCache.keys()) {
        if (key === "route:dip" || key === "route:publications" || key.startsWith("route:dip:detail:")) initialDataCache.delete(key);
      }
    }
  }
  if (upstream.ok && req.method === "POST" && (upstreamPath.startsWith("/public/ppid/requests") || upstreamPath.startsWith("/public/ppid/objections"))) {
    initialDataCache.delete("route:ppid:report");
  }

  res.statusCode = upstream.status;
  res.end(responseBody);
}

function serveStatic(req, res, pathname) {
  if (!extname(pathname)) return false;

  const requested = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, "");
  const filePath = resolve(clientDist, requested);
  if (!filePath.startsWith(resolve(clientDist)) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    return false;
  }

  const type = contentType(filePath);
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", filePath.includes(`${join("dist", "client", "assets")}`) ? "public, max-age=31536000, immutable" : "public, max-age=3600");
  const body = readFileSync(filePath);
  sendEncoded(req, res, body, isCompressible(type) ? filePath : undefined);
  return true;
}

function runViteMiddleware(req, res) {
  return new Promise((resolveMiddleware, rejectMiddleware) => {
    let settled = false;
    const done = (handled) => {
      if (settled) return;
      settled = true;
      resolveMiddleware(handled);
    };
    res.once("finish", () => done(true));
    vite.middlewares(req, res, (error) => {
      if (error) rejectMiddleware(error);
      else done(false);
    });
  });
}

function readRequestBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolveBody(Buffer.concat(chunks)));
    req.on("error", rejectBody);
  });
}

function rewriteCookiePath(cookie) {
  return cookie.replace(/;\s*Path=\/api\/yms/gi, "; Path=/");
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendHtml(req, res, status, type, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  sendEncoded(req, res, Buffer.from(body));
}

function sendEncoded(req, res, body, cacheKey) {
  if (body.length >= 1024) res.setHeader("Vary", "Accept-Encoding");
  const encoding = preferredEncoding(req.headers["accept-encoding"], body.length);
  if (!encoding) {
    res.setHeader("Content-Length", body.length);
    res.end(req.method === "HEAD" ? undefined : body);
    return;
  }

  res.setHeader("Content-Encoding", encoding);
  const key = cacheKey ? `${cacheKey}:${encoding}` : "";
  let encoded = key ? staticCompressionCache.get(key) : undefined;
  if (!encoded) {
    encoded = encoding === "br"
      ? brotliCompressSync(body, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } })
      : gzipSync(body, { level: 6 });
    if (key) staticCompressionCache.set(key, encoded);
  }
  res.setHeader("Content-Length", encoded.length);
  res.end(req.method === "HEAD" ? undefined : encoded);
}

function preferredEncoding(acceptEncoding, bodyLength) {
  if (bodyLength < 1024 || typeof acceptEncoding !== "string") return "";
  if (/\bbr\b/i.test(acceptEncoding)) return "br";
  if (/\bgzip\b/i.test(acceptEncoding)) return "gzip";
  return "";
}

function isCompressible(type) {
  return type.startsWith("text/") || type.includes("javascript") || type.includes("json") || type.includes("svg");
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadDotEnv() {
  for (const filename of [".env.local", ".env"]) {
    const filePath = join(root, filename);
    if (!existsSync(filePath)) continue;

    const lines = readFileSync(filePath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      let value = trimmed.slice(index + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}
