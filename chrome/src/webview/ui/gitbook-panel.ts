// GitBook Navigation Panel Manager
// Handles GitBook SUMMARY.md discovery and navigation panel functionality

interface FileState {
  gitbookPanelVisible?: boolean;
  [key: string]: unknown;
}

type SaveFileStateFunction = (state: FileState) => void;
type GetFileStateFunction = () => Promise<FileState>;

interface GitbookPanelOptions {
  currentUrl?: string;
  readRelativeFile?: (relativePath: string) => Promise<string>;
  onNavigateFile?: (url: string, content: string) => Promise<void>;
}

interface GitbookNavItem {
  title: string;
  href: string;
  depth: number;
}

interface GitbookPanel {
  generateGitbookPanel(): Promise<void>;
  setupResponsivePanel(): Promise<void>;
}

function isMarkdownDocumentUrl(url: string): boolean {
  try {
    const pathname = new URL(url, window.location.href).pathname.toLowerCase();
    return pathname.endsWith('.md') || pathname.endsWith('.markdown');
  } catch {
    return false;
  }
}

function normalizeSummaryLinkTarget(rawLink: string): string {
  const trimmed = rawLink.trim();
  const angleWrapped = trimmed.startsWith('<') && trimmed.endsWith('>')
    ? trimmed.slice(1, -1)
    : trimmed;
  return angleWrapped.split('#')[0].split('?')[0].trim();
}

function normalizeRawGitHubRefUrl(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.hostname !== 'raw.githubusercontent.com') {
      return null;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    // /{owner}/{repo}/refs/{heads|tags}/{ref}/{path...}
    if (segments.length < 6 || segments[2] !== 'refs') {
      return null;
    }

    const refType = segments[3];
    if (refType !== 'heads' && refType !== 'tags') {
      return null;
    }

    const owner = segments[0];
    const repo = segments[1];
    const ref = segments[4];
    const filePath = segments.slice(5).join('/');
    if (!filePath) {
      return null;
    }

    parsed.pathname = `/${owner}/${repo}/${ref}/${filePath}`;
    return parsed.href;
  } catch {
    return null;
  }
}

function getRepositoryRootPath(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'raw.githubusercontent.com') {
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length >= 5 && segments[2] === 'refs') {
        return `/${segments.slice(0, 5).join('/')}/`;
      } else if (segments.length >= 3) {
        return `/${segments.slice(0, 3).join('/')}/`;
      }
    } else if (parsed.hostname === 'github.com') {
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length >= 4 && (segments[2] === 'blob' || segments[2] === 'tree')) {
        return `/${segments.slice(0, 4).join('/')}/`;
      }
    }
    return '/';
  } catch {
    return '/';
  }
}

function parseGitbookSummary(summaryContent: string, summaryUrl: string): GitbookNavItem[] {
  const items: GitbookNavItem[] = [];
  const lines = summaryContent.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+\[([^\]]+)\]\(([^)]+)\)\s*$/);
    if (!match) {
      continue;
    }

    const indent = match[1] || '';
    const title = match[2].trim();
    const target = normalizeSummaryLinkTarget(match[3]);
    if (!target || /^(?:mailto:|javascript:|#)/i.test(target)) {
      continue;
    }

    let href = '';
    try {
      href = new URL(target, summaryUrl).href;
    } catch {
      continue;
    }

    const depth = Math.floor(indent.replace(/\t/g, '  ').length / 2);
    items.push({ title, href, depth });
  }

  return items;
}

async function readSummaryByRelativePath(
  relativePath: string,
  currentUrl: string,
  readRelativeFile?: (relativePath: string) => Promise<string>
): Promise<{ summaryUrl: string; content: string } | null> {
  try {
    const summaryParsedUrl = new URL(relativePath, currentUrl);
    const summaryUrl = summaryParsedUrl.href;

    if (readRelativeFile) {
      try {
        const content = await readRelativeFile(relativePath);
        return { summaryUrl, content };
      } catch (error) {
        void error;
      }
    }

    // Avoid fetch on local file URLs to prevent browser CORS errors in file origin.
    if (summaryParsedUrl.protocol === 'file:') {
      return null;
    }

    const response = await fetch(summaryUrl);
    if (!response.ok) {
      return null;
    }

    const content = await response.text();
    return { summaryUrl, content };
  } catch (error) {
    void error;
    return null;
  }
}

