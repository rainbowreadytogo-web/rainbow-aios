// Rainbow AI OS Service Worker
// 缓存策略：根页面 network-first（每日更新可见）；audio300/ 子目录永不缓存（售卖页保新鲜）

const CACHE_NAME = 'rainbow-aios-v3';
const ASSETS = ['./', './index.html', './manifest.json'];

// 安装：预缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理所有旧版本缓存（v1/v2）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // 【关键】audio300/ 子目录不拦截，永走网络，零缓存
  // 这是售卖交付页，每次都拿最新版，避免口令不匹配等缓存异常
  if (event.request.url.includes('/audio300/')) {
    return;
  }

  // 其他页面：先网络后缓存
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.url.includes('github.io')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return caches.match('./index.html');
        });
      })
  );
});