// 每次更新程式碼上傳 GitHub 時，記得把這裡的版本號 +1
const CACHE_NAME = 'zhuyin-adventure-v2.1.01';// 👈 修改這裡 (例如 v1 -> v2)

// 離線需要快取的資源檔案清單
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './sounds.js',
  './pics/start_banner.png',
  './pics/title.png',
  './pics/start_button.png',
  './pics/bg_prairie.png',
  './pics/bg_jungle.png',
  './pics/bg_wasteland.png',
  './pics/bg_endless.png',
  './pics/icon-192.png',
  './pics/icon-512.png',
  './pics/normal_mode_button.png',
  './pics/infinity_mode_button.png',
  './pics/record_button.png',
  './pics/Backward_button.png',
  './pics/start_button.png',
  './pics/Newbie_button.png',
  './pics/Expert_button.png',
  './pics/Elite_button.png',

];

// 1. 安裝 Service Worker 並快取檔案
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA] 資源快取中...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. 清理舊版快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA] 清除舊快取:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. 攔截請求：優先使用離線快取
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});