async function loadGitbookNavigation(
  currentUrl: string,
  readRelativeFile?: (relativePath: string) => Promise<string>
): Promise<GitbookNavItem[] | null> {
  if (!isMarkdownDocumentUrl(currentUrl)) {
    return null;
  }

  const baseUrls = [currentUrl];
  const normalizedRawUrl = normalizeRawGitHubRefUrl(currentUrl);
  if (normalizedRawUrl && normalizedRawUrl !== currentUrl) {
    baseUrls.push(normalizedRawUrl);
  }

  const summaryNames = ['SUMMARY.md', 'summary.md'];
  const visitedUrls = new Set<string>();

  let depth = 0;
  while (depth <= 20) {
    let checkedAtLeastOne = false;

    for (const summaryName of summaryNames) {
      const relativePath = `${'../'.repeat(depth)}${summaryName}`;
      for (const baseUrl of baseUrls) {
        let summaryParsedUrl: URL;
        try {
          summaryParsedUrl = new URL(relativePath, baseUrl);
        } catch {
          continue;
        }

        const summaryUrl = summaryParsedUrl.href;
        
        if (visitedUrls.has(summaryUrl)) {
          continue;
        }
        visitedUrls.add(summaryUrl);

        // Prevent traversing above repository root
        const repoRoot = getRepositoryRootPath(baseUrl);
        if (!summaryParsedUrl.pathname.startsWith(repoRoot)) {
          continue;
        }

        checkedAtLeastOne = true;

        const loaded = await readSummaryByRelativePath(relativePath, baseUrl, readRelativeFile);
        if (!loaded) {
          continue;
        }

        const navItems = parseGitbookSummary(loaded.content, loaded.summaryUrl);
        if (navItems.length > 0) {
          return navItems;
        }
      }
    }

    if (!checkedAtLeastOne && depth > 0) {
      break;
    }

    depth += 1;
  }

  return null;
}

