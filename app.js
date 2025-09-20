
import { initUploadPage } from './upload.js';
import { getJob, listJobs, subscribeJob } from './translator.js';
import { labelForCode } from './languageSelector.js';
import { attachMediaPlayer } from './mediaPlayer.js';

// Detect page and initialize
document.addEventListener('DOMContentLoaded', () => {
  const isUpload = document.getElementById('fileInput') || document.getElementById('drop');
  const isResults = document.getElementById('resultsRoot') || document.getElementById('videoPreview') || document.getElementById('translatedText');
  const isDashboard = document.querySelector('[data-dashboard]') || document.querySelector('#jobsTable');

  if (isUpload) initUploadPage();
  if (isResults) initResultsPage();
  if (isDashboard) initDashboardPage();
});

// Results page logic
async function initResultsPage() {
  const params = new URLSearchParams(location.search);
  let jobId = params.get('jobId') || localStorage.getItem('vt_last_job_id');
  const statusEl = document.getElementById('jobStatus');
  const fileEl = document.getElementById('fileName');
  const langEl = document.getElementById('langLabel');
  const textArea = document.getElementById('translatedText');
  const video = document.getElementById('videoPreview');

  if (!jobId) {
    if (statusEl) statusEl.textContent = 'No job found. Return to Upload.';
    return;
  }

  const job = getJob(jobId);
  if (!job) {
    if (statusEl) statusEl.textContent = 'Job not found. It may have expired.';
    return;
  }

  if (fileEl) fileEl.textContent = job.filename || '—';
  if (langEl) langEl.textContent = labelForCode(job.lang);

  // Show live status if not completed
  const unsub = subscribeJob(jobId, (j) => {
    if (statusEl) statusEl.textContent = friendlyStatus(j);
    if (j.status === 'completed' && textArea && !textArea.value && j.outputs?.textUrl) {
      fetch(j.outputs.textUrl).then(r => r.text()).then(t => { textArea.value = t; });
    }
    if (j.status === 'completed' && video) {
      attachMediaPlayer(video, {
        src: j.preview?.videoUrl || '',
        subtitlesUrl: j.outputs?.srtUrl || '',
        subtitlesLabel: labelForCode(j.lang),
        autoplay: false
      });
      unsub && unsub();
    }
  });

  // Set download links if elements exist
  setHref('downloadText', job.outputs?.textUrl);
  setHref('downloadSRT', job.outputs?.srtUrl);
  setHref('downloadDocx', job.outputs?.docxUrl);
  setHref('downloadAudio', job.outputs?.audioUrl);

  function setHref(id, url) {
    const a = document.getElementById(id);
    if (a) {
      if (url) { a.href = url; a.removeAttribute('aria-disabled'); }
      else { a.href = '#'; a.setAttribute('aria-disabled', 'true'); }
    }
  }
}

function friendlyStatus(job) {
  const map = {
    queued: 'Queued',
    transcribing: 'Transcribing…',
    translating: 'Translating…',
    finalizing: 'Finalizing…',
    completed: 'Completed',
    failed: 'Failed'
  };
  return map[job.status] || job.status;
}

// Dashboard page logic (uses mock/local data without a backend)
function initDashboardPage() {
  const tbody = document.querySelector('#jobsTable tbody') || document.querySelector('[data-dashboard] tbody');
  if (!tbody) return;

  const jobs = listJobs().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  tbody.innerHTML = '';
  for (const j of jobs) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${j.filename || '—'}</td>
      <td>${humanKind(j.kind)}</td>
      <td>${labelForCode(j.lang)}</td>
      <td>${new Date(j.createdAt || Date.now()).toLocaleString()}</td>
      <td>${j.status}</td>
      <td><a href="results.html?jobId=${j.id}">View</a></td>
    `;
    tbody.appendChild(tr);
  }

  function humanKind(k) {
    return ({ video: 'Video', audio: 'Audio', pdf: 'PDF', text: 'Text' }[k] || 'File');
  }
}
