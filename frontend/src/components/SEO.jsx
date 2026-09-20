import { useEffect } from 'react';

const SEO = ({ title, description, canonical, keywords, jsonLd }) => {
  useEffect(() => {
    // Document Title
    if (title) {
      document.title = title;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.content = title;
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) twitterTitle.content = title;
    }

    // Meta Description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;

      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.content = description;

      let twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (twitterDesc) twitterDesc.content = description;
    }

    // Meta Keywords
    if (keywords) {
      let metaKw = document.querySelector('meta[name="keywords"]');
      if (!metaKw) {
        metaKw = document.createElement('meta');
        metaKw.name = 'keywords';
        document.head.appendChild(metaKw);
      }
      metaKw.content = keywords;
    }

    // Canonical Link & OpenGraph URL
    const currentUrl = canonical || `https://www.hometolab.in${window.location.pathname}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = currentUrl;

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.content = currentUrl;

    let twitterUrl = document.querySelector('meta[name="twitter:url"]');
    if (twitterUrl) twitterUrl.content = currentUrl;

    // JSON-LD Structured Data
    if (jsonLd) {
      let scriptTag = document.querySelector('script[data-seo-jsonld="true"]');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.setAttribute('data-seo-jsonld', 'true');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(jsonLd);
    }

  }, [title, description, canonical, keywords, jsonLd]);

  return null;
};

export default SEO;
