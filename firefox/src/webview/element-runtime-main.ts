const RENDER_REQUEST_EVENT = 'mv:render-request';
const ANCHOR_REQUEST_EVENT = 'mv:scroll-to-anchor-request';
const RESPONSE_EVENT = 'mv:response';

export {};

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function waitForResponse(target: HTMLElement, requestId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onResponse = (event: Event) => {
      const detail = (event as CustomEvent<{ requestId?: string; ok?: boolean; error?: string }>).detail;
      if (!detail || detail.requestId !== requestId) return;
      target.removeEventListener(RESPONSE_EVENT, onResponse as EventListener);
      if (detail.ok) {
        resolve();
        return;
      }
      reject(new Error(detail.error || 'Unknown markdown-viewer error'));
    };
    target.addEventListener(RESPONSE_EVENT, onResponse as EventListener);
  });
}

class MarkdownViewerElementProxy extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['value', 'scroll-line', 'mode'];
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;
  }

  async render(markdown: string): Promise<void> {
    const requestId = createRequestId();
    const response = waitForResponse(this, requestId);
    this.dispatchEvent(new CustomEvent(RENDER_REQUEST_EVENT, {
      detail: { requestId, markdown },
      bubbles: true,
      composed: true,
    }));
    await response;
  }

  scrollToAnchor(anchor: string): void {
    this.dispatchEvent(new CustomEvent(ANCHOR_REQUEST_EVENT, {
      detail: { anchor },
      bubbles: true,
      composed: true,
    }));
  }

  getCurrentLine(): number | null {
    const raw = this.getAttribute('data-mv-current-line');
    if (!raw) return null;
    const line = Number.parseInt(raw, 10);
    return Number.isFinite(line) ? line : null;
  }

  get value(): string | undefined {
    return this.getAttribute('value') ?? undefined;
  }

  set value(markdown: string | undefined) {
    if (markdown === undefined) {
      this.removeAttribute('value');
      return;
    }
    this.setAttribute('value', markdown);
  }

  get mode(): 'inline' | 'iframe' | undefined {
    const value = this.getAttribute('mode');
    return value === 'inline' || value === 'iframe' ? value : undefined;
  }

  set mode(mode: 'inline' | 'iframe' | undefined) {
    if (mode === undefined) {
      this.removeAttribute('mode');
      return;
    }
    this.setAttribute('mode', mode);
  }

  get scrollLine(): number | undefined {
    const raw = this.getAttribute('scroll-line');
    if (!raw) return undefined;
    const line = Number.parseInt(raw, 10);
    return Number.isFinite(line) ? line : undefined;
  }

  set scrollLine(line: number | undefined) {
    if (line === undefined || Number.isNaN(line)) {
      this.removeAttribute('scroll-line');
      return;
    }
    this.setAttribute('scroll-line', String(line));
  }
}

if (globalThis.customElements && !globalThis.customElements.get('markdown-viewer')) {
  globalThis.customElements.define('markdown-viewer', MarkdownViewerElementProxy);
}