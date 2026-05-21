
export type ViewerIframeContainerMode = Extract<ViewerContainerMode, 'browser' | 'panel'>;

export interface ViewerOpenDocumentMessage {
  type: 'OPEN_DOCUMENT';
  content?: string;
  filename?: string;
  fileDir?: string;
  workspaceName?: string;
  workspaceFilePath?: string;
  codeView?: boolean;
  targetLine?: number;
}

export interface ViewerUpdateContentMessage {
  type: 'UPDATE_CONTENT';
  content?: string;
  targetLine?: number;
}

export interface ViewerSyncHostUiMessage {
  type: 'SYNC_HOST_UI';
  themeId?: string;
  containerMode?: ViewerIframeContainerMode;
  tocDepth?: number;
  layoutChanged?: boolean;
}

export interface ViewerSyncHostNavigationMessage {
  type: 'SYNC_HOST_NAVIGATION';
  anchor?: string;
  line?: number;
}

export type ViewerIframeMessage =
  | ViewerOpenDocumentMessage
  | ViewerUpdateContentMessage
  | ViewerSyncHostUiMessage
  | ViewerSyncHostNavigationMessage;

export interface ViewerIframeDocumentSyncInput {
  documentKey: string;
  content: string;
  filename: string;
  fileDir?: string;
  workspaceName?: string;
  workspaceFilePath?: string;
  codeView?: boolean;
  targetLine?: number;
}

export interface ViewerIframeHostBridge {
  reset(): void;
  syncDocument(input: ViewerIframeDocumentSyncInput): void;
  syncHostUi(input: Omit<ViewerSyncHostUiMessage, 'type'>): void;
  syncHostNavigation(input: Omit<ViewerSyncHostNavigationMessage, 'type'>): void;
}

export function createViewerIframeHostBridge(
  postMessage: (message: ViewerIframeMessage) => void,
): ViewerIframeHostBridge {
  let openedDocumentKey = '';

  return {
    reset(): void {
      openedDocumentKey = '';
    },

    syncDocument(input: ViewerIframeDocumentSyncInput): void {
      const {
        documentKey,
        content,
        filename,
        fileDir,
        workspaceName,
        workspaceFilePath,
        codeView,
        targetLine,
      } = input;

      if (openedDocumentKey && openedDocumentKey === documentKey) {
        postMessage({
          type: 'UPDATE_CONTENT',
          content,
          targetLine,
        });
        return;
      }

      openedDocumentKey = documentKey;
      postMessage({
        type: 'OPEN_DOCUMENT',
        content,
        filename,
        fileDir,
        workspaceName,
        workspaceFilePath,
        codeView,
        targetLine,
      });
    },

    syncHostUi(input: Omit<ViewerSyncHostUiMessage, 'type'>): void {
      postMessage({
        type: 'SYNC_HOST_UI',
        ...input,
      });
    },

    syncHostNavigation(input: Omit<ViewerSyncHostNavigationMessage, 'type'>): void {
      postMessage({
        type: 'SYNC_HOST_NAVIGATION',
        ...input,
      });
    },
  };
}