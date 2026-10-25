export function registerServiceWorkerUpdatePrompt(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const base = import.meta.env.BASE_URL || '/';
      const swUrl = `${base.endsWith('/') ? base : `${base}/`}sw.js`;
      const reg = await navigator.serviceWorker.register(swUrl);

      const showUpdateBanner = (worker: ServiceWorker) => {
        if (document.getElementById('pwa-update-toast')) return;
        const toast = document.createElement('div');
        toast.id = 'pwa-update-toast';
        toast.className = 'pwa-toast';
        toast.innerHTML = `
          <span>✨ Đã có phiên bản mới của ứng dụng!</span>
          <button type="button" class="btn btn-sm btn-primary" id="pwa-reload-btn">Có bản mới, tải lại</button>
        `;
        toast.querySelector('#pwa-reload-btn')?.addEventListener('click', () => {
          worker.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        });
        document.body.appendChild(toast);
      };

      if (reg.waiting) {
        showUpdateBanner(reg.waiting);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(newWorker);
          }
        });
      });
    } catch {
      // Service worker not active in dev or restricted context
    }
  });
}
