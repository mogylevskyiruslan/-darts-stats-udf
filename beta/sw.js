// Service worker: мережа в пріоритеті (завжди свіжа версія), а коли інтернету немає - остання збережена копія.
var CACHE = 'vfd-offline-v1';
var CORE = ['./', 'index.html', 'registration.js', 'supabase.js', 'training.js', 'drills2.js', 'growth.js', 'myspace.js',
  'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png', 'vfd-logo.svg', 'data.json', '../data.json'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // Supabase, шрифти тощо - напряму
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) {
        return r || (req.mode === 'navigate' ? caches.match('index.html') : undefined) || Response.error();
      });
    })
  );
});
