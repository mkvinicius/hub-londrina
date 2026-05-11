import { useEffect } from "react";

const SITE_ORIGIN = "https://www.hublondrina.com.br";

interface SeoOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  jsonLd?: object | null;
  noindex?: boolean;
}

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: object | null) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (data == null) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script") as HTMLScriptElement;
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function useSeo(opts: SeoOptions) {
  const { title, description, canonicalPath, ogImage, jsonLd, noindex } = opts;

  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }
    if (title) {
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }
    if (canonicalPath !== undefined) {
      const url = canonicalPath.startsWith("http")
        ? canonicalPath
        : `${SITE_ORIGIN}${canonicalPath.startsWith("/") ? "" : "/"}${canonicalPath}`;
      setCanonical(url);
      setMeta("property", "og:url", url);
    }
    if (ogImage) {
      const url = ogImage.startsWith("http") ? ogImage : `${SITE_ORIGIN}${ogImage.startsWith("/") ? "" : "/"}${ogImage}`;
      setMeta("property", "og:image", url);
      setMeta("name", "twitter:image", url);
    }
    setMeta(
      "name",
      "robots",
      noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1",
    );
    setJsonLd("page-jsonld", jsonLd ?? null);

    return () => {
      // Limpa JSON-LD ao desmontar para a próxima página começar limpa.
      setJsonLd("page-jsonld", null);
    };
  }, [title, description, canonicalPath, ogImage, jsonLd, noindex]);
}

export const SITE_URL = SITE_ORIGIN;
