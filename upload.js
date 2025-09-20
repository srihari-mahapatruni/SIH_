//  — File upload handling (ES module)
import { validateFile, readableFileSize } from './fileValidator.js';
import { ProgressTracker } from './progressTracker.js';
import { populateLanguageSelect, getSelectedLanguage } from './languageSelector.js';
import { startJob, subscribeJob } from './translator.js';

export function initUploadPage(opts = {}) {
  const sel = {
    fileInput: opts.fileInput || '#fileInput',
    drop: opts.drop || '#drop',
    startBtn: opts.startBtn || '#startBtn',
    prog: opts.prog || '#prog',
    progWrap: opts.progWrap || '#progWrap',
    status: opts.status || '#status',
    lang: opts.lang || '#lang'
  };

  const fileInput = document.querySelector(sel.fileInput);
  const drop = document.querySelector(sel.drop);
  const startBtn = document.querySelector(sel.startBtn);
  const progEl = document.querySelector(sel.prog);
  const progWrap = document.querySelector(sel.progWrap);
  const statusEl = document.querySelector(sel.status);
  const langSelect = document.querySelector(sel.lang);
  const fileName = document.getElementById('fileName');

  const tracker = new ProgressTracker({ progressEl: progEl, statusEl: statusEl });
  if (langSelect && !langSelect.options.length) populateLanguageSelect(langSelect);

  let selectedFile = null;

  function enableStart() {
    startBtn && (startBtn.disabled = !selectedFile);
    if (fileName) fileName.textContent = selectedFile ? `Selected: ${selectedFile.name} (${readableFileSize(selectedFile.size)})` : 'No file selected';
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      selectedFile = (fileInput.files && fileInput.files[0]) || null;
      enableStart();
    });
  }

  if (drop) {
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.dataset.hover = '1';
    }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.dataset.hover = '';
    }));
    drop.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files[0]) {
        selectedFile = dt.files[0];
        if (fileInput) {
          const dT = new DataTransfer();
          dT.items.add(selectedFile);
          fileInput.files = dT.files;
        }
        enableStart();
      }
    });
  }

  startBtn?.addEventListener('click', async () => {
    if (!selectedFile) return;

    // Validate file
    const check = validateFile(selectedFile, { maxSizeMB: 500 });
    if (!check.ok) {
      alert(`Please fix:\n- ${check.errors.join('\n- ')}`);
      return;
    }

    // Collect output preferences
    const outputs = getOutputPrefs();

    // Start job
    progWrap && (progWrap.style.display = 'block');
    tracker.set(3);
    tracker.status('Uploading…');

    try {
      const lang = getSelectedLanguage(langSelect) || 'hi';
      const { jobId } = await startJob(selectedFile, lang, outputs);

      // Save last jobId to come back on results page
      localStorage.setItem('vt_last_job_id', jobId);

      // Listen for progress
      const unsub = subscribeJob(jobId, (job) => {
        tracker.set(job.progress || 0);
        tracker.status(statusText(job));
        if (job.status === 'completed') {
          tracker.complete('Done!');
          unsub && unsub();
          setTimeout(() => {
            location.href = `results.html?jobId=${encodeURIComponent(jobId)}`;
          }, 400);
        } else if (job.status === 'failed') {
          tracker.fail('Failed');
          unsub && unsub();
        }
      });
    } catch (e) {
      console.error(e);
      tracker.fail('Error starting job');
      alert('Failed to start translation. Please try again.');
    }
  });

  function getOutputPrefs() {
    // Prefer explicit data-output attributes; fallback to label text
    const out = { text: true, srt: true, audio: false };
    const inputs = document.querySelectorAll('input[type="checkbox"]');
    inputs.forEach(inp => {
      const type = inp.dataset.output || inferFromLabel(inp);
      if (!type) return;
      out[type] = inp.checked;
    });
    return out;

    function inferFromLabel(inp) {
      const label = inp.closest('label')?.innerText?.toLowerCase() || '';
      if (label.includes('srt') || label.includes('subtitle')) return 'srt';
      if (label.includes('audio') || label.includes('dub')) return 'audio';
      if (label.includes('text') || label.includes('doc')) return 'text';
      return null;
    }
  }

  function statusText(job) {
    const map = {
      queued: 'Queued…',
      transcribing: 'Transcribing…',
      translating: 'Translating…',
      finalizing: 'Finalizing…',
      completed: 'Completed',
      failed: 'Failed'
    };
    return map[job.status] || 'Working…';
  }
}
