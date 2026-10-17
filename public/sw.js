// Web Push通知・オフライン表示のService Worker
// offline.html を変更したら OFFLINE_CACHE のバージョンを必ず上げること
// （上げないと既存ユーザーは古いキャッシュを使い続ける）
const OFFLINE_CACHE = 'tsukurist-offline-v4';

function cacheResponse(event, request, response) {
  try {
    const responseToCache = response.clone();
    event.waitUntil(
      caches.open(OFFLINE_CACHE)
        .then(function (cache) { return cache.put(request, responseToCache); })
        .catch(function (error) { console.error('failed to cache response:', error); })
    );
  } catch (error) {
    console.error('failed to clone response for cache:', error);
  }
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then(function (cache) { return cache.add('/offline.html'); })
      .then(function () {
        return fetch('/')
          .then(function (response) {
            if (response.ok) {
              return caches.open(OFFLINE_CACHE)
                .then(function (cache) { return cache.put('/', response); });
            }
          })
          .catch(function (error) {
            console.error('failed to cache app shell:', error);
          });
      })
      .then(function () { return self.skipWaiting(); })
  );
});

// 古いバージョンのキャッシュを削除して、新しいSWを即座に有効化する。
// （削除しないと caches.match() が古い offline.html を返してしまう）
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) { return key !== OFFLINE_CACHE; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const requestUrl = new URL(event.request.url);
  if (event.request.method === 'GET' &&
      requestUrl.origin === self.location.origin &&
      requestUrl.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        if (response.ok) {
          cacheResponse(event, event.request, response);
        }
        return response;
      }).catch(async function () {
        const cache = await caches.open(OFFLINE_CACHE);
        return (await cache.match(event.request)) || Response.error();
      })
    );
    return;
  }

  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).then(function (response) {
      if (requestUrl.origin === self.location.origin && requestUrl.pathname === '/' && response.ok) {
        cacheResponse(event, '/', response);
      }
      return response;
    }).catch(async function () {
      const cache = await caches.open(OFFLINE_CACHE);
      if (requestUrl.origin === self.location.origin && requestUrl.pathname === '/') {
        const appShell = await cache.match('/');
        if (appShell) return appShell;
      }
      return (await cache.match('/offline.html')) || Response.error();
    })
  );
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'ツクリスト';
  const options = {
    body: data.body || '',
    icon: '/icon0.svg',
    badge: '/icon0.svg',
    data: data.url || '/',
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
