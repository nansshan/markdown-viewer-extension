import { getCurrentDocumentUrl } from '../core/document-utils';
import { escapeHtml } from '../core/markdown-processor';
import type { TranslateFunction } from '../types/core';
import {
  truncate, formatLineRef, getBlockRange, rangesOverlap, isMediaBlock,
  formatExportText,
  findTrLineInBlock, findLiLineInBlock, findCodeLineInBlock, narrowLineInBlock,
  COLOR_MAP, COLOR_LABELS, SKIP_ANNOTATION_TAGS,
  type RemarkColor, type RemarkAnnotation,
} from './remark-utils';

/**
 * Remark Mode — Block-level annotation for rendered Markdown
 *
 * Features:
 * - Toolbar toggle to enter/exit Remark Mode
 * - Text selection → popup with color picker and note input
 * - Block-level highlights using data-line attributes
 * - Right sidebar listing all annotations with delete
 * - Hover tooltip showing annotation note on highlighted blocks
 * - Persistence via chrome.storage.local (keyed by page URL)
 * - Clipboard export in structured prompt format
 */

// ─── Types (re-exported from remark-utils for consumers) ─────────────────────

export type { RemarkColor, RemarkAnnotation } from './remark-utils';

export interface RemarkModeController {
  isActive(): boolean;
  enter(): void;
  exit(): void;
  getAnnotations(): RemarkAnnotation[];
  removeAnnotation(id: string): void;
  updateAnnotationNote(id: string, note: string): void;
  exportToClipboard(): Promise<{ ok: boolean; reason?: string }>;
  loadAnnotations(): Promise<void>;
  dispose(): void;
}

export interface RemarkModeOptions {
  /** The container holding rendered markdown blocks with data-line attrs */
  getContainer(): HTMLElement | null;
  /** Get raw markdown source for export context */
  getRawMarkdown(): string;
  /** Active translation function from the viewer runtime */
  translate?: TranslateFunction;
  /** Callback when mode changes */
  onModeChange?(active: boolean): void;
  /** Callback when annotation count changes (for badge on toolbar button) */
  onAnnotationCountChange?(count: number): void;
  /** Storage key for persistence (typically the page URL) */
  getStorageKey?(): string;
}

// ─── i18n helper ─────────────────────────────────────────────────────────────

function defaultTranslate(key: string, substitutions?: string | string[]): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
      const msg = chrome.i18n.getMessage(key, substitutions);
      if (msg) return msg;
    }
  } catch {
    // Non-extension context
  }
  return key;
}

// ─── Controller ──────────────────────────────────────────────────────────────

