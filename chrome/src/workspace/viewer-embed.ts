// Embedded viewer for workspace mode
// Receives file content via postMessage, then runs the full viewer pipeline

import { platform } from '../webview/index';
import { getViewerMainRuntime, startViewer } from '../webview/viewer-main';
import { initializeViewerBase } from '../../../src/core/viewer/viewer-bootstrap';
import { loadAndApplyTheme } from '../../../src/utils/theme-to-css';
import { applyCodeViewPresentation } from '../../../src/utils/code-preview';
import { createWorkspaceEmbedBridge } from './workspace-embed-bridge';
import {
  createWorkspaceEmbedHostUiController,
  TOC_NAVIGATION_SCROLL_BEHAVIOR,
} from './workspace-embed-host-ui';
import { createWorkspaceEmbedParentBridge } from './workspace-embed-parent-bridge';
import type {
  ViewerIframeMessage,
  ViewerOpenDocumentMessage,
  ViewerUpdateContentMessage,
} from '../../../src/integration/iframe-viewer-host';

type DocumentMessage = ViewerOpenDocumentMessage | ViewerUpdateContentMessage;

let initialized = false;
const EMBED_MODE = new URLSearchParams(window.location.search).get('embed') === '1';

const workspaceEmbedBridge = createWorkspaceEmbedBridge({
  documentService: platform.document as import('../webview/api-impl').ChromeDocumentService,
  postToParent: (message) => {
    window.parent.postMessage(message, '*');
  },
});

const parentBridge = createWorkspaceEmbedParentBridge({
  getRuntime: () => getViewerMainRuntime(),
  postToParent: (message) => {
    window.parent.postMessage(message, '*');
  },
  ensureWorkspaceResolvers: () => {
    workspaceEmbedBridge.ensureConnected();
  },
  scrollToAnchor,
});

const hostUiController = createWorkspaceEmbedHostUiController({
  scrollToAnchor,
  applyTheme: (themeId) => {
    const runtime = getViewerMainRuntime();
    if (runtime) {
      return runtime.setTheme(themeId);
    }
    return loadAndApplyTheme(themeId);
  },
});

async function waitForViewerMainRuntime(): Promise<NonNullable<ReturnType<typeof getViewerMainRuntime>>> {
  const runtime = getViewerMainRuntime();
  if (runtime) {
    return runtime;
  }

  for (let attempt = 0; attempt < 24; attempt += 1) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 25);
    });
    const nextRuntime = getViewerMainRuntime();
    if (nextRuntime) {
      return nextRuntime;
    }
  }

  throw new Error('[viewer-embed] viewer runtime not initialized');
}

// Inject embed-mode CSS when loaded with ?embed=1 (from element.ts custom element iframe).
// This hides the toolbar and shifts the TOC panel up so it fills the full iframe height.
// In workspace-preview context (no ?embed=1 param) nothing is injected and the native
// toolbar + TOC layout is preserved.
if (EMBED_MODE) {
  // Mark body so that internal TOC manager skips its saved-state restoration.
  document.body.dataset.mvEmbed = '1';

  const style = document.createElement('style');
  style.id = 'embed-mode-styles';
  style.textContent = [
    '#page-header { display: none !important; }',
    '#table-of-contents { top: 0 !important; height: 100vh !important; }',
    'body.toc-hidden #markdown-wrapper { margin-left: 0 !important; margin-right: 0 !important; }',
    'body:not(.toc-hidden) #markdown-wrapper { margin-left: 280px !important; margin-right: 0 !important; }',
    'body.toc-position-right:not(.toc-hidden) #markdown-wrapper { margin-left: 0 !important; margin-right: 280px !important; }',
  ].join('\n');
  (document.head || document.documentElement).appendChild(style);
}

