export interface DiagramLightboxOptions {
  container: HTMLElement;
  translate?: (key: string) => string;
}

const MAX_ZOOM = 8;
const ZOOM_STEP_FACTOR = 1.2;

let cssInjected = false;

function injectCSS(): void {
  if (cssInjected) return;
  cssInjected = true;

  const style = document.createElement('style');
  style.textContent = `
.mv-lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95); /* overridden at runtime to match theme */
  opacity: 0;
  cursor: default;
  touch-action: none;
}

.mv-lightbox-overlay.mv-lightbox-visible {
  opacity: 1;
}

.mv-lightbox-viewport {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  cursor: grab;
}

.mv-lightbox-viewport.mv-lightbox-dragging {
  cursor: grabbing;
}

.mv-lightbox-img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  max-height: none;
  transform-origin: 0 0;
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
}

.mv-lightbox-controls {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  color: #fff;
  backdrop-filter: blur(8px);
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  z-index: 100001;
  user-select: none;
  -webkit-user-select: none;
}

.mv-lightbox-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

.mv-lightbox-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.mv-lightbox-zoom-label {
  min-width: 48px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

.mv-lightbox-zoom-label:hover {
  text-decoration: underline;
}

.mv-lightbox-close {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100001;
}
`;
  document.head.appendChild(style);
}

let activeOverlay: HTMLElement | null = null;
let activeCleanup: (() => void) | null = null;

/**
 * Set up diagram lightbox on a container element.
 * Listens for clicks on diagram images and opens a zoom overlay.
 * Returns a cleanup function.
 */
export function setupDiagramLightbox(options: DiagramLightboxOptions): () => void {
  const { container, translate: translateFn } = options;

  injectCSS();

  function translate(key: string): string {
    return translateFn?.(key) || fallbackTranslation(key);
  }

  function onClick(e: MouseEvent): void {
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const diagramBlock = target.closest('.diagram-block');
    const img = diagramBlock
      ? diagramBlock.querySelector('img') as HTMLImageElement | null
      : (target.closest('img.diagram-inline') as HTMLImageElement | null);

    if (!img) return;

    e.preventDefault();
    e.stopPropagation();
    openLightbox(img, translate);
  }

  container.addEventListener('click', onClick);

  return () => {
    container.removeEventListener('click', onClick);
    closeLightbox();
  };
}

function openLightbox(sourceImg: HTMLImageElement, translate: (key: string) => string): void {
  closeLightbox();

  const overlay = document.createElement('div');
  overlay.className = 'mv-lightbox-overlay';
  overlay.style.background = getOverlayBackground();

  const viewport = document.createElement('div');
  viewport.className = 'mv-lightbox-viewport';

  const img = document.createElement('img');
  img.className = 'mv-lightbox-img';
  img.src = sourceImg.src;
  img.alt = sourceImg.alt || 'Diagram';

  viewport.appendChild(img);
  overlay.appendChild(viewport);
  document.body.appendChild(overlay);
  activeOverlay = overlay;

  const onReady = () => {
    if (activeOverlay !== overlay) return;

    const state = createZoomState(img, viewport);

    const controls = buildControls(state, translate);
    const closeBtn = buildCloseButton(translate);
    overlay.appendChild(controls);
    overlay.appendChild(closeBtn);

    fitToViewport(state);

    activeCleanup = bindInteractions(state, viewport);

    requestAnimationFrame(() => overlay.classList.add('mv-lightbox-visible'));
  };

  if (img.complete && img.naturalWidth > 0) {
    onReady();
  } else {
    img.onload = onReady;
    img.onerror = () => closeLightbox();
  }
}

function closeLightbox(): void {
  if (!activeOverlay) return;

  const overlay = activeOverlay;
  activeOverlay = null;

  activeCleanup?.();
  activeCleanup = null;

  overlay.classList.remove('mv-lightbox-visible');
  overlay.remove();
}

interface ZoomState {
  img: HTMLImageElement;
  viewport: HTMLElement;
  zoom: number;
  minZoom: number;
  panX: number;
  panY: number;
  zoomLabel: HTMLElement | null;
}

