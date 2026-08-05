// Rainbow AI OS Service Worker
// 缓存策略：先网络后缓存（network-first），保证每日更新可见

const CACHE_NAME = 'rainbow-aios-v2';
const ASSETS = ['./', './index.html', './manifest.json'];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：network-first 策略
// 线上优先拉最新版（每日更新），网络失败时回退缓存
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功拿到最新内容，同步更新缓存
        if (response.ok && event.request.url.includes('github.io')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // 网络失败，回退缓存
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // 最终兜底：返回首页缓存
          return caches.match('./index.html');
        });
      })
  );
});
