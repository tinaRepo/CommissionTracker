// Web Push通知のService Worker
const OFFLINE_CACHE = 'commission-tracker-offline-v1';

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then(function (cache) {
      return cache.add('/offline.html');
    })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(async function () {
      return await caches.match('/offline.html') || Response.error();
    })
  );
});

self.addEventListener('push', function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || 'Commission Tracker';
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