function markActiveGitbookItem(panelDiv: HTMLElement): void {
  const currentHref = window.location.href;
  const currentWithoutHash = currentHref.split('#')[0];

  panelDiv.querySelectorAll('a').forEach((link) => {
    const href = (link as HTMLAnchorElement).getAttribute('data-href') || '';
    const hrefWithoutHash = href.split('#')[0];
    if (href === currentHref || hrefWithoutHash === currentWithoutHash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Creates a GitBook panel manager for handling GitBook SUMMARY.md navigation.
 * @param saveFileState - Function to save file state
 * @param getFileState - Function to get file state
 * @param isMobile - Whether the client is mobile
 * @param options - Configuration options
 * @returns GitBook panel manager instance
 */
export function createGitbookPanel(
  saveFileState: SaveFileStateFunction,
  getFileState: GetFileStateFunction,
  isMobile: boolean,
  options: GitbookPanelOptions = {}
): GitbookPanel {
  function getPanelElements(): {
    panelDiv: HTMLElement | null;
    sidebarBody: HTMLElement | null;
    sidebarHeader: HTMLElement | null;
    resizeHandle: HTMLElement | null;
  } {
    return {
      panelDiv: document.getElementById('gitbook-panel'),
      sidebarBody: document.getElementById('gitbook-sidebar-body'),
      sidebarHeader: document.getElementById('gitbook-sidebar-header'),
      resizeHandle: document.getElementById('gitbook-resize-handle'),
    };
  }

  function setPanelVisibility(visible: boolean): void {
    const { panelDiv, sidebarBody, sidebarHeader, resizeHandle } = getPanelElements();
    if (!panelDiv) {
      return;
    }

    sidebarBody?.classList.toggle('hidden', !visible);
    sidebarHeader?.classList.toggle('hidden', !visible);
    resizeHandle?.classList.toggle('hidden', !visible);

    // Notify layout code to recompute absolute resize handle position.
    window.dispatchEvent(new Event('gitbook-panel-visibility-changed'));
  }

  async function applySavedPanelVisibilityState(panelDiv: HTMLElement): Promise<void> {
    const savedState = await getFileState();

    let shouldBeVisible: boolean;
    if (savedState.gitbookPanelVisible !== undefined) {
      shouldBeVisible = savedState.gitbookPanelVisible;
    } else {
      shouldBeVisible = !isMobile;
    }

    const currentlyVisible = !panelDiv.classList.contains('hidden');
    if (shouldBeVisible === currentlyVisible) {
      setPanelVisibility(shouldBeVisible);
      return;
    }

    setPanelVisibility(shouldBeVisible);
  }

  async function renderGitbookPanelIfAvailable(panelDiv: HTMLElement): Promise<boolean> {
    const currentUrl = options.currentUrl || window.location.href;
    const navItems = await loadGitbookNavigation(currentUrl, options.readRelativeFile);
    if (!navItems || navItems.length === 0) {
      setPanelVisibility(false);
      return false;
    }

    // Build TOC style list structure
    let panelHTML = '<ul class="gitbook-nav-list">';
    for (const item of navItems) {
      const escapedTitle = item.title
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const escapedHref = item.href.replace(/"/g, '&quot;');
      const indent = item.depth * 20;
      panelHTML += `<li style="margin-left: ${indent}px"><a href="${escapedHref}" data-href="${escapedHref}" data-title="${escapedTitle}">${escapedTitle}</a></li>`;
    }
    panelHTML += '</ul>';
    panelDiv.innerHTML = panelHTML;
    setPanelVisibility(true);

    // Setup click handlers for file navigation (no page refresh)
    panelDiv.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        const href = (link as HTMLElement).getAttribute('data-href');
        const title = (link as HTMLElement).getAttribute('data-title');
        if (!href) {
          return;
        }
        
        try {
          let content: string | null = null;

          if (options.readRelativeFile && href.startsWith('file://')) {
            try {
              content = await options.readRelativeFile(href);
            } catch (error) {
              void error;
            }
          }

          if (content === null) {
            const response = await fetch(href);
            if (!response.ok) {
              console.error('Failed to fetch file:', response.status);
              return;
            }
            content = await response.text();
          }

          // If there is no history state yet, keep URL unchanged.
          if (window.history.state !== null && !href.startsWith('file://')) {
            history.pushState({ url: href }, title || '', href);
          }
          
          // Call navigation callback if provided
          if (options.onNavigateFile) {
            await options.onNavigateFile(href, content);
          }
          
          // Mark active item
          panelDiv.querySelectorAll('a').forEach(el => el.classList.remove('active'));
          link.classList.add('active');
        } catch (error) {
          console.error('Navigation failed:', error);
        }
      });
    });

    markActiveGitbookItem(panelDiv);
    return true;
  }

  function setupGitbookPanelToggle(): () => void {
    return async () => {
      const { panelDiv } = getPanelElements();
      if (!panelDiv) {
        return;
      }

      const isHidden = panelDiv.classList.contains('hidden');
      if (isHidden) {
        setPanelVisibility(true);
        saveFileState({ gitbookPanelVisible: true });
      } else {
        setPanelVisibility(false);
        saveFileState({ gitbookPanelVisible: false });
      }
    };
  }

  async function generateGitbookPanel(): Promise<void> {
    const panelDiv = document.getElementById('gitbook-panel');
    if (!panelDiv) {
      return;
    }

    await renderGitbookPanelIfAvailable(panelDiv);
  }

  async function setupResponsivePanel(): Promise<void> {
    // Panel is always shown when SUMMARY.md is available; nothing to do here.
  }

  return {
    generateGitbookPanel,
    setupResponsivePanel,
  };
}
