import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * AdSenseLoader Component
 * Dynamically injects Google AdSense script strictly on public pages.
 * AdSense policy requires script exclusion on private/authenticated screens (e.g. /dashboard, /admin).
 */
const PUBLIC_PATHS = [
  '/',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/disclaimer',
  '/acceptable-use-policy',
  '/aup',
  '/blog',
];

const ADSENSE_CLIENT_ID = 'ca-pub-4885884049874914';

const AdSenseLoader = () => {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;
    const isPublicRoute =
      PUBLIC_PATHS.includes(currentPath) || currentPath.startsWith('/blog/');

    if (!isPublicRoute) {
      return;
    }

    // Check if script is already present
    const existingScript = document.querySelector(
      `script[src*="pagead2.googlesyndication.com"]`
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, [location.pathname]);

  return null;
};

export default AdSenseLoader;
