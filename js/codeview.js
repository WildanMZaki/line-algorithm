// ============================================================
// codeview.js — Code Block Display with Line Highlighting
// ============================================================
// Displays C#-like algorithm code with line numbers.
// Supports highlighting active lines and showing inline
// value annotations next to executed lines.
// ============================================================

export class CodeView {
  constructor() {
    this.container = null;
    this.lines = [];        // raw code line strings
    this.lineElements = []; // DOM elements per line
  }

  /**
   * Initialize the code view.
   * @param {HTMLElement} container - DOM element to render into
   */
  init(container) {
    this.container = container;
  }

  /**
   * Set the code to display (replaces existing code).
   * @param {string[]} lines - array of code line strings
   */
  setCode(lines) {
    this.lines = lines;
    this.lineElements = [];
    this.container.innerHTML = '';

    const pre = document.createElement('div');
    pre.className = 'code-block';

    lines.forEach((line, idx) => {
      const lineEl = document.createElement('div');
      lineEl.className = 'code-line';
      lineEl.dataset.line = idx;

      // Line number
      const numEl = document.createElement('span');
      numEl.className = 'line-num';
      numEl.textContent = String(idx + 1).padStart(3, ' ');

      // Code content with syntax highlighting
      const codeEl = document.createElement('span');
      codeEl.className = 'line-code';
      codeEl.innerHTML = this._highlightSyntax(line);

      // Annotation (empty by default)
      const annoEl = document.createElement('span');
      annoEl.className = 'line-annotation';

      lineEl.appendChild(numEl);
      lineEl.appendChild(codeEl);
      lineEl.appendChild(annoEl);
      pre.appendChild(lineEl);

      this.lineElements.push(lineEl);
    });

    this.container.appendChild(pre);
  }

  /**
   * Highlight specific lines and optionally show annotations.
   * @param {number[]} lineNumbers - 0-indexed line numbers to highlight
   * @param {Object} annotations - { lineNumber: "annotation text" }
   */
  highlightLines(lineNumbers, annotations = {}) {
    // Clear all highlights and annotations
    this.lineElements.forEach(el => {
      el.classList.remove('active');
      const anno = el.querySelector('.line-annotation');
      if (anno) anno.textContent = '';
    });

    // Apply new highlights
    lineNumbers.forEach(ln => {
      if (ln >= 0 && ln < this.lineElements.length) {
        const el = this.lineElements[ln];
        el.classList.add('active');

        // Set annotation if provided
        if (annotations[ln]) {
          const anno = el.querySelector('.line-annotation');
          if (anno) anno.textContent = annotations[ln];
        }

        // Scroll the highlighted line into view
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  /** Clear all highlights and annotations */
  clearHighlight() {
    this.lineElements.forEach(el => {
      el.classList.remove('active');
      const anno = el.querySelector('.line-annotation');
      if (anno) anno.textContent = '';
    });
  }

  // ---------- SYNTAX HIGHLIGHTING (Basic C# keywords) ----------

  _highlightSyntax(line) {
    let html = this._escapeHtml(line);

    // Comments (// ...)
    html = html.replace(/(\/\/.*)$/, '<span class="syn-comment">$1</span>');

    // Strings
    html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="syn-string">$1</span>');

    // Keywords
    const keywords = ['public', 'void', 'float', 'int', 'for', 'if', 'else', 'return', 'bool', 'var', 'new'];
    for (const kw of keywords) {
      html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="syn-keyword">$1</span>');
    }

    // Type-like / Built-in functions
    const types = ['Math'];
    for (const t of types) {
      html = html.replace(new RegExp(`\\b(${t})\\b`, 'g'), '<span class="syn-type">$1</span>');
    }

    // Method calls
    html = html.replace(/\.(Max|Min|Abs|Round|Floor|Ceil)\b/g, '.<span class="syn-method">$1</span>');

    // PutPixel special
    html = html.replace(/\b(PutPixel)\b/g, '<span class="syn-putpixel">$1</span>');

    // Numbers (but not inside already-wrapped spans)
    html = html.replace(/(?<![">])\b(\d+)\b(?![<"])/g, '<span class="syn-number">$1</span>');

    return html;
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