function createZoomState(img: HTMLImageElement, viewport: HTMLElement): ZoomState {
  return { img, viewport, zoom: 1, minZoom: 0.1, panX: 0, panY: 0, zoomLabel: null };
}

function fitToViewport(state: ZoomState): void {
  const { img, viewport } = state;
  const vw = viewport.clientWidth - 48;
  const vh = viewport.clientHeight - 48;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  if (iw === 0 || ih === 0) return;

  const fitZoom = Math.min(vw / iw, vh / ih, 1);
  state.minZoom = fitZoom * 0.5;
  state.zoom = fitZoom;
  state.panX = 0;
  state.panY = 0;
  applyTransform(state);
}

function applyTransform(state: ZoomState): void {
  const { img, viewport, zoom, panX, panY } = state;
  const iw = img.naturalWidth * zoom;
  const ih = img.naturalHeight * zoom;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;

  const x = (vw - iw) / 2 + panX;
  const y = (vh - ih) / 2 + panY;

  img.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;

  if (state.zoomLabel) {
    state.zoomLabel.textContent = Math.round(zoom * 100) + '%';
  }
}

export function getSteppedZoom(
  currentZoom: number,
  direction: 1 | -1,
  minZoom: number,
  maxZoom: number,
): number {
  const nextZoom = direction > 0
    ? currentZoom * ZOOM_STEP_FACTOR
    : currentZoom / ZOOM_STEP_FACTOR;
  return clamp(nextZoom, minZoom, maxZoom);
}

export function getScaledZoom(
  currentZoom: number,
  scale: number,
  minZoom: number,
  maxZoom: number,
): number {
  return clamp(currentZoom * scale, minZoom, maxZoom);
}

function zoomTo(state: ZoomState, newZoom: number, cx: number, cy: number): void {
  const oldZoom = state.zoom;
  if (newZoom === oldZoom) return;

  const { viewport, img } = state;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const iw = img.naturalWidth * oldZoom;
  const ih = img.naturalHeight * oldZoom;

  const imgX = (vw - iw) / 2 + state.panX;
  const imgY = (vh - ih) / 2 + state.panY;

  const ratio = newZoom / oldZoom;
  const newImgX = cx - (cx - imgX) * ratio;
  const newImgY = cy - (cy - imgY) * ratio;

  const newIw = img.naturalWidth * newZoom;
  const newIh = img.naturalHeight * newZoom;

  state.zoom = newZoom;
  state.panX = newImgX - (vw - newIw) / 2;
  state.panY = newImgY - (vh - newIh) / 2;

  applyTransform(state);
}

function zoomByStep(state: ZoomState, direction: 1 | -1, cx: number, cy: number): void {
  zoomTo(state, getSteppedZoom(state.zoom, direction, state.minZoom, MAX_ZOOM), cx, cy);
}

function buildControls(state: ZoomState, translate: (key: string) => string): HTMLElement {
  const controls = document.createElement('div');
  controls.className = 'mv-lightbox-controls';

  const zoomOut = createButton('−', translate('lightbox_zoom_out'), () => {
    zoomByStep(state, -1, state.viewport.clientWidth / 2, state.viewport.clientHeight / 2);
  });

  const zoomLabel = document.createElement('span');
  zoomLabel.className = 'mv-lightbox-zoom-label';
  zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
  zoomLabel.title = translate('lightbox_fit');
  zoomLabel.addEventListener('click', () => fitToViewport(state));
  state.zoomLabel = zoomLabel;

  const zoomIn = createButton('+', translate('lightbox_zoom_in'), () => {
    zoomByStep(state, 1, state.viewport.clientWidth / 2, state.viewport.clientHeight / 2);
  });

  controls.appendChild(zoomOut);
  controls.appendChild(zoomLabel);
  controls.appendChild(zoomIn);

  return controls;
}

function buildCloseButton(translate: (key: string) => string): HTMLElement {
  const btn = createButton('✕', translate('lightbox_close'), () => closeLightbox());
  btn.classList.add('mv-lightbox-close');
  return btn;
}

