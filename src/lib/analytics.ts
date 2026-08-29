declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initAnalytics(): void {
  const id = import.meta.env.VITE_GA_ID as string | undefined;
  if (!id || typeof document === 'undefined') return;
  if (document.getElementById('sholy-ga')) return;

  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;

  const script = document.createElement('script');
  script.id = 'sholy-ga';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  gtag('js', new Date());
  gtag('config', id);
}