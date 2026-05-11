/**
 * HTML to Markdown Converter Content Script
 *
 * This script is injected into HTML pages when the user triggers
 * "View as Markdown" via the context menu. It extracts the readable
 * article content using Readability, converts it to Markdown using
 * Turndown, and stores the result on window so the viewer can consume it.
 */

import { isProbablyReaderable, Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
// @ts-ignore – no bundled typings for turndown-plugin-gfm
import { gfm } from 'turndown-plugin-gfm';

export interface HtmlConvertedMarkdown {
  markdown: string;
  title: string;
  /** Original page URL */
  url: string;
}

declare global {
  interface Window {
    __mvHtmlConvertedMarkdown?: HtmlConvertedMarkdown;
    __markdownViewerInjected?: boolean;
  }
}

if (window.__markdownViewerInjected) {
  console.log('[html-to-markdown] Markdown Viewer already injected, skipping DOM convert.');
} else {
  function convertHtmlPageToMarkdown(): HtmlConvertedMarkdown | null {
  // Self-detect: only convert if the page is a rendered HTML document.
  // For raw files (text/plain, application/octet-stream, etc.) the viewer
  // can render them directly from document.body.textContent.
  const contentType: string =
    (document as unknown as { contentType?: string }).contentType || '';

  if (contentType && !contentType.includes('text/html')) {
    return null;
  }

  // If contentType is empty (e.g. some file:// URLs) check whether the body
  // is just a single <pre> wrapper – a clear sign this is raw plain text.
  if (!contentType) {
    const kids = Array.from(document.body?.children ?? []);
    if (kids.length === 1 && kids[0].tagName === 'PRE') {
      return null;
    }
  }
  // Clone to avoid mutating the live DOM
  const documentClone = document.cloneNode(true) as Document;

  // Try Readability-based article extraction first
  let articleContent: string | null = null;
  let articleTitle = document.title || '';

  const isReaderable = isProbablyReaderable(documentClone);

  try {
    if (isReaderable) {
      const reader = new Readability(documentClone);
      const article = reader.parse();
      if (article) {
        articleContent = article.content || null;
        if (article.title) articleTitle = article.title;
      }
    }
  } catch (e) {
    console.warn('[mv:html2md] Readability failed:', e);
    // Readability failed; fall through to manual fallback
  }

  // Fallback: pick the most content-rich container
  if (!articleContent) {
    const mainEl =
      documentClone.querySelector('main') ||
      documentClone.querySelector('[role="main"]') ||
      documentClone.querySelector('#main-content') ||
      documentClone.querySelector('#main') ||
      documentClone.querySelector('#content') ||
      documentClone.querySelector('.content') ||
      documentClone.body;

    articleContent = mainEl ? mainEl.innerHTML : documentClone.body.innerHTML;
  }

  // Set up Turndown
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });
  td.use(gfm);

  // Remove elements Turndown should silently ignore
  td.remove([
    'script',
    'style',
    'noscript',
    'svg' as any,
    'iframe',
    'canvas',
    'form',
    'button',
    'dialog',
  ]);

  // Skip base64 images – they bloat the markdown and are useless as text
  td.addRule('ignoreBase64Images', {
    filter(node: Node): boolean {
      if ((node as Element).nodeName === 'IMG') {
        const src = (node as Element).getAttribute('src') || '';
        return src.startsWith('data:image');
      }
      return false;
    },
    replacement(): string {
      return '';
    },
  });

  let markdown = td.turndown(articleContent);

  // Clean up: lone dashes / middle-dots on their own line
  markdown = markdown.replace(/^[ \t]*[-·][ \t]*$/gm, '');
  // Collapse runs of blank lines to a single blank line
  markdown = markdown.replace(/^[ \t]+$/gm, '');
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

  return {
    markdown,
    title: articleTitle,
    url: window.location.href,
  };
}

  // Run immediately when injected and expose the result on window.
  // Returns null for non-HTML pages so the viewer falls back to raw textContent.
  const result = convertHtmlPageToMarkdown();
  if (result) {
    window.__mvHtmlConvertedMarkdown = result;
  }
}