function createButton(text: string, title: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mv-lightbox-btn';
  btn.textContent = text;
  btn.title = title;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function bindInteractions(state: ZoomState, viewport: HTMLElement): () => void {
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    zoomByStep(state, e.deltaY < 0 ? 1 : -1, cx, cy);
  };
  viewport.addEventListener('wheel', onWheel, { passive: false });

  // Only one input mode active at a time (browsers synthesize mouse from touch)
  let mouseDragging = false;
  let touchDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    mouseDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = state.panX;
    panStartY = state.panY;
    viewport.classList.add('mv-lightbox-dragging');
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!mouseDragging) return;
    state.panX = panStartX + (e.clientX - dragStartX);
    state.panY = panStartY + (e.clientY - dragStartY);
    applyTransform(state);
  };

  const onMouseUp = (e: MouseEvent) => {
    if (!mouseDragging) return;
    mouseDragging = false;
    viewport.classList.remove('mv-lightbox-dragging');

    // Close if it was a click (no significant drag) on empty viewport area
    const dx = Math.abs(e.clientX - dragStartX);
    const dy = Math.abs(e.clientY - dragStartY);
    if (dx < 5 && dy < 5 && e.target === viewport) {
      closeLightbox();
    }
  };

  viewport.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  let lastTouchDist = 0;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      lastTouchDist = touchDistance(e.touches);
    } else if (e.touches.length === 1) {
      touchDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      panStartX = state.panX;
      panStartY = state.panY;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dist = touchDistance(e.touches);
      const center = touchCenter(e.touches, viewport);
      const scale = dist / lastTouchDist;
      zoomTo(state, getScaledZoom(state.zoom, scale, state.minZoom, MAX_ZOOM), center.x, center.y);
      lastTouchDist = dist;
    } else if (e.touches.length === 1 && touchDragging) {
      state.panX = panStartX + (e.touches[0].clientX - dragStartX);
      state.panY = panStartY + (e.touches[0].clientY - dragStartY);
      applyTransform(state);
    }
  };

  const onTouchEnd = () => {
    touchDragging = false;
    lastTouchDist = 0;
  };

  viewport.addEventListener('touchstart', onTouchStart, { passive: false });
  viewport.addEventListener('touchmove', onTouchMove, { passive: false });
  viewport.addEventListener('touchend', onTouchEnd);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === '+' || e.key === '=') {
      zoomByStep(state, 1, viewport.clientWidth / 2, viewport.clientHeight / 2);
    } else if (e.key === '-') {
      zoomByStep(state, -1, viewport.clientWidth / 2, viewport.clientHeight / 2);
    } else if (e.key === '0') {
      fitToViewport(state);
    }
  };
  document.addEventListener('keydown', onKeyDown);

  return () => {
    viewport.removeEventListener('wheel', onWheel);
    viewport.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    viewport.removeEventListener('touchstart', onTouchStart);
    viewport.removeEventListener('touchmove', onTouchMove);
    viewport.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('keydown', onKeyDown);
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchCenter(touches: TouchList, viewport: HTMLElement): { x: number; y: number } {
  const rect = viewport.getBoundingClientRect();
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
    y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top,
  };
}

function getOverlayBackground(): string {
  const bg = getComputedStyle(document.body).backgroundColor;
  const match = bg.match(/\d+/g);
  if (match && match.length >= 3) {
    const [r, g, b] = match.map(Number);
    return `rgba(${r}, ${g}, ${b}, 0.95)`;
  }
  return 'rgba(255, 255, 255, 0.95)';
}

const FALLBACK_TRANSLATIONS: Record<string, string> = {
  lightbox_zoom_in: 'Zoom in',
  lightbox_zoom_out: 'Zoom out',
  lightbox_fit: 'Fit to screen',
  lightbox_close: 'Close',
};

function fallbackTranslation(key: string): string {
  return FALLBACK_TRANSLATIONS[key] || key;
}
