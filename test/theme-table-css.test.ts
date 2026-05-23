import assert from 'assert';
import { describe, it } from 'node:test';
import { themeToCSS } from '../src/utils/theme-to-css';
import type { ThemeConfig, TableStyleConfig, CodeThemeConfig, LayoutScheme } from '../src/utils/theme-to-css';
import type { ColorScheme } from '../src/types/theme';

const minimalColorScheme: ColorScheme = {
  id: 'test',
  name: 'Test',
  name_en: 'Test',
  description: 'Test color scheme',
  text: { primary: '#000', secondary: '#333', muted: '#666' },
  accent: { link: '#00f', linkHover: '#00d' },
  background: { code: '#f5f5f5' },
  blockquote: { border: '#ddd' },
  table: {
    border: '#ccc',
    headerBackground: '#f0f0f0',
    headerText: '#000',
    zebraEven: '#fff',
    zebraOdd: '#fafafa',
  },
};

const minimalTableStyle: TableStyleConfig = {
  header: { fontWeight: 'bold' },
  cell: { padding: '8px 12px' },
};

const minimalTheme: ThemeConfig = {
  fontScheme: {
    body: { fontFamily: 'sans-serif' },
    headings: { fontFamily: 'sans-serif' },
    code: { fontFamily: 'monospace' },
  },
  layoutScheme: 'regular',
  colorScheme: 'github-light',
  tableStyle: 'classic',
  codeTheme: 'github-light',
};

const minimalLayout: LayoutScheme = {
  id: 'test',
  name: 'Test',
  name_en: 'Test',
  description: 'Test layout',
  body: { fontSize: '12pt', lineHeight: 1.6 },
  headings: {
    h1: { fontSize: '24pt', spacingBefore: '24pt', spacingAfter: '12pt' },
    h2: { fontSize: '20pt', spacingBefore: '20pt', spacingAfter: '10pt' },
    h3: { fontSize: '16pt', spacingBefore: '16pt', spacingAfter: '8pt' },
    h4: { fontSize: '14pt', spacingBefore: '14pt', spacingAfter: '6pt' },
    h5: { fontSize: '12pt', spacingBefore: '12pt', spacingAfter: '4pt' },
    h6: { fontSize: '10pt', spacingBefore: '10pt', spacingAfter: '4pt' },
  },
  code: { fontSize: '10pt' },
  blocks: {
    paragraph: { spacingAfter: '12pt' },
    list: { spacingAfter: '12pt' },
    listItem: {},
    blockquote: { spacingAfter: '12pt', paddingVertical: '8pt', paddingHorizontal: '16pt' },
    codeBlock: { spacingAfter: '12pt', paddingVertical: '12pt', paddingHorizontal: '16pt' },
    table: { spacingAfter: '12pt' },
    horizontalRule: { spacingBefore: '12pt', spacingAfter: '12pt' },
  },
};

const minimalCodeTheme: CodeThemeConfig = {
  colors: {},
  foreground: '#000',
};

function generateCSS(): string {
  return themeToCSS(minimalTheme, minimalLayout, minimalColorScheme, minimalTableStyle, minimalCodeTheme);
}

describe('Table CSS Generation', () => {
  it('generates display:block for horizontal scroll support', () => {
    const css = generateCSS();
    assert.ok(css.includes('display: block'), 'table should use display:block for scroll container');
  });

  it('generates overflow-x:auto for wide tables', () => {
    const css = generateCSS();
    assert.ok(css.includes('overflow-x: auto'), 'table should have overflow-x:auto');
  });

  it('generates width:fit-content for centering narrow tables', () => {
    const css = generateCSS();
    assert.ok(css.includes('width: fit-content'), 'table should use fit-content width');
  });

  it('generates max-width:100% to constrain within container', () => {
    const css = generateCSS();
    assert.ok(css.includes('max-width: 100%'), 'table should have max-width:100%');
  });

  it('generates margin:auto for centering', () => {
    const css = generateCSS();
    assert.ok(css.includes('margin: 13px auto'), 'table should be centered with margin:auto');
  });

  it('generates left-aligned layout variant', () => {
    const css = generateCSS();
    assert.ok(
      css.includes('.table-layout-left table'),
      'should include left layout variant',
    );
    assert.ok(css.includes('margin-left: 0'), 'left layout should have margin-left:0');
  });

  it('generates center layout variant with fit-content', () => {
    const css = generateCSS();
    const centerMatch = css.match(
      /\.table-layout-center table\s*\{[^}]*width:\s*fit-content/,
    );
    assert.ok(centerMatch, 'center layout should use fit-content width');
  });

  it('generates full-width layout variant', () => {
    const css = generateCSS();
    assert.ok(
      css.includes('.table-layout-center-full-width table'),
      'should include full-width layout variant',
    );
    assert.ok(
      css.includes('display: table'),
      'full-width layout should restore display:table',
    );
    assert.ok(
      css.includes('width: 100%'),
      'full-width layout should set width:100%',
    );
  });
});
