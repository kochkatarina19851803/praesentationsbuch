'use strict';

const CACHE = 'praesentationsbuch-shell-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key.startsWith('praesentationsbuch-shell-') &&
            key !== CACHE
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' ||
      url.origin !== self.location.origin) return;

  const scope = new URL(self.registration.scope);
  const allowed = new Set([
    scope.href,
    new URL('index.html', scope).href,
    new URL('manifest.webmanifest', scope).href
  ]);

  const normalized = new URL(url);
  normalized.search = '';
  normalized.hash = '';

  if (!allowed.has(normalized.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    try {
      const response = await fetch(request);

      if (response.ok) {
        await cache.put(normalized.href, response.clone());
        return response;
      }

      const cached = await cache.match(normalized.href);
      return cached || response;
    } catch (error) {
      const cached = await cache.match(normalized.href);
      if (cached) return cached;

      return new Response(
        'Die App konnte offline noch nicht geladen werden. Bitte einmal online öffnen.',
        {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }
  })());
});