/**
 * Toolbar Type Definitions
 * Types for UI toolbar
 */

import type { TranslateFunction, EscapeHtmlFunction, FileState } from './core';
import type { DocxExporter } from './docx';

// =============================================================================
// Layout Types
// =============================================================================

/**
 * Layout configuration
 */
export interface LayoutConfig {
  maxWidth: string;
  icon: string;
  title: string;
}

// =============================================================================
// Toolbar Types
// =============================================================================

/**
 * Toolbar manager options
 */
export interface ToolbarManagerOptions {
  translate: TranslateFunction;
  escapeHtml: EscapeHtmlFunction;
  saveFileState: (state: FileState) => void;
  getFileState: () => Promise<FileState>;
  isMobile: boolean;
  rawMarkdown: string;
  /** Get latest original/raw file content for save-file action */
  getRawContent?: () => string;
  docxExporter: DocxExporter;
  cancelScrollRestore: () => void;
  updateActiveTocItem: () => void;
  /** Called before zoom changes to lock scroll position */
  onBeforeZoom?: () => void;
  /** Set TOC visibility from the host/session state owner */
  onSetTocVisibility?: (visible: boolean) => void;
  /** Whether to show source/preview toggle button */
  enableSourceToggle?: boolean;
  /** Toggle between markdown preview and source mode */
  onToggleSourceMode?: () => void;
  /** Get current source mode state */
  getSourceMode?: () => boolean;
  /** Whether current view should save raw file on Ctrl/Cmd+S */
  isSourceModeActive?: () => boolean;
  /** Whether to show remark mode toggle button */
  enableRemarkMode?: boolean;
  /** Get the container for remark annotations (rendered markdown div) */
  getRemarkContainer?: () => HTMLElement | null;
  /** Get raw markdown for remark export */
  getRemarkRawMarkdown?: () => string;
}

/**
 * Generate toolbar HTML options
 */
export interface GenerateToolbarHTMLOptions {
  translate: TranslateFunction;
  escapeHtml: EscapeHtmlFunction;
  initialTocClass: string;
  initialMaxWidth: string;
  initialZoom: number;
  enableSourceToggle?: boolean;
  enableRemarkMode?: boolean;
}

/**
 * Toolbar manager instance interface
 */
export interface ToolbarManagerInstance {
  layoutIcons: Record<string, string>;
  layoutConfigs: Record<string, LayoutConfig>;
  applyZoom: (newLevel: number, saveState?: boolean) => void;
  getZoomLevel: () => number;
  setInitialZoom: (level: number) => void;
  initializeToolbar: () => void;
  setupToolbarButtons: () => Promise<void>;
  setupKeyboardShortcuts: () => void;
}
