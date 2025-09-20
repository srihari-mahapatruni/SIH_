//  — Upload/translation progress (ES module)
export class ProgressTracker {
  constructor({ progressEl, statusEl } = {}) {
    this.progressEl = progressEl || null;
    this.statusEl = statusEl || null;
    if (this.progressEl && this.progressEl.tagName === 'PROGRESS') {
      this.progressEl.max = 100;
      this.progressEl.value = 0;
    }
  }
  set(v) {
    const value = Math.max(0, Math.min(100, Math.round(v || 0)));
    if (!this.progressEl) return;
    if (this.progressEl.tagName === 'PROGRESS') {
      this.progressEl.value = value;
    } else {
      this.progressEl.style.width = value + '%';
      this.progressEl.setAttribute('aria-valuenow', String(value));
    }
  }
  status(text) {
    if (this.statusEl) this.statusEl.textContent = text || '';
  }
  complete(text = 'Completed') {
    this.set(100); this.status(text);
  }
  fail(text = 'Failed') {
    this.status(text);
  }
}
