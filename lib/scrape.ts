import * as cheerio from "cheerio";

export type FallbackItem = {
  title: string;
  url: string;
  rawText: string;
};

const SCRAPE_TIMEOUT_MS = 12_000;
const SCRAPE_USER_AGENT = "AI-Systems-Intelligence/1.0";

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = SCRAPE_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function wordCount(input: string): number {
  return input.split(/\s+/).filter(Boolean).length;
}

function toAbsoluteUrl(baseUrl: string, href: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

export async function scrapeFeedFallback(sourceUrl: string): Promise<FallbackItem[]> {
  const response = await fetchWithTimeout(sourceUrl, {
    headers: {
      "User-Agent": SCRAPE_USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error(`Fallback scraping failed for ${sourceUrl}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const seen = new Set<string>();

  const items = $("article a[href], main a[href], a[href*='/blog']")
    .toArray()
    .map((node) => {
      const href = $(node).attr("href")?.trim();
      const title = $(node).text().trim();

      if (!href || !title) {
        return null;
      }

      const absoluteUrl = toAbsoluteUrl(sourceUrl, href);
      if (!absoluteUrl) {
        return null;
      }

      if (seen.has(absoluteUrl)) {
        return null;
      }
      seen.add(absoluteUrl);

      return {
        title,
        url: absoluteUrl,
        rawText: title
      } satisfies FallbackItem;
    })
    .filter((item): item is FallbackItem => Boolean(item));

  return items.slice(0, 30);
}

export async function extractArticleText(articleUrl: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(articleUrl, {
      headers: {
        "User-Agent": SCRAPE_USER_AGENT
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script, style, noscript, svg, nav, footer, header, form, aside").remove();

    const candidates = $(
      "article, main article, main, [role='main'], .post-content, .entry-content, .article-content, .prose, .content"
    ).toArray();

    let best = "";
    for (const node of candidates) {
      const text = normalizeWhitespace($(node).text());
      if (wordCount(text) > wordCount(best)) {
        best = text;
      }
    }

    if (wordCount(best) < 120) {
      const paragraphs = $("article p, main p, p")
        .toArray()
        .map((node) => normalizeWhitespace($(node).text()))
        .filter((line) => line.length >= 40);

      const mergedParagraphs = normalizeWhitespace(paragraphs.slice(0, 120).join(" "));
      if (wordCount(mergedParagraphs) > wordCount(best)) {
        best = mergedParagraphs;
      }
    }

    if (wordCount(best) < 80) {
      const metaDescription =
        normalizeWhitespace($("meta[name='description']").attr("content") ?? "") ||
        normalizeWhitespace($("meta[property='og:description']").attr("content") ?? "");
      if (wordCount(metaDescription) > wordCount(best)) {
        best = metaDescription;
      }
    }

    return wordCount(best) >= 20 ? best : null;
  } catch {
    return null;
  }
}
