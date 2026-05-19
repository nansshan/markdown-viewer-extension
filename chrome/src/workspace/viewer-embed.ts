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
  ViewerSyncHostNavigationMessage,
  ViewerSyncHostUiMessage,
} from '../../../src/integration/iframe-viewer-host';

type OpenDocumentMessage = ViewerOpenDocumentMessage;
type UpdateContentMessage = ViewerUpdateContentMessage;
type SyncHostUiMessage = ViewerSyncHostUiMessage;
type SyncHostNavigationMessage = ViewerSyncHostNavigationMessage;
type ViewerEmbedMessage = ViewerIframeMessage;
type DocumentMessage = OpenDocumentMessage | UpdateContentMessage;

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

function syncHostUi(message: SyncHostUiMessage): void {
  hostUiController.syncHostUi(message);
}

function syncHostNavigation(message: SyncHostNavigationMessage): void {
  parentBridge.syncHostNavigation(message);
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

function applyOpenDocumentMetadata(message: OpenDocumentMessage): void {
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

  return {
    runtime: await waitForViewerMainRuntime(),
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
    applyOpenDocumentMetadata(message as OpenDocumentMessage);
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

function handleViewerMessage(data: ViewerEmbedMessage): void {
  switch (data.type) {
    case 'OPEN_DOCUMENT':
      void handleDocumentMessage(data, 'open');
      return;
    case 'UPDATE_CONTENT':
      void handleDocumentMessage(data, 'update');
      return;
    case 'SYNC_HOST_UI':
      syncHostUi(data);
      return;
    case 'SYNC_HOST_NAVIGATION':
      syncHostNavigation(data);
      return;
    default:
      return;
  }
}

parentBridge.bindViewerMessages(handleViewerMessage);
parentBridge.notifyViewerReady();
