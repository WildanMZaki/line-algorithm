// ============================================================
// tracer.js — Tracing Table Builder
// ============================================================
// Builds and updates the step-by-step tracing table that shows
// variable values at each iteration of the algorithm.
// ============================================================

export class Tracer {
  constructor() {
    this.headEl = null;   // <thead>
    this.bodyEl = null;   // <tbody>
    this.scrollEl = null; // scrollable container
    this.columns = [];
    this.rowCount = 0;
  }

  /**
   * Initialize the tracer.
   * @param {HTMLElement} headEl   - <thead> element
   * @param {HTMLElement} bodyEl   - <tbody> element
   * @param {HTMLElement} scrollEl - scrollable container div
   */
  init(headEl, bodyEl, scrollEl) {
    this.headEl = headEl;
    this.bodyEl = bodyEl;
    this.scrollEl = scrollEl;
  }

  /**
   * Set column definitions and render header.
   * @param {Array<{key: string, label: string}>} columns
   */
  setColumns(columns) {
    this.columns = columns;
    this.headEl.innerHTML = '';
    this.bodyEl.innerHTML = '';
    this.rowCount = 0;

    const tr = document.createElement('tr');
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      tr.appendChild(th);
    });
    this.headEl.appendChild(tr);
  }

  /**
   * Add a data row to the table.
   * @param {Object} data — keys matching column keys
   */
  addRow(data) {
    // Remove highlight from previous rows
    const prevRows = this.bodyEl.querySelectorAll('tr.active-row');
    prevRows.forEach(r => r.classList.remove('active-row'));

    const tr = document.createElement('tr');
    tr.classList.add('active-row');

    this.columns.forEach(col => {
      const td = document.createElement('td');
      const val = data[col.key];
      td.textContent = val !== undefined && val !== null ? String(val) : '—';
      tr.appendChild(td);
    });

    this.bodyEl.appendChild(tr);
    this.rowCount++;

    // Auto-scroll to latest row
    requestAnimationFrame(() => {
      if (this.scrollEl) {
        this.scrollEl.scrollTop = this.scrollEl.scrollHeight;
      }
    });
  }

  /** Clear all rows (keep header) */
  clear() {
    this.bodyEl.innerHTML = '';
    this.rowCount = 0;
  }
}
