// Мінімальний service worker: нічого не кешує (щоб користувачі завжди бачили свіжу версію сайту).
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* мережа як завжди */ });
