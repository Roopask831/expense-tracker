// sw.js — Service Worker for PWA offline support
const CACHE = "expense-tracker-v3";
const ASSETS = [
  "./dashboard.html",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/auth.js",
  "./js/db.js",
  "./js/export.js",
  "./js/firebase-config.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});