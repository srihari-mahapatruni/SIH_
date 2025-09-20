//  — Translation interface logic + lightweight mock backend
import { guessFileKind } from './fileValidator.js';
import { labelForCode } from './languageSelector.js';

const USE_MOCKS = true; // Set to false when your real API is ready
const API_BASE = '/api'; // Adjust to your backend

// Public API
export async function startJob(file, lang, outputs = { text: true, srt: true, audio: false }) {
  if (USE_MOCKS) {
    const job = await MockService.start(file, lang, outputs);
    return { jobId: job.id };
  }

  // Real backend example:
  // const fd = new FormData();
  // fd.append('file', file);
  // fd.append('lang', lang);
  // fd.append('outputs', JSON.stringify(outputs));
  // const res = await fetch(`${API_BASE}/translate`, { method: 'POST', body: fd });
  // if (!res.ok) throw new Error('Upload failed');
  // const data = await res.json();
  // return { jobId: data.jobId };

  throw new Error('Real API not implemented. Set USE_MOCKS=true.');
}

export function getJob(jobId) {
  if (USE_MOCKS) return MockService.get(jobId);
  // Real: fetch and cache
  return null;
}

export function listJobs() {
  if (USE_MOCKS) return MockService.list();
  return [];
}

// Subscribe to job updates; returns unsubscribe fn
export function subscribeJob(jobId, handler) {
  if (USE_MOCKS) return MockService.subscribe(jobId, handler);
  // Real: poll server
  let active = true;
  const tick = async () => {
    if (!active) return;
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobId}`);
      if (res.ok) {
        const job = await res.json();
        handler(job);
        if (job.status === 'completed' || job.status === 'failed') {
          active = false;
          return;
        }
      }
    } catch {}
    setTimeout(tick, 1500);
  };
  tick();
  return () => { active = false; };
}

/* ---------------- Mock service for local testing ---------------- */
const MockService = (() => {
  const STORAGE_KEY = 'vt_jobs';
  const jobs = new Map(load().map(j => [j.id, j]));

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(jobs.values())));
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  }
  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'job_' + Math.random().toString(36).slice(2);
  }

  const subscribers = new Map(); // id -> Set<fn>

  function notify(id) {
    const j = jobs.get(id);
    const set = subscribers.get(id);
    if (!set) return;
    for (const fn of set) fn(structuredClone(j));
  }

  function subscribe(id, fn) {
    if (!subscribers.has(id)) subscribers.set(id, new Set());
    subscribers.get(id).add(fn);
    // push initial
    const j = jobs.get(id); if (j) fn(structuredClone(j));
    return () => subscribers.get(id)?.delete(fn);
  }

  async function start(file, lang, outputs) {
    const id = uuid();
    const kind = guessFileKind(file);
    const job = {
      id, filename: file?.name || 'file',
      size: file?.size || 0,
      kind, lang, outputs: {},
      status: 'queued', progress: 0, createdAt: Date.now(),
      preview: {}
    };
    jobs.set(id, job);
    save(); notify(id);

    // Simulate upload delay
    await sleep(400 + rand(300));

    // Simulate stages
    const stages = [
      { name: 'transcribing', from: 5, to: 55, ms: 3000 + rand(2000) },
      { name: 'translating',  from: 55, to: 85, ms: 3000 + rand(2000) },
      { name: 'finalizing',   from: 85, to: 100, ms: 1200 + rand(1200) },
    ];

    for (const st of stages) {
      job.status = st.name;
      await tweenProgress(job, st.from, st.to, st.ms);
    }
    job.status = 'completed'; job.progress = 100;

    // Create sample outputs
    const langLabel = labelForCode(lang);
    if (outputs.text) job.outputs.textUrl = makeTextBlob(`Translated (${langLabel})\n\nThis is a sample translated output for: ${job.filename}\n\n• Safety\n• Tools\n• Procedures\n`);
    if (outputs.srt) job.outputs.srtUrl = makeTextBlob(mockSRT(langLabel));
    if (outputs.audio) job.outputs.audioUrl = makeTextBlob('Audio not implemented in mock.', 'text/plain'); // placeholder
    job.outputs.docxUrl = makeTextBlob('Docx placeholder. Use server to generate.', 'text/plain');

    // Optionally preview video (no actual media; demo only)
    if (kind === 'video') job.preview.videoUrl = ''; // Put a video URL if you have one

    save(); notify(id);
    return job;
  }

  async function tweenProgress(job, from, to, durationMs) {
    const start = Date.now();
    return new Promise(resolve => {
      const step = () => {
        const t = Math.min(1, (Date.now() - start) / durationMs);
        job.progress = Math.round(from + (to - from) * easeInOutCubic(t));
        save(); notify(job.id);
        if (t < 1) setTimeout(step, 120);
        else resolve();
      };
      step();
    });
  }

  function get(id) {
    const j = jobs.get(id);
    return j ? structuredClone(j) : null;
  }

  function list() {
    return Array.from(jobs.values()).map(j => structuredClone(j));
  }

  function makeTextBlob(text, type = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    return url;
  }

  function mockSRT(langLabel) {
    return `1
00:00:00,000 --> 00:00:03,000
${langLabel}: Welcome to the training.

2
00:00:03,200 --> 00:00:06,000
We will cover safety and basic procedures.

3
00:00:06,200 --> 00:00:09,000
Practice carefully and follow instructions.`;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function rand(n) { return Math.floor(Math.random() * n); }
  function easeInOutCubic(t){ return t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }

  return { start, get, list, subscribe };
})();
