import type { ViewerEffect, ViewerSurfacePort } from './viewer-session-contract';

export interface ViewerSurfacePortOptions {
  render: (effect: Extract<ViewerEffect, { type: 'render' }>) => Promise<void>;
  applyTheme: (themeId: string) => Promise<void>;
  applyPresentation: (effect: Extract<ViewerEffect, { type: 'apply-presentation' }>) => void;
  readCurrentLine: () => number | null;
  scrollToLine: (line: number) => void;
  scrollToAnchor: (anchor: string) => void;
}

export function createViewerSurfacePort(options: ViewerSurfacePortOptions): ViewerSurfacePort {
  const {
    render,
    applyTheme,
    applyPresentation,
    readCurrentLine,
    scrollToLine,
    scrollToAnchor,
  } = options;

  return {
    render,
    applyTheme,
    applyPresentation,
    readCurrentLine,
    scrollToLine,
    scrollToAnchor,
  };
}