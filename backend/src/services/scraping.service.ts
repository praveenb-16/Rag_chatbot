import axios from 'axios';
import * as cheerio from 'cheerio';
import CollegeDocument from '../models/Document';
import Chunk from '../models/Chunk';
import mongoose from 'mongoose';
import { embedText, ingestDocument } from './ingestion.service';

// Re-use the same chunker/embedder from ingestion service
// We just need to extract text from web pages here

const CRAWL_LIMIT = 30;           // max pages to crawl per domain
const REQUEST_TIMEOUT = 12000;    // ms per page fetch
const DELAY_MS = 400;             // polite delay between requests

export interface ScrapeResult {
  pagesScraped: number;
  documentId: string;
  title: string;
}

/**
 * Normalises a URL: removes hash fragments, trailing slashes, etc.
 */
function normaliseUrl(url: string, base: string): string | null {
  try {
    const resolved = new URL(url, base);
    // Only follow http/https links
    if (!['http:', 'https:'].includes(resolved.protocol)) return null;
    resolved.hash = '';
    // Remove trailing slash for deduplication
    let href = resolved.href;
    if (href.endsWith('/')) href = href.slice(0, -1);
    return href;
  } catch {
    return null;
  }
}

/**
 * Fetches a single page and extracts clean text content.
 * Strips nav, header, footer, scripts, styles, etc.
 */
async function fetchPageText(url: string): Promise<{ text: string; title: string; links: string[] }> {
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT,
    headers: {
      'User-Agent': 'KIOTAssistant-Crawler/1.0 (educational RAG chatbot)',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    maxRedirects: 5,
    responseType: 'text',
  });

  const html = response.data as string;
  const $ = cheerio.load(html);

  // Remove noise elements
  $('script, style, noscript, iframe, nav, header, footer, aside, .nav, .navbar, .menu, .sidebar, .footer, .header, .cookie, .popup, .modal, .advertisement, .ad, [role="navigation"], [role="banner"], [role="complementary"]').remove();

  // Extract page title
  const pageTitle = $('title').first().text().trim() || $('h1').first().text().trim() || 'Untitled Page';

  // Extract meaningful text
  const bodyText = $('body').text();
  const cleaned = bodyText
    .replace(/\s{2,}/g, ' ')       // collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n')    // collapse blank lines
    .replace(/\t/g, ' ')
    .trim();

  // Collect internal links for crawling
  const links: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) links.push(href);
  });

  return { text: cleaned, title: pageTitle, links };
}

/**
 * Crawls a website starting from the given URL, stays within the same domain,
 * combines all text, then ingests it into the knowledge base as one document.
 */
export async function scrapeWebsite(
  startUrl: string,
  siteTitle: string,
  userId: mongoose.Types.ObjectId
): Promise<ScrapeResult> {
  // Normalise the start URL
  const origin = new URL(startUrl).origin;
  const hostname = new URL(startUrl).hostname;

  const visited = new Set<string>();
  const queue: string[] = [normaliseUrl(startUrl, startUrl) ?? startUrl];
  const allTexts: string[] = [];
  let firstPageTitle = siteTitle;

  console.log(`🌐 Starting crawl: ${startUrl} (domain: ${hostname}, limit: ${CRAWL_LIMIT} pages)`);

  // Create the document record upfront so the UI shows "processing" immediately
  const doc = await CollegeDocument.create({
    title: siteTitle || `Website: ${hostname}`,
    originalFilename: `${hostname}.web`,
    department: null,
    uploadedBy: userId,
    status: 'processing',
  });

  try {
    while (queue.length > 0 && visited.size < CRAWL_LIMIT) {
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);

      console.log(`  📄 [${visited.size}/${CRAWL_LIMIT}] Fetching: ${url}`);

      try {
        const { text, title, links } = await fetchPageText(url);

        if (text.length > 100) {                         // skip near-empty pages
          allTexts.push(`=== ${title} ===\nURL: ${url}\n\n${text}`);
        }

        if (visited.size === 1) firstPageTitle = title;  // use first page title

        // Enqueue same-domain links not yet visited
        for (const href of links) {
          const resolved = normaliseUrl(href, url);
          if (!resolved) continue;
          try {
            const linkHost = new URL(resolved).hostname;
            if (linkHost === hostname && !visited.has(resolved) && !queue.includes(resolved)) {
              queue.push(resolved);
            }
          } catch { /* skip malformed */ }
        }

        // Polite delay
        if (queue.length > 0 && visited.size < CRAWL_LIMIT) {
          await new Promise(r => setTimeout(r, DELAY_MS));
        }
      } catch (pageErr) {
        console.warn(`  ⚠️  Failed to fetch ${url}:`, (pageErr as Error).message);
      }
    }

    if (allTexts.length === 0) {
      throw new Error('No usable text could be extracted from the website.');
    }

    const combinedText = allTexts.join('\n\n---\n\n');
    console.log(`✅ Crawl done: ${visited.size} pages, ${combinedText.length} chars total`);

    // Update title if we got a better one from the page
    if (!siteTitle) {
      await CollegeDocument.findByIdAndUpdate(doc._id, {
        title: `${firstPageTitle} (${hostname})`,
      });
    }

    // Ingest as a plain-text buffer
    const textBuffer = Buffer.from(combinedText, 'utf-8');
    await ingestDocument(doc._id as mongoose.Types.ObjectId, textBuffer, 'text/plain');

    return {
      pagesScraped: visited.size,
      documentId: (doc._id as mongoose.Types.ObjectId).toString(),
      title: siteTitle || `${firstPageTitle} (${hostname})`,
    };
  } catch (err) {
    // Mark as failed if something went wrong
    await Chunk.deleteMany({ documentId: doc._id });
    await CollegeDocument.findByIdAndUpdate(doc._id, { status: 'failed', chunkCount: 0 });
    throw err;
  }
}
