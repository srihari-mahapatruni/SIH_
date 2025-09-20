//  fileValidator.js— File type/size validation (ES module)
export function validateFile(file, { maxSizeMB = 200 } = {}) {
  const errors = [];
  if (!file) errors.push('No file selected.');
  if (file && file.size > maxSizeMB * 1024 * 1024) errors.push(`File too large (max ${maxSizeMB} MB).`);

  const kind = guessFileKind(file);
  if (file && kind === 'unknown') errors.push('Unsupported file type. Use video, audio, text (.txt) or PDF.');

  return { ok: errors.length === 0, errors, kind };
}

export function guessFileKind(file) {
  if (!file) return 'unknown';
  const type = (file.type || '').toLowerCase();
  const ext = file.name?.split('.').pop()?.toLowerCase() || '';

  const videoExt = ['mp4', 'mkv', 'mov', 'webm'];
  const audioExt = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus'];
  const textExt  = ['txt', 'md', 'rtf'];
  const pdfExt   = ['pdf'];

  if (type.startsWith('video/') || videoExt.includes(ext)) return 'video';
  if (type.startsWith('audio/') || audioExt.includes(ext)) return 'audio';
  if (type === 'application/pdf' || pdfExt.includes(ext)) return 'pdf';
  if (type.startsWith('text/') || textExt.includes(ext)) return 'text';
  return 'unknown';
}

export function readableFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
