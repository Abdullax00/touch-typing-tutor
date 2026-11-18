/**
 * Service Worker для тренажёра слепой печати «В стране клавиш»
 * Обеспечивает полную офлайн-работу (PWA) и фоновое кэширование
 */

const CACHE_NAME = 'typing-tutor-v2.4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './styles.css?v=2.4',
  './app.js',
  './app.js?v=2.4',
  './course_data.js',
  './keyboard.js',
  './keyboard.js?v=2.3',
  './audio.js',
  './game.js',
  './user_env.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './app_icon.png',
  './app.ico'
];

// Установка: кэшируем основные ресурсы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('ServiceWorker pre-caching partial fail:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые версии кэша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Перехват сетевых запросов: стратегия Stale-While-Revalidate для статики
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Запросы к API не кэшируем в Service Worker (их обрабатывает приложение)
  if (url.pathname.includes('/api/')) {
    return;
  }

  // Только GET-запросы кэшируются
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Сеть недоступна — возвращаем кэшированный ответ
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
