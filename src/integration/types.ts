export interface ScrollLineChangeDetail {
  line: number;
}

export type ScrollLineChangeEvent = CustomEvent<ScrollLineChangeDetail>;

export interface MountedViewer {
  render(markdown: string): Promise<void>;
  destroy(): void;
}

export interface MarkdownViewerElement extends HTMLElement {
  value?: string;
  src?: string;

  mode?: 'inline' | 'iframe';

  scrollLine?: number;

  render(markdown: string): Promise<void>;
  switchTheme?(themeId: string): Promise<void>;
  scrollToAnchor(anchor: string): void;
  getCurrentLine(): number | null;
}
