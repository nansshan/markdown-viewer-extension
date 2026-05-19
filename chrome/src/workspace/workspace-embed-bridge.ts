import type { ChromeDocumentService } from '../webview/api-impl';

type ParentMessage =
  | { type: 'RESOLVE_IMAGE'; src: string; id: number }
  | { type: 'RESOLVE_FILE'; path: string; id: number; binary: boolean };

interface WorkspaceEmbedBridgeOptions {
  documentService: ChromeDocumentService;
  postToParent: (message: ParentMessage) => void;
}

export interface WorkspaceEmbedBridge {
  ensureConnected(): void;
}

function isRelativeSrc(src: string): boolean {
  return !!src
    && !src.startsWith('http://')
    && !src.startsWith('https://')
    && !src.startsWith('data:')
    && !src.startsWith('blob:')
    && !src.startsWith('file:')
    && !src.includes('://');
}

export function createWorkspaceEmbedBridge(options: WorkspaceEmbedBridgeOptions): WorkspaceEmbedBridge {
  const { documentService, postToParent } = options;

  let imageResolveListenerAttached = false;
  let imageObserver: MutationObserver | null = null;
  let imageRequestIdCounter = 0;
  const pendingImages = new Map<number, HTMLImageElement>();

  let fileResolveListenerAttached = false;
  let fileRequestIdCounter = 0;
  const pendingFiles = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>();

  const requestImage = (img: HTMLImageElement): void => {
    const src = img.getAttribute('src');
    if (!src || !isRelativeSrc(src)) {
      return;
    }

    const id = ++imageRequestIdCounter;
    pendingImages.set(id, img);
    postToParent({ type: 'RESOLVE_IMAGE', src, id });
  };

  const ensureImageResolver = (): void => {
    if (!imageResolveListenerAttached) {
      imageResolveListenerAttached = true;
      window.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type !== 'IMAGE_RESOLVED') {
          return;
        }

        const img = pendingImages.get(event.data.id);
        if (!img) {
          return;
        }

        img.src = event.data.url;
        pendingImages.delete(event.data.id);
      });
    }

    if (!imageObserver) {
      imageObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLImageElement) {
              requestImage(node);
            } else if (node instanceof HTMLElement) {
              for (const img of node.querySelectorAll<HTMLImageElement>('img')) {
                requestImage(img);
              }
            }
          }
        }
      });
      imageObserver.observe(document.body, { childList: true, subtree: true });
    }

    for (const img of document.querySelectorAll<HTMLImageElement>('img')) {
      requestImage(img);
    }
  };

  const ensureFileResolver = (): void => {
    if (!fileResolveListenerAttached) {
      fileResolveListenerAttached = true;
      window.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type !== 'FILE_RESOLVED') {
          return;
        }

        const entry = pendingFiles.get(event.data.id);
        if (!entry) {
          return;
        }

        pendingFiles.delete(event.data.id);
        if (event.data.error) {
          entry.reject(new Error(event.data.error));
        } else {
          entry.resolve(event.data.content);
        }
      });
    }

    documentService.setWorkspaceFileReader((relativePath: string, binary: boolean) => {
      return new Promise((resolve, reject) => {
        const id = ++fileRequestIdCounter;
        pendingFiles.set(id, { resolve, reject });
        postToParent({ type: 'RESOLVE_FILE', path: relativePath, id, binary });
      });
    });
  };

  return {
    ensureConnected(): void {
      ensureImageResolver();
      ensureFileResolver();
    },
  };
}