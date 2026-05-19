import type {
  ViewerIframeMessage,
  ViewerSyncHostNavigationMessage,
} from '../../../src/integration/iframe-viewer-host';

interface ViewerNavigationRuntime {
  requestAnchor(anchor: string): void | Promise<void>;
  setScrollLine(line: number): void;
}

interface WorkspaceEmbedParentBridgeOptions {
  getRuntime: () => ViewerNavigationRuntime | null;
  postToParent: (message: { type: 'VIEWER_READY' } | { type: 'VIEWER_RENDERED' }) => void;
  ensureWorkspaceResolvers: () => void;
  scrollToAnchor: (anchor: string) => void;
}

export interface WorkspaceEmbedParentBridge {
  bindViewerMessages(handler: (message: ViewerIframeMessage) => void): void;
  syncHostNavigation(message: ViewerSyncHostNavigationMessage): void;
  prepareWorkspaceResolvers(): void;
  notifyViewerReady(): void;
  notifyViewerRendered(): void;
}

export function createWorkspaceEmbedParentBridge(
  options: WorkspaceEmbedParentBridgeOptions,
): WorkspaceEmbedParentBridge {
  const {
    getRuntime,
    postToParent,
    ensureWorkspaceResolvers,
    scrollToAnchor,
  } = options;

  return {
    bindViewerMessages(handler: (message: ViewerIframeMessage) => void): void {
      window.addEventListener('message', (event: MessageEvent) => {
        const data = event.data as ViewerIframeMessage | undefined;
        if (!data || typeof data !== 'object' || !('type' in data)) {
          return;
        }

        handler(data);
      });
    },

    syncHostNavigation(message: ViewerSyncHostNavigationMessage): void {
      const runtime = getRuntime();

      if (message.anchor) {
        if (runtime) {
          void runtime.requestAnchor(message.anchor);
        } else {
          scrollToAnchor(message.anchor);
        }
      }

      if (typeof message.line === 'number' && Number.isFinite(message.line) && runtime) {
        runtime.setScrollLine(Math.max(1, Math.floor(message.line)));
      }
    },

    prepareWorkspaceResolvers(): void {
      ensureWorkspaceResolvers();
    },

    notifyViewerReady(): void {
      postToParent({ type: 'VIEWER_READY' });
    },

    notifyViewerRendered(): void {
      postToParent({ type: 'VIEWER_RENDERED' });
    },
  };
}