export function createRemarkMode(options: RemarkModeOptions): RemarkModeController {
  const { getContainer, getRawMarkdown, onModeChange, onAnnotationCountChange, getStorageKey } = options;
  const translate = options.translate || defaultTranslate;

  function t(key: string, fallback: string): string {
    const translated = translate(key);
    return !translated || translated === key ? fallback : translated;
  }

  function tf(key: string, fallback: string, substitutions: string | string[]): string {
    const translated = translate(key, substitutions);
    if (!translated || translated === key) {
      const values = Array.isArray(substitutions) ? substitutions : [substitutions];
      return values.reduce((result, value, index) => result.split(`{${index}}`).join(value), fallback);
    }
    return translated;
  }

  let active = false;
  let annotations: RemarkAnnotation[] = [];
  let softDeletedIds: Set<string> = new Set(); // IDs in 5s undo window — excluded from export
  let abortController: AbortController | null = null;
  let popupEl: HTMLElement | null = null;
  let sidebarEl: HTMLElement | null = null;
  let tooltipEl: HTMLElement | null = null;
  let pendingFocusId: string | null = null; // for focus chain across re-renders
  let sidebarHideCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  let sidebarHideCleanupToken = 0;

  function cancelPendingSidebarCleanup(): void {
    sidebarHideCleanupToken += 1;
    if (sidebarHideCleanupTimer !== null) {
      clearTimeout(sidebarHideCleanupTimer);
      sidebarHideCleanupTimer = null;
    }
  }

  function getColorLabel(color: RemarkColor): string {
    switch (color) {
      case 'yellow':
        return t('remark_color_yellow', COLOR_LABELS.yellow);
      case 'green':
        return t('remark_color_green', COLOR_LABELS.green);
      case 'blue':
        return t('remark_color_blue', COLOR_LABELS.blue);
      case 'pink':
        return t('remark_color_pink', COLOR_LABELS.pink);
    }
  }

  function isActive(): boolean {
    return active;
  }

  function enter(): void {
    if (active) return;
    active = true;
    abortController = new AbortController();
    const signal = abortController.signal;

    const container = getContainer();
    if (container) {
      container.classList.add('remark-mode-active');
      container.addEventListener('mouseup', handleSelection, { signal });
      container.addEventListener('mouseover', handleHover, { signal });
      container.addEventListener('mouseout', handleHoverOut, { signal });
    }


    document.body.classList.add('remark-panel-open');
    injectStyles();
    renderHighlights();
    showSidebar();

    // Always schedule to catch streamed/async blocks that appear after enter().
    // Handles: container not yet in DOM, [data-line] not yet rendered, and
    // incremental streaming renders where only a partial DOM exists at enter() time.
    scheduleHighlightsAfterRender();

    onModeChange?.(true);
  }

  function exit(): void {
    if (!active) return;
    active = false;
    abortController?.abort();
    abortController = null;

    // Commit any pending deletes immediately on exit
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
    if (undoQueue.length) { commitPendingDeletes(); }

    hidePopup();
    hideTooltip();
    onModeChange?.(false); // toolbar state changes immediately

    // Choreographed exit: fade highlights first, then slide sidebar
    const container = getContainer();
    if (container) {
      container.classList.remove('remark-mode-active');
      container.classList.add('remark-exiting');
      // Highlights fade via CSS transition (120ms)
      setTimeout(() => {
        container.classList.remove('remark-exiting');
        clearHighlights();
      }, 160);
    }
    hideSidebar();
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  function storageKey(): string {
    if (getStorageKey) return getStorageKey();
    // Normalize against the active document rather than the iframe URL, so
    // workspace mode keys by the current file path instead of viewer-embed.html.
    try {
      const url = new URL(getCurrentDocumentUrl());
      url.hash = '';
      url.search = '';
      return `rmk:${url.href}`;
    } catch {
      const { origin, pathname } = window.location;
      return `rmk:${origin}${pathname}`;
    }
  }

  async function saveAnnotations(): Promise<void> {
    try {
      const key = storageKey();
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [key]: annotations });
      } else {
        localStorage.setItem(key, JSON.stringify(annotations));
      }
    } catch {
      // Silently fail — annotations remain in-memory
    }
  }

  async function loadAnnotations(): Promise<void> {
    try {
      const key = storageKey();
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get(key);
        if (result[key] && Array.isArray(result[key])) {
          annotations = result[key];
        }
      } else {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) annotations = parsed;
        }
      }
    } catch {
      // Start with empty annotations
    }
    if (active) {
      renderHighlights();
      renderSidebarContent();
    } else {
      notifyCount();
      // If URL contains ?remarker=true, always auto-enter after DOM is ready
      if (typeof window !== 'undefined' && window.location.search.includes('remarker=true')) {
        enter();
      } else if (annotations.length > 0) {
        // Not auto-entering, but schedule highlights so badge renders after DOM is ready
        scheduleHighlightsAfterRender();
      }
    }
  }

  function scheduleHighlightsAfterRender(): void {
    // Watches for new [data-line] blocks being added to the container (streaming render).
    // Only reacts to additions of block elements, NOT to highlight spans added by
    // renderHighlights() itself — preventing infinite loops.
    // Debounces to coalesce burst renders; self-disconnects after the DOM stabilises.
    function watchContainer(container: Element): void {
      // Immediate render if blocks already exist.
      if (container.querySelector('[data-line]')) {
        if (active) { renderHighlights(); renderSidebarContent(); } else { notifyCount(); }
      }

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let stableTimer: ReturnType<typeof setTimeout> | null = null;
      const DEBOUNCE_MS = 150;
      const STABLE_MS = 3000;   // disconnect 3 s after the last new block arrives
      const MAX_MS = 15000;     // hard cap to avoid leaks on very large files

      const obs = new MutationObserver((mutations) => {
        // Only react when new [data-line] block elements are added, not when
        // renderHighlights() inserts its own highlight spans (no data-line attr).
        const hasNewBlock = mutations.some(m =>
          [...m.addedNodes].some(n =>
            n instanceof Element &&
            (n.hasAttribute('data-line') || n.querySelector('[data-line]') !== null)
          )
        );
        if (!hasNewBlock) return;

        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (active) { renderHighlights(); renderSidebarContent(); } else { notifyCount(); }
        }, DEBOUNCE_MS);

        // Reset the stability timer so we disconnect only after a quiet period.
        if (stableTimer) clearTimeout(stableTimer);
        stableTimer = setTimeout(() => obs.disconnect(), STABLE_MS);
      });

      obs.observe(container, { childList: true, subtree: true });
      setTimeout(() => obs.disconnect(), MAX_MS);
    }

    const container = getContainer();
    if (container) {
      watchContainer(container);
      return;
    }

    // Container not yet in DOM (e.g., ?remarker=true fires before markdown renders).
    // Watch document.body until the container element appears.
    const bodyObs = new MutationObserver(() => {
      const c = getContainer();
      if (c) {
        bodyObs.disconnect();
        watchContainer(c);
      }
    });
    bodyObs.observe(document.body, { childList: true, subtree: true });
  }

  // ─── Selection Handling ──────────────────────────────────────────────────

  function handleSelection(): void {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      return;
    }

    const range = sel.getRangeAt(0);
    const container = getContainer();
    if (!container || !container.contains(range.commonAncestorContainer)) {
      return;
    }

    const selectedText = sel.toString().trim();
    if (!selectedText) return;

    const { startLine, endLine, blockId, startBlock } = findBlockRange(range, container);
    if (startLine < 0) return;

    // Skip media blocks (images, charts, diagrams)
    if (startBlock && isMediaBlock(startBlock)) return;

    showPopup(range, selectedText, startLine, endLine, blockId, startBlock ?? undefined);
  }


  function findBlockRange(range: Range, container: HTMLElement): { startLine: number; endLine: number; blockId?: string; startBlock: HTMLElement | null } {
    const startBlock = findBlockAncestor(range.startContainer, container);
    const endBlock = findBlockAncestor(range.endContainer, container);

    if (!startBlock) return { startLine: -1, endLine: -1, startBlock: null };

    const startLine = Number(startBlock.getAttribute('data-line')) || 0;
    const startCount = Number(startBlock.getAttribute('data-line-count')) || 1;

    // Browser Range boundary quirk: when a selection ends exactly at the start of the
    // next sibling block (offset 0 of the next div.md-block), endContainer lands on that
    // next block rather than inside the current one.  Treat this as a single-block
    // selection ending at the end of startBlock.
    const isBoundaryEnd = endBlock && endBlock !== startBlock && range.endOffset === 0;

    if (!endBlock || endBlock === startBlock || isBoundaryEnd) {
      const narrow = narrowLineInBlock(range.startContainer, range.startOffset, range.endContainer, range.endOffset, startBlock);
      return {
        startLine: narrow?.startLine ?? startLine,
        endLine: narrow?.endLine ?? (startLine + startCount - 1),
        blockId: startBlock.getAttribute('data-block-id') || undefined,
        startBlock,
      };
    }

    const endLine = Number(endBlock.getAttribute('data-line')) || 0;
    const endCount = Number(endBlock.getAttribute('data-line-count')) || 1;

    // Cross-block selection: try to narrow each endpoint independently
    const startNarrow = narrowLineInBlock(range.startContainer, range.startOffset, range.startContainer, range.startOffset, startBlock);
    const endNarrow = narrowLineInBlock(range.endContainer, range.endOffset, range.endContainer, range.endOffset, endBlock);
    return {
      startLine: startNarrow?.startLine ?? startLine,
      endLine: endNarrow?.endLine ?? (endLine + endCount - 1),
      blockId: startBlock.getAttribute('data-block-id') || undefined,
      startBlock,
    };
  }




  function findBlockAncestor(node: Node, container: HTMLElement): HTMLElement | null {
    let el: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
    while (el && el !== container) {
      if (el.hasAttribute('data-line') && el.hasAttribute('data-block-id')) return el;
      el = el.parentElement;
    }
    return null;
  }

  // ─── Hover Tooltip ─────────────────────────────────────────────────────────

  function handleHover(e: Event): void {
    const target = (e.target as HTMLElement).closest?.('[data-line][data-block-id]') as HTMLElement | null;
    if (!target || !target.classList.contains('remark-highlighted')) return;
    if (isMediaBlock(target)) return;

    const { start: blockLine, end: blockEnd } = getBlockRange(target);

    // Find annotations for this block
    const blockAnns = annotations.filter(a => rangesOverlap(a.startLine, a.endLine, blockLine, blockEnd));
    if (blockAnns.length === 0) return;

    showTooltip(target, blockAnns);
  }

  function handleHoverOut(e: Event): void {
    const target = (e.target as HTMLElement).closest?.('[data-line][data-block-id]') as HTMLElement | null;
    if (!target) return;
    // Only hide if moving away from a highlighted block
    const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
    if (related && (related.closest?.('.remark-tooltip') || related.closest?.('[data-line][data-block-id].remark-highlighted'))) {
      return;
    }
    hideTooltip();
  }

  function showTooltip(anchor: HTMLElement, anns: RemarkAnnotation[]): void {
    // Only show tooltip for annotations that have a note written
    const annsWithNote = anns.filter(a => a.note);
    if (annsWithNote.length === 0) return;

    hideTooltip();
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'remark-tooltip';

    const items = annsWithNote.map(a => {
      return `<div class="remark-tooltip-item">${COLOR_MAP[a.color].emoji} ${escapeHtml(a.note)}</div>`;
    }).join('');

    tooltipEl.innerHTML = items;
    document.body.appendChild(tooltipEl);

    const rect = anchor.getBoundingClientRect();
    tooltipEl.style.top = `${rect.top - tooltipEl.offsetHeight - 6}px`;
    tooltipEl.style.left = `${rect.left}px`;

    // Keep in viewport
    if (tooltipEl.offsetTop < 4) {
      tooltipEl.style.top = `${rect.bottom + 6}px`;
    }

    tooltipEl.addEventListener('mouseleave', () => hideTooltip());
  }

  function hideTooltip(): void {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  }

  // ─── Popup ─────────────────────────────────────────────────────────────────

  function showPopup(range: Range, selectedText: string, startLine: number, endLine: number, blockId?: string, targetBlock?: HTMLElement): void {
    hidePopup();

    // Highlight the block being annotated
    if (targetBlock) {
      targetBlock.classList.add('remark-popup-target');
    }

    // Create annotation immediately with default color
    const annId = generateId();
    const ann: RemarkAnnotation = {
      id: annId, startLine, endLine, selectedText,
      note: '', color: 'yellow', timestamp: Date.now(), blockId,
    };
    annotations.push(ann);
    renderHighlights();
    renderSidebarContent();
    notifyCount();
    void saveAnnotations();

    const rect = range.getBoundingClientRect();
    popupEl = document.createElement('div');
    popupEl.className = 'remark-popup';
    popupEl.innerHTML = buildPopupHTML(selectedText);

    document.body.appendChild(popupEl);

    // Position below selection
    const popupRect = popupEl.getBoundingClientRect();
    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (popupRect.width / 2);

    if (left < 8) left = 8;
    if (left + popupRect.width > window.innerWidth - 8) {
      left = window.innerWidth - popupRect.width - 8;
    }
    if (top + popupRect.height > window.innerHeight - 8) {
      top = rect.top - popupRect.height - 8;
    }

    popupEl.style.top = `${top}px`;
    popupEl.style.left = `${left}px`;

    // Wire color buttons — change existing annotation's color
    let interacted = false;
    const colorsDiv = popupEl.querySelector<HTMLElement>('.remark-popup-colors');
    const colorToggleBtn = popupEl.querySelector<HTMLButtonElement>('.remark-color-toggle');
    const colorBtns = popupEl.querySelectorAll<HTMLButtonElement>('.remark-color-btn');

    // Toggle color picker on dot click
    colorToggleBtn?.addEventListener('click', () => {
      const isOpen = colorsDiv?.style.display !== 'none';
      if (colorsDiv) colorsDiv.style.display = isOpen ? 'none' : 'flex';
    });

    colorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        interacted = true;
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ann.color = btn.dataset.color as RemarkColor;
        // Update toggle dot to reflect selected color
        if (colorToggleBtn) colorToggleBtn.textContent = COLOR_MAP[ann.color].emoji;
        // Collapse the picker after selection
        if (colorsDiv) colorsDiv.style.display = 'none';
        renderHighlights();
        renderSidebarContent();
        void saveAnnotations();
      });
    });

    const cancelBtn = popupEl.querySelector('.remark-cancel-btn');
    const noteInput = popupEl.querySelector<HTMLTextAreaElement>('.remark-note-input');

    // Cancel → delete the just-created annotation
    cancelBtn?.addEventListener('click', () => {
      annotations = annotations.filter(a => a.id !== annId);
      renderHighlights();
      renderSidebarContent();
      notifyCount();
      void saveAnnotations();
      hidePopup();
      window.getSelection()?.removeAllRanges();
    });

    // Save note on Enter (without shift)
    noteInput?.addEventListener('keydown', (ke) => {
      if (ke.key === 'Enter' && !ke.shiftKey) {
        ke.preventDefault();
        ann.note = noteInput.value.trim();
        renderSidebarContent();
        void saveAnnotations();
        hidePopup();
        window.getSelection()?.removeAllRanges();
      }
    });

    setTimeout(() => noteInput?.focus(), 50);


    // Click outside → cancel (remove annotation) if user never interacted; otherwise save
    const outsideHandler = (e: MouseEvent) => {
      if (popupEl && !popupEl.contains(e.target as Node)) {
        const note = noteInput?.value.trim() ?? '';
        if (!interacted && note === '') {
          // No interaction — silently discard the annotation
          annotations = annotations.filter(a => a.id !== annId);
          renderHighlights();
          renderSidebarContent();
          notifyCount();
          void saveAnnotations();
          window.getSelection()?.removeAllRanges();
        } else if (noteInput) {
          ann.note = note;
          renderSidebarContent();
          void saveAnnotations();
        }
        hidePopup();
        document.removeEventListener('mousedown', outsideHandler);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', outsideHandler), 100);
  }

  function buildPopupHTML(selectedText: string): string {
    const preview = escapeHtml(truncate(selectedText, 80));

    return `
      <div class="remark-popup-header">
        <span class="remark-popup-quote">"${preview}"</span>
      </div>
      <div class="remark-popup-colors" style="display:none">
        ${(Object.keys(COLOR_MAP) as RemarkColor[]).map((c, i) => `
          <button class="remark-color-btn${i === 0 ? ' active' : ''}" data-color="${c}" title="${t(`remark_color_${c}`, COLOR_LABELS[c])}">
            ${COLOR_MAP[c].emoji} <span class="remark-color-label">${getColorLabel(c)}</span>
          </button>
        `).join('')}
      </div>
      <textarea class="remark-note-input" placeholder="${t('remark_add_note', 'Add a note...')}" rows="2"></textarea>
      <div class="remark-popup-actions">
        <button class="remark-color-toggle" title="${t('remark_change_color', 'Change color')}">${COLOR_MAP.yellow.emoji}</button>
        <button class="remark-cancel-btn">${t('remark_cancel', 'Cancel & remove')}</button>
      </div>
    `;
  }

  function hidePopup(): void {
    if (popupEl) {
      popupEl.remove();
      popupEl = null;
    }
    // Remove any temporary block highlight
    document.querySelectorAll('.remark-popup-target')
      .forEach(el => el.classList.remove('remark-popup-target'));
  }

  // ─── Annotations ───────────────────────────────────────────────────────────

  function notifyCount(): void {
    const visibleCount = annotations.filter(a => !softDeletedIds.has(a.id)).length;
    onAnnotationCountChange?.(visibleCount);
  }

  function addAnnotation(
    selectedText: string, note: string, color: RemarkColor,
    startLine: number, endLine: number, blockId?: string
  ): void {
    const ann: RemarkAnnotation = {
      id: generateId(),
      startLine,
      endLine,
      selectedText,
      note,
      color,
      timestamp: Date.now(),
      blockId,
    };
    annotations.push(ann);
    renderHighlights();
    renderSidebarContent();
    notifyCount();
    void saveAnnotations();
  }

  function updateExportBtnState(): void {
    const exportBtn = sidebarEl?.querySelector<HTMLButtonElement>('.remark-sidebar-export');
    if (!exportBtn) return;
    const hasVisible = annotations.some(a => !softDeletedIds.has(a.id));
    exportBtn.disabled = !hasVisible;
    exportBtn.style.opacity = hasVisible ? '' : '0.5';
    exportBtn.style.cursor = hasVisible ? '' : 'not-allowed';
  }

  // ─── Undo Toast System ─────────────────────────────────────────────────────
  // Gmail-style: item disappears immediately, quiet toast with Undo at sidebar bottom.
  // No countdown, no progress bar, no dimmed corpse.

  let undoQueue: Array<{ id: string; ann: RemarkAnnotation }> = [];
  let undoTimer: ReturnType<typeof setTimeout> | null = null;
  const UNDO_MS = 5000;

  function showUndoToast(): void {
    if (!sidebarEl) return;
    let toast = sidebarEl.querySelector<HTMLElement>('.remark-undo-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'remark-undo-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      sidebarEl.appendChild(toast);
    }
    const count = undoQueue.length;
    const label = count > 1
      ? `${t('remark_deleted', 'Deleted')} ${count}`
      : t('remark_deleted', 'Deleted');
    toast.innerHTML = `<span>${label}</span><button class="remark-undo-btn">↩ ${t('remark_undo', 'Undo')}</button>`;
    toast.style.display = 'flex';

    toast.querySelector('.remark-undo-btn')?.addEventListener('click', () => {
      if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
      for (const entry of undoQueue) {
        softDeletedIds.delete(entry.id);
        // Restore if already removed from array
        if (!annotations.find(a => a.id === entry.id)) {
          annotations.push(entry.ann);
        }
      }
      undoQueue = [];
      hideUndoToast();
      renderHighlights();
      renderSidebarContent();
      notifyCount();
      updateExportBtnState();
      void saveAnnotations();
    }, { once: true });

    // Reset the commit timer
    if (undoTimer) clearTimeout(undoTimer);
    undoTimer = setTimeout(commitPendingDeletes, UNDO_MS);
  }

  function hideUndoToast(): void {
    const toast = sidebarEl?.querySelector<HTMLElement>('.remark-undo-toast');
    if (toast) toast.style.display = 'none';
  }

  function commitPendingDeletes(): void {
    undoTimer = null;
    for (const entry of undoQueue) {
      annotations = annotations.filter(a => a.id !== entry.id);
      softDeletedIds.delete(entry.id);
    }
    undoQueue = [];
    hideUndoToast();
    notifyCount();
    void saveAnnotations();
  }

  function removeAnnotation(id: string): void {
    const ann = annotations.find(a => a.id === id);
    if (!ann) return;
    // Optimistic delete: disappear immediately, undo via toast
    softDeletedIds.add(id);
    undoQueue.push({ id, ann: { ...ann } });
    updateExportBtnState();
    renderHighlights();
    renderSidebarContent();
    notifyCount();
    showUndoToast();
  }

  function updateAnnotationNote(id: string, note: string): void {
    const ann = annotations.find(a => a.id === id);
    if (!ann) return;
    ann.note = note;
    renderSidebarContent();
    void saveAnnotations();
  }

  function getAnnotations(): RemarkAnnotation[] {
    return [...annotations];
  }

  // ─── Sidebar ───────────────────────────────────────────────────────────────

  function showSidebar(): void {
    const el = document.getElementById('remark-sidebar');
    if (!el) return;
    cancelPendingSidebarCleanup();
    sidebarEl = el;

    // Always inject fresh content (innerHTML is cleared after hide transition)
    el.innerHTML = `
      <div class="remark-sidebar-header">
        <span class="remark-sidebar-title">${t('remark_sidebar_title', 'Remarks')} <span class="remark-sidebar-count"></span></span>
        <div class="remark-sidebar-actions">
          <button class="remark-sidebar-export" title="${t('remark_copy_tooltip', 'Copy all remarks to clipboard')}">📋 ${t('remark_copy_btn', 'Copy remarks')}</button>
          <button class="remark-sidebar-clear" title="${t('remark_clear_all', 'Clear all remarks')}">🗑️</button>
        </div>
      </div>
      <div class="remark-sidebar-list"></div>
    `;

    el.classList.remove('remark-sidebar-closed');

    // Wire export button: copy and reset (no auto-exit, allows repeated copy)
    const exportBtn = el.querySelector<HTMLButtonElement>('.remark-sidebar-export');
    exportBtn?.addEventListener('click', async () => {
      const result = await exportToClipboard();
      if (exportBtn) {
        if (result.ok) {
          exportBtn.textContent = `✅ ${t('remark_copied', 'Copied!')}`;
          exportBtn.disabled = true;
          setTimeout(() => {
            exportBtn.textContent = `📋 ${t('remark_copy_btn', 'Copy remarks')}`;
            exportBtn.disabled = false;
          }, 2000);
        } else {
          exportBtn.textContent = `⚠️ ${t('remark_copy_failed', 'Failed')}`;
          setTimeout(() => { exportBtn.textContent = `📋 ${t('remark_copy_btn', 'Copy remarks')}`; exportBtn.disabled = false; }, 2000);
        }
      }
    });

    // Set initial copy button disabled state
    updateExportBtnState();

    // Wire clear-all button — uses unified undo toast system
    const clearBtn = el.querySelector<HTMLButtonElement>('.remark-sidebar-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const activeAnns = annotations.filter(a => !softDeletedIds.has(a.id));
        if (activeAnns.length === 0) return;
        // Queue all active annotations for undo
        for (const ann of activeAnns) {
          softDeletedIds.add(ann.id);
          undoQueue.push({ id: ann.id, ann: { ...ann } });
        }
        updateExportBtnState();
        renderHighlights();
        renderSidebarContent();
        notifyCount();
        showUndoToast();
      });
    }

    renderSidebarContent();
  }

  function hideSidebar(): void {
    if (sidebarEl) {
      sidebarEl.classList.add('remark-sidebar-closed');
      // Body margin transitions via CSS (same duration as sidebar slide-out)
      document.body.classList.remove('remark-panel-open');
      const el = sidebarEl;
      sidebarEl = null;
      const cleanupToken = ++sidebarHideCleanupToken;
      const onDone = (): void => {
        if (cleanupToken !== sidebarHideCleanupToken) {
          el.removeEventListener('transitionend', onDone);
          return;
        }

        el.removeEventListener('transitionend', onDone);
        if (sidebarHideCleanupTimer !== null) {
          clearTimeout(sidebarHideCleanupTimer);
          sidebarHideCleanupTimer = null;
        }
        el.innerHTML = ''; // Clear content after slide-out so next enter creates fresh HTML
      };
      el.addEventListener('transitionend', onDone, { once: true });
      sidebarHideCleanupTimer = setTimeout(onDone, 400);
    }
  }

  function renderSidebarContent(): void {
    if (!sidebarEl) return;
    const list = sidebarEl.querySelector('.remark-sidebar-list');
    const countEl = sidebarEl.querySelector('.remark-sidebar-count');
    if (!list) return;

    // Filter out soft-deleted annotations
    const visibleAnnotations = annotations.filter(a => !softDeletedIds.has(a.id));

    // Update count badge in header
    if (countEl) {
      countEl.textContent = visibleAnnotations.length > 0 ? `(${visibleAnnotations.length})` : '';
    }

    if (visibleAnnotations.length === 0) {
      list.innerHTML = `<div class="remark-sidebar-empty">${t('remark_empty_hint', 'Select text to add remarks')}</div>`;
      return;
    }

    const sorted = [...visibleAnnotations].sort((a, b) => a.startLine - b.startLine);
    list.innerHTML = sorted.map(ann => {
      const lineRef = formatLineRef(ann.startLine, ann.endLine);
      const quote = escapeHtml(truncate(ann.selectedText, 50));
      const noteHtml = ann.note
        ? `<div class="remark-sidebar-note" data-editable title="${t('remark_edit_note', 'Click to edit')}">${escapeHtml(ann.note)}</div>`
        : `<div class="remark-sidebar-note remark-note-placeholder" data-editable title="${t('remark_add_note', 'Add a note…')}">${t('remark_add_note', 'Add a note…')}</div>`;

      return `
        <div class="remark-sidebar-item" data-ann-id="${ann.id}">
          <div class="remark-sidebar-item-header">
            <span>${COLOR_MAP[ann.color].emoji} <strong>${lineRef}</strong></span>
            <button class="remark-sidebar-delete" data-ann-id="${ann.id}" title="${t('remark_delete', 'Delete')}">✕</button>
          </div>
          <div class="remark-sidebar-quote">"${quote}"</div>
          ${noteHtml}
        </div>
      `;
    }).join('');

    const focusAnnotationFromSidebar = (id: string): void => {
      const ann = annotations.find(a => a.id === id);
      if (!ann) return;

      const container = getContainer();
      if (container) {
        // Use range-overlap so row-level annotations (whose startLine may differ
        // from the block's data-line) still scroll to the correct block.
        const block = Array.from(
          container.querySelectorAll<HTMLElement>('[data-line]')
        ).find(el => {
          const { start, end } = getBlockRange(el);
          return rangesOverlap(start, end, ann.startLine, ann.endLine);
        }) ?? null;
        if (block) {
          const rect = block.getBoundingClientRect();
          const inViewport = rect.top >= 0 && rect.bottom <= window.innerHeight;
          if (!inViewport) {
            block.scrollIntoView({ behavior: 'auto', block: 'center' });
            // Landing pulse after scroll settles
            setTimeout(() => {
              block.classList.add('remark-landing');
              setTimeout(() => block.classList.remove('remark-landing'), 1000);
            }, 300);
          } else {
            // Already visible — pulse immediately
            block.classList.add('remark-landing');
            setTimeout(() => block.classList.remove('remark-landing'), 1000);
          }
        }
      }

      const targetItem = list.querySelector(`.remark-sidebar-item[data-ann-id="${id}"]`);
      const noteEl = targetItem?.querySelector('[data-editable]') as HTMLElement | null;
      if (noteEl) noteEl.click();
    };

    const requestAnnotationFocus = (id: string, event?: MouseEvent): void => {
      const activeEditor = sidebarEl?.querySelector('.remark-sidebar-note-editor') as HTMLTextAreaElement | null;
      const activeItemId = activeEditor?.closest('.remark-sidebar-item')?.getAttribute('data-ann-id') || null;

      if (activeEditor && activeItemId !== id) {
        pendingFocusId = id;
        event?.preventDefault();
        activeEditor.blur();
        return;
      }

      focusAnnotationFromSidebar(id);
    };

    // Wire delete buttons
    list.querySelectorAll('.remark-sidebar-delete').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.annId;
        if (id) removeAnnotation(id);
      });
    });

    // Wire click-to-scroll (on header/quote area, not note)
    list.querySelectorAll('.remark-sidebar-item').forEach(item => {
      const header = item.querySelector('.remark-sidebar-item-header');
      const quote = item.querySelector('.remark-sidebar-quote');
      [header, quote].forEach(el => {
        el?.addEventListener('mousedown', (e) => {
          if ((e.target as HTMLElement | null)?.closest?.('.remark-sidebar-delete')) return;
          const id = (item as HTMLElement).dataset.annId;
          if (!id) return;
          requestAnnotationFocus(id, e as MouseEvent);
        });
      });

      // Wire inline note editing
      const noteEl = item.querySelector('[data-editable]') as HTMLElement | null;
      noteEl?.addEventListener('mousedown', (e) => {
        const id = (item as HTMLElement).dataset.annId;
        if (!id) return;
        const activeEditor = sidebarEl?.querySelector('.remark-sidebar-note-editor') as HTMLTextAreaElement | null;
        const activeItemId = activeEditor?.closest('.remark-sidebar-item')?.getAttribute('data-ann-id') || null;
        if (activeEditor && activeItemId !== id) {
          pendingFocusId = id;
          e.preventDefault();
          activeEditor.blur();
        }
      });
      noteEl?.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (item as HTMLElement).dataset.annId;
        if (!id) return;
        const ann = annotations.find(a => a.id === id);
        if (!ann) return;

        // Replace with textarea
        const ta = document.createElement('textarea');
        ta.className = 'remark-sidebar-note-editor';
        ta.value = ann.note;
        ta.placeholder = t('remark_add_note', 'Add a note…');
        ta.rows = 1;
        noteEl.replaceWith(ta);

        // Auto-expand textarea up to 5 lines
        const autoResize = (): void => {
          ta.style.height = 'auto';
          const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 18;
          const maxH = lineHeight * 5 + 12; // 5 lines + padding
          ta.style.height = `${Math.min(ta.scrollHeight, maxH)}px`;
          ta.style.overflow = ta.scrollHeight > maxH ? 'auto' : 'hidden';
        };
        ta.addEventListener('input', autoResize);
        // Initial auto-resize after DOM insertion
        requestAnimationFrame(autoResize);

        ta.focus();
        // Place cursor at end without selecting text
        const len = ta.value.length;
        ta.setSelectionRange(len, len);

        const saveEdit = (): void => {
          const newNote = ta.value.trim();
          updateAnnotationNote(id, newNote);
          // renderSidebarContent is called inside updateAnnotationNote
        };

        ta.addEventListener('blur', saveEdit);
        ta.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter' && !ke.shiftKey) {
            ke.preventDefault();
            ta.blur();
          }
          if (ke.key === 'Escape') {
            ta.removeEventListener('blur', saveEdit);
            renderSidebarContent();
          }
        });
      });
    });

    // Handle pending focus from click chain (when clicking note B while A was editing)
    if (pendingFocusId) {
      const focusId = pendingFocusId;
      pendingFocusId = null;
      setTimeout(() => focusAnnotationFromSidebar(focusId), 0);
    }

    // Keep copy button state in sync with visible annotation count
    updateExportBtnState();
  }

  // ─── Highlights ────────────────────────────────────────────────────────────

  function renderHighlights(): void {
    clearHighlights();
    const container = getContainer();
    if (!container) return;

    // Only render active (non-deleted) annotations
    const visibleAnnotations = annotations.filter(a => !softDeletedIds.has(a.id));

    for (const ann of visibleAnnotations) {
      const blocks = container.querySelectorAll<HTMLElement>('[data-line]');
      for (const block of blocks) {
        const { start: blockLine, end: blockEnd } = getBlockRange(block);

        if (rangesOverlap(blockLine, blockEnd, ann.startLine, ann.endLine)) {
          block.classList.add('remark-highlighted');
          block.style.setProperty('--remark-bg', COLOR_MAP[ann.color].bg);
          block.style.setProperty('--remark-border', COLOR_MAP[ann.color].border);

          // For narrowed (sub-block) annotations, highlight the specific element
          const isNarrowed = ann.startLine > blockLine || ann.endLine < blockEnd;
          if (isNarrowed) {
            // Table rows
            const tbody = block.querySelector('tbody');
            if (tbody) {
              Array.from(tbody.querySelectorAll<HTMLElement>('tr')).forEach((row, idx) => {
                const rowLine = blockLine + 2 + idx;
                if (rangesOverlap(ann.startLine, ann.endLine, rowLine, rowLine)) {
                  row.classList.add('remark-row-highlighted');
                  row.dataset.remarkColor = ann.color;
                }
              });
            }
            // List items
            const lis = block.querySelectorAll<HTMLElement>('li');
            if (lis.length > 0) {
              Array.from(lis).forEach((li, idx) => {
                const liLine = blockLine + idx;
                if (rangesOverlap(ann.startLine, ann.endLine, liLine, liLine)) {
                  li.classList.add('remark-li-highlighted');
                  li.dataset.remarkColor = ann.color;
                }
              });
            }
          }

          if (!block.querySelector(`.remark-badge[data-ann-id="${ann.id}"]`)) {
            const badge = document.createElement('span');
            badge.className = 'remark-badge';
            badge.dataset.annId = ann.id;
            badge.textContent = '✕';
            badge.title = `${t('remark_delete', 'Delete')}: ${ann.note || getColorLabel(ann.color)}`;
            badge.style.color = COLOR_MAP[ann.color].border;
            block.style.position = 'relative';
            badge.addEventListener('click', (e) => {
              e.stopPropagation();
              removeAnnotation(ann.id);
            });
            block.appendChild(badge);
          }
        }
      }
    }
  }

  function clearHighlights(): void {
    const container = getContainer();
    if (!container) return;

    container.querySelectorAll('.remark-highlighted').forEach(el => {
      el.classList.remove('remark-highlighted');
      (el as HTMLElement).style.removeProperty('--remark-bg');
      (el as HTMLElement).style.removeProperty('--remark-border');
    });
    container.querySelectorAll('.remark-row-highlighted').forEach(el => {
      el.classList.remove('remark-row-highlighted');
      delete (el as HTMLElement).dataset.remarkColor;
    });
    container.querySelectorAll('.remark-li-highlighted').forEach(el => {
      el.classList.remove('remark-li-highlighted');
      delete (el as HTMLElement).dataset.remarkColor;
    });
    container.querySelectorAll('.remark-badge').forEach(el => el.remove());
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  function formatExport(): string {
    if (annotations.length === 0) return '';

    const activeUrl = getCurrentDocumentUrl();
    const viewerFilePath = document.documentElement.dataset.viewerFilePath;
    let filePath = viewerFilePath
      || document.title
      || decodeURIComponent(window.location.pathname);

    try {
      const url = new URL(activeUrl);
      if (url.protocol === 'file:') {
        filePath = viewerFilePath || decodeURIComponent(url.pathname);
      } else {
        filePath = document.title || decodeURIComponent(url.pathname);
      }
    } catch {
      // Keep the best-effort fallback above.
    }

    return formatExportText(annotations.filter(a => !softDeletedIds.has(a.id)), filePath, {
      intro: tf('remark_export_intro', 'I reviewed **{0}** and have the following feedback:', filePath),
      noteLabel: t('remark_export_note', 'Note'),
      colorLabels: {
        yellow: getColorLabel('yellow'),
        green: getColorLabel('green'),
        blue: getColorLabel('blue'),
        pink: getColorLabel('pink'),
      },
    });
  }

  async function exportToClipboard(): Promise<{ ok: boolean; reason?: string }> {
    const text = formatExport();
    if (!text) return { ok: false, reason: 'No annotations to export' };

    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: (e as Error).message };
      }
    }
  }

  function dispose(): void {
    exit();
    annotations = [];
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  function generateId(): string {
    return `rmk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // ─── Styles ────────────────────────────────────────────────────────────────

  let stylesInjected = false;

  function injectStyles(): void {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'remark-mode-styles';
    style.textContent = `
      .remark-mode-active {
        cursor: text;
      }
      /* Choreographed exit: fade highlights before removing them */
      .remark-exiting .remark-highlighted,
      .remark-exiting .remark-badge,
      .remark-exiting .remark-row-highlighted,
      .remark-exiting .remark-li-highlighted {
        opacity: 0;
        transition: opacity 120ms ease-out;
      }
      /* Landing pulse — stronger ring+glow for sidebar navigation */
      @keyframes remark-landing-anim {
        0%   { box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.6); background-color: rgba(250, 204, 21, 0.25); }
        100% { box-shadow: 0 0 0 0 transparent; background-color: transparent; }
      }
      .remark-landing {
        animation: remark-landing-anim 1s ease-out;
        border-radius: 3px;
      }
      /* Row-level highlight for table annotations with narrowed line ranges */
      tr.remark-row-highlighted { background: rgba(250, 204, 21, 0.35) !important; }
      tr.remark-row-highlighted[data-remark-color="green"] { background: rgba(74, 222, 128, 0.35) !important; }
      tr.remark-row-highlighted[data-remark-color="blue"] { background: rgba(96, 165, 250, 0.35) !important; }
      tr.remark-row-highlighted[data-remark-color="pink"] { background: rgba(244, 114, 182, 0.35) !important; }
      li.remark-li-highlighted { background: rgba(250, 204, 21, 0.3) !important; border-radius: 3px; }
      li.remark-li-highlighted[data-remark-color="green"] { background: rgba(74, 222, 128, 0.3) !important; }
      li.remark-li-highlighted[data-remark-color="blue"] { background: rgba(96, 165, 250, 0.3) !important; }
      li.remark-li-highlighted[data-remark-color="pink"] { background: rgba(244, 114, 182, 0.3) !important; }
      .remark-mode-active [data-line][data-block-id]:not(:has(img, svg, canvas, figure, video)):hover {
        outline: 1px dashed var(--color-nav-active-border, var(--color-theme-accent, var(--color-primary, #2563eb)));
        outline-offset: 2px;
        border-radius: 3px;
      }
      /* Temporary highlight on the block being annotated */
      .remark-popup-target {
        outline: 2px dashed var(--color-nav-active-border, var(--color-theme-accent, var(--color-primary, #2563eb))) !important;
        outline-offset: 3px;
        border-radius: 3px;
        background: var(--color-nav-active-bg, var(--color-theme-accent-subtle, var(--color-primary-subtle, rgba(37, 99, 235, 0.06))));
      }
      .remark-highlighted {
        background: var(--remark-bg, rgba(250, 204, 21, 0.15));
        border-left: 3px solid var(--remark-border, rgba(250, 204, 21, 0.6));
        padding-left: 8px;
        border-radius: 3px;
        transition: background 0.2s;
        cursor: pointer;
      }
      .remark-badge {
        position: absolute;
        top: 2px;
        right: -24px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        user-select: none;
        opacity: 0;
        transition: opacity 0.15s, background 0.15s;
        width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
        border-radius: 50%;
        background: var(--gray-100, #f3f4f6);
      }
      .remark-highlighted:hover .remark-badge,
      .remark-badge:hover {
        opacity: 1;
      }
      .remark-badge:hover {
        background: var(--color-danger-bg, rgba(239, 68, 68, 0.15));
        color: var(--color-danger, #ef4444) !important;
        transform: scale(1.1);
      }

      /* Tooltip */
      .remark-tooltip {
        position: fixed;
        z-index: 10002;
        background: var(--color-bg-surface, #fff);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 6px;
        box-shadow: var(--shadow-popover, 0 2px 8px rgba(0,0,0,0.12));
        padding: 8px 12px;
        max-width: 300px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: var(--color-text-primary, #1a1a1a);
        pointer-events: auto;
      }
      .remark-tooltip-item {
        padding: 2px 0;
        line-height: 1.4;
      }
      .remark-tooltip-item em {
        color: var(--gray-500, #6b7280);
      }

      /* Sidebar inner layout (positioning/size handled by #remark-sidebar in styles.css) */
      .remark-sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        flex-shrink: 0;
      }
      .remark-sidebar-title {
        font-weight: 600;
        font-size: 14px;
      }
      .remark-sidebar-export {
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 6px;
        background: var(--gray-50, #f9fafb);
        padding: 4px 10px;
        cursor: pointer;
        font-size: 12px;
        color: inherit;
        transition: background 0.15s;
      }
      .remark-sidebar-export:hover {
        background: var(--gray-200, #e5e7eb);
      }
      .remark-sidebar-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .remark-sidebar-clear {
        border: 1px solid transparent;
        border-radius: 6px;
        background: none;
        padding: 4px 6px;
        cursor: pointer;
        font-size: 14px;
        color: var(--gray-400, #9ca3af);
        transition: color 0.15s, background 0.15s;
      }
      .remark-sidebar-clear:hover {
        color: var(--color-danger, #ef4444);
        background: var(--color-danger-bg, rgba(239, 68, 68, 0.08));
      }
      .remark-sidebar-clear.remark-confirm {
        color: var(--color-danger, #ef4444);
        border-color: var(--color-danger-border, #fecaca);
        animation: remark-pulse 1s ease-in-out infinite;
      }
      @keyframes remark-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .remark-sidebar-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
      .remark-sidebar-empty {
        color: var(--gray-400, #9ca3af);
        text-align: center;
        padding: 24px 16px;
        font-style: italic;
      }
      .remark-sidebar-item {
        padding: 10px 12px;
        border-radius: 6px;
        border: 1px solid var(--color-border, #e2e8f0);
        margin-bottom: 8px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .remark-sidebar-item:hover {
        background: var(--gray-50, #f9fafb);
      }
      .remark-sidebar-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .remark-sidebar-delete {
        border: none;
        background: none;
        cursor: pointer;
        color: var(--gray-400, #9ca3af);
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 4px;
        transition: color 0.15s, background 0.15s;
      }
      .remark-sidebar-delete:hover {
        color: var(--color-danger, #ef4444);
        background: var(--color-danger-bg, rgba(239, 68, 68, 0.1));
      }
      /* Undo toast — fixed at bottom of sidebar */
      .remark-undo-toast {
        display: none;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-top: 1px solid var(--color-border, #e2e8f0);
        background: var(--gray-100, #f3f4f6);
        font-size: 12px;
        color: var(--gray-600, #4b5563);
        flex-shrink: 0;
      }
      .remark-undo-toast .remark-undo-btn {
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 4px;
        background: var(--color-bg-surface, #fff);
        cursor: pointer;
        font-size: 11px;
        padding: 3px 10px;
        color: var(--color-theme-accent, var(--color-primary, #2563eb));
        transition: background 0.1s;
      }
      .remark-undo-toast .remark-undo-btn:hover { background: var(--gray-50, #f9fafb); }
      .remark-sidebar-quote {
        font-style: italic;
        color: var(--gray-500, #6b7280);
        font-size: 12px;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .remark-sidebar-note {
        margin-top: 4px;
        font-size: 12px;
        color: var(--color-text-primary, #1a1a1a);
        background: var(--gray-50, #f9fafb);
        padding: 4px 8px;
        border-radius: 4px;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        line-height: 18px;
      }

      /* Popup */
      .remark-popup {
        position: fixed;
        z-index: 10001;
        background: var(--color-bg-surface, #fff);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
        box-shadow: var(--shadow-floating, 0 4px 16px rgba(0,0,0,0.15));
        padding: 12px;
        width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        color: var(--color-text-primary, #1a1a1a);
      }
      .remark-popup-header {
        margin-bottom: 8px;
      }
      .remark-popup-quote {
        font-style: italic;
        color: var(--gray-500, #6b7280);
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .remark-popup-colors {
        display: flex;
        gap: 6px;
        margin-bottom: 8px;
      }
      .remark-color-btn {
        border: 2px solid transparent;
        border-radius: 6px;
        background: var(--gray-100, #f3f4f6);
        padding: 4px 8px;
        cursor: pointer;
        font-size: 16px;
        color: var(--color-text-primary, #1a1a1a);
        transition: border-color 0.15s;
      }
      .remark-color-btn:hover {
        background: var(--gray-200, #e5e7eb);
      }
      .remark-color-btn.active {
        border-color: var(--color-nav-active-border, var(--color-theme-accent, var(--color-primary, #2563eb)));
        background: var(--color-nav-active-bg, var(--color-theme-accent-bg, var(--color-primary-light, #eff6ff)));
        color: var(--color-nav-active-text, var(--color-theme-accent, var(--color-primary, #2563eb)));
      }
      .remark-note-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 6px;
        padding: 8px;
        font-size: 13px;
        font-family: inherit;
        resize: vertical;
        min-height: 48px;
        margin-bottom: 8px;
        color: inherit;
        background: var(--gray-50, #f9fafb);
      }
      .remark-note-input:focus {
        outline: none;
        border-color: var(--color-nav-active-border, var(--color-theme-accent, var(--color-primary, #2563eb)));
        box-shadow: 0 0 0 2px var(--color-theme-accent-subtle, var(--color-primary-subtle, #dbeafe));
      }
      .remark-popup-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        align-items: center;
      }
      .remark-color-toggle {
        font-size: 18px;
        line-height: 1;
        padding: 2px 6px;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 6px;
        background: var(--gray-50, #f9fafb);
        cursor: pointer;
        margin-right: auto;
        transition: background 0.15s;
      }
      .remark-color-toggle:hover {
        background: var(--gray-200, #e5e7eb);
      }
      .remark-popup-actions button {
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 13px;
        cursor: pointer;
        border: 1px solid var(--color-border, #e2e8f0);
        background: var(--gray-50, #f9fafb);
        color: inherit;
        transition: background 0.15s;
      }
      .remark-popup-actions button:hover {
        background: var(--gray-200, #e5e7eb);
      }
      .remark-save-btn {
        background: var(--color-theme-accent, var(--color-primary, #2563eb)) !important;
        color: var(--color-text-on-primary, #fff) !important;
        border-color: var(--color-theme-accent, var(--color-primary, #2563eb)) !important;
      }
      .remark-save-btn:hover {
        background: var(--color-theme-accent-hover, var(--color-primary-hover, #1d4ed8)) !important;
      }

      /* Toolbar button active state */
      .toolbar-btn.remark-active {
        background: var(--color-nav-active-bg, var(--color-theme-accent-bg, var(--color-primary-light, #eff6ff)));
        color: var(--color-nav-active-text, var(--color-theme-accent, var(--color-primary, #2563eb)));
      }

      /* Count badge on toolbar button */
      .remark-count-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        background: var(--color-badge-bg, #6b7280);
        color: var(--color-badge-text, #fff);
        font-size: 9px;
        font-weight: 700;
        min-width: 14px;
        height: 14px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 3px;
        line-height: 1;
        pointer-events: none;
      }

      /* Sidebar note editable */
      .remark-sidebar-note[data-editable] {
        cursor: pointer;
      }
      .remark-note-placeholder {
        color: var(--gray-400, #9ca3af) !important;
        font-style: italic;
      }
      .remark-sidebar-note-editor {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid var(--color-nav-active-border, var(--color-theme-accent, var(--color-primary, #2563eb)));
        border-radius: 4px;
        padding: 4px 6px;
        font-size: 12px;
        font-family: inherit;
        resize: none;
        overflow: hidden;
        margin-top: 4px;
        background: var(--color-bg-surface, #fff);
        color: var(--color-text-primary, #1a1a1a);
        box-shadow: 0 0 0 2px var(--color-theme-accent-subtle, var(--color-primary-subtle, #dbeafe));
        line-height: 18px;
      }
      .remark-sidebar-count {
        color: var(--gray-500, #6b7280);
        font-weight: normal;
        font-size: 13px;
      }

      /* ── UX Delight: Animations ─────────────────────────────── */
      @media (prefers-reduced-motion: no-preference) {
        /* Popup scale-in */
        .remark-popup {
          animation: remark-popup-in 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: top center;
        }
        @keyframes remark-popup-in {
          from { opacity: 0; transform: scale(0.9) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Color button ink splash on selection */
        .remark-color-btn.active {
          animation: remark-ink 0.3s ease-out;
        }
        @keyframes remark-ink {
          0% { box-shadow: 0 0 0 0 var(--color-theme-accent-subtle, var(--color-primary-subtle, #dbeafe)); }
          70% { box-shadow: 0 0 0 6px transparent; }
          100% { box-shadow: none; }
        }
      }

      /* Color button labels */
      .remark-color-label {
        font-size: 11px;
        vertical-align: middle;
        color: inherit;
        opacity: 0.8;
      }

    `;
    document.head.appendChild(style);
  }

  // After loading, notify toolbar of initial count
  const _loadAnnotations = loadAnnotations;
  async function loadAnnotationsAndNotify(): Promise<void> {
    await _loadAnnotations();
    notifyCount();
  }

  return {
    isActive,
    enter,
    exit,
    getAnnotations,
    removeAnnotation,
    updateAnnotationNote,
    exportToClipboard,
    loadAnnotations: loadAnnotationsAndNotify,
    dispose,
  };
}