function scrollToAnchor(anchor: string): void {
  const normalized = decodeURIComponent(anchor || '').replace(/^#/, '').trim();
  if (!normalized) return;

  const target = document.getElementById(normalized);
  if (!target) return;

  const wrapper = document.getElementById('markdown-wrapper') as HTMLElement | null;
  if (!wrapper) {
    target.scrollIntoView({ behavior: TOC_NAVIGATION_SCROLL_BEHAVIOR, block: 'start' });
    return;
  }
  const containerRect = wrapper.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const top = targetRect.top - containerRect.top + wrapper.scrollTop;
  wrapper.scrollTo({ top: Math.max(0, top), behavior: TOC_NAVIGATION_SCROLL_BEHAVIOR });
}

function normalizeTargetLine(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(1, Math.floor(value));
}

function applyOpenDocumentMetadata(message: ViewerOpenDocumentMessage): void {
  const filename = String(message.filename || 'inline.md');
  const workspaceName = String(message.workspaceName || '');
  const workspaceFilePath = String(message.workspaceFilePath || '');
  const codeView = Boolean(message.codeView);

  document.documentElement.dataset.viewerFilename = filename;
  if (workspaceName && workspaceFilePath) {
    document.documentElement.dataset.viewerWorkspaceName = workspaceName;
    document.documentElement.dataset.viewerWorkspaceFilePath = workspaceFilePath;
  } else {
    delete document.documentElement.dataset.viewerWorkspaceName;
    delete document.documentElement.dataset.viewerWorkspaceFilePath;
  }

  applyCodeViewPresentation(codeView);

  const fileNameSpan = document.getElementById('file-name');
  if (fileNameSpan) {
    fileNameSpan.textContent = filename;
  }
  document.title = filename;
}

let navToggleInjected = false;
function injectNavToggleButton(): void {
  if (navToggleInjected) return;
  const toolbarCenter = document.querySelector('.toolbar-center');
  if (!toolbarCenter) return;
  navToggleInjected = true;

  const btn = document.createElement('button');
  btn.className = 'toolbar-btn';
  btn.title = 'Toggle Navigation Bar';
  btn.setAttribute('aria-label', 'Toggle Navigation Bar');
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
    <path d="M4 10l3-3M4 10l3 3M16 10l-3-3M16 10l-3 3M4 10h12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  btn.addEventListener('click', () => {
    window.parent.postMessage({ type: 'TOGGLE_NAV_BAR' }, '*');
  });
  toolbarCenter.appendChild(btn);
}

async function ensureViewerInitialized(initialContent: string): Promise<{
  runtime: NonNullable<ReturnType<typeof getViewerMainRuntime>>;
  wasInitialized: boolean;
}> {
  const wasInitialized = initialized;

  if (!initialized) {
    document.body.textContent = initialContent;
    await initializeViewerBase(platform).then((pluginRenderer) => {
      startViewer({
        platform,
        pluginRenderer,
        themeConfigRenderer: platform.renderer,
      });
      initialized = true;
      hostUiController.attachWrapperInteractionFixes();
    }).catch((error) => {
      console.error('[viewer-embed] viewer base init failed', error);
    });
  }

  const runtime = await waitForViewerMainRuntime();
  injectNavToggleButton();

  return {
    runtime,
    wasInitialized,
  };
}

function applyTargetLine(runtime: NonNullable<ReturnType<typeof getViewerMainRuntime>>, targetLine: number | undefined): void {
  if (targetLine !== undefined) {
    runtime.setScrollLine(targetLine);
  }
}

async function handleDocumentMessage(message: DocumentMessage, mode: 'open' | 'update'): Promise<void> {
  const content = String(message.content || '');
  const targetLine = normalizeTargetLine(message.targetLine);

  if (mode === 'open') {
    applyOpenDocumentMetadata(message as ViewerOpenDocumentMessage);
  }

  const { runtime, wasInitialized } = await ensureViewerInitialized(content);

  if (mode === 'open') {
    if (wasInitialized) {
      await runtime.openDocument(content, { scrollLine: targetLine });
    }
  } else {
    await runtime.updateContent(content, targetLine);
  }

  applyTargetLine(runtime, targetLine);
  parentBridge.prepareWorkspaceResolvers();
  hostUiController.applyAfterRender();
  parentBridge.notifyViewerRendered();
}

function handleViewerMessage(data: ViewerIframeMessage): void {
  switch (data.type) {
    case 'OPEN_DOCUMENT':
      void handleDocumentMessage(data, 'open');
      return;
    case 'UPDATE_CONTENT':
      void handleDocumentMessage(data, 'update');
      return;
    case 'SYNC_HOST_UI':
      hostUiController.syncHostUi(data);
      return;
    case 'SYNC_HOST_NAVIGATION':
      parentBridge.syncHostNavigation(data);
      return;
    default:
      return;
  }
}

parentBridge.bindViewerMessages(handleViewerMessage);

// Intercept clicks on relative file links and delegate to the workspace parent.
// Without this, the browser navigates the iframe to a non-existent chrome-extension:// URL.
document.addEventListener('click', (event) => {
  const anchor = (event.target as HTMLElement).closest?.('a');
  if (!anchor) return;

  const href = anchor.getAttribute('href');
  if (!href) return;

  // Anchor-only links (#heading) are handled by the viewer's hashchange logic
  if (href.startsWith('#')) return;

  // All non-anchor links must preventDefault to avoid navigating the iframe away
  // from the viewer page (which would destroy the viewer runtime).
  event.preventDefault();

  // Absolute URLs (http:, mailto:, tel:, etc.) open via window.open
  if (/^[a-z][a-z0-9+\-.]*:/i.test(href)) {
    window.open(href, '_blank');
    return;
  }

  // Relative path — delegate to workspace parent to open via File System Access API
  window.parent.postMessage({ type: 'WORKSPACE_NAVIGATE', path: href }, '*');
});

parentBridge.notifyViewerReady();
