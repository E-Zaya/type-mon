/**
 * GET /sw.js — the service worker, served with a cache name that changes
 * on every build.
 *
 * Why a route and not public/sw.js: a fixed cache name ("typemon-pwa-v1")
 * keeps the previous deployment's HTML in the cache. After a deploy that
 * HTML asks for /_next/static chunks that no longer exist and the app
 * renders blank until the user clears site data. Baking the build id into
 * the cache name makes the activate step below drop the old cache.
 *
 * Rendered once at build time (force-static), so the id is stable for the
 * lifetime of a deployment. On Vercel it is the deployment id (unique even
 * for a redeploy of the same commit); elsewhere the build timestamp.
 */

export const dynamic = "force-static";

const BUILD_ID =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  Date.now().toString(36);

const SW_SOURCE = String.raw`
const CACHE_NAME = "typemon-pwa-${BUILD_ID}";
const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon",
  "/apple-icon",
  "/icon-192",
  "/icon-512",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) {
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        event.data.urls.map((url) =>
          cache.add(new Request(url, { cache: "reload" }))
        )
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    CORE_ASSETS.includes(url.pathname) ||
    /\.(?:css|js|png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("/"));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}
`.trimStart();

export function GET(): Response {
  return new Response(SW_SOURCE, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Browsers must re-check the worker on every load so a new build
      // replaces the old one promptly.
      "Cache-Control": "no-cache",
    },
  });
}
