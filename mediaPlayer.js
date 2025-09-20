//  — Audio/video player controls (ES module)
export function attachMediaPlayer(mediaEl, { src, subtitlesUrl, subtitlesLabel = 'Subtitles', autoplay = false } = {}) {
  if (!mediaEl) return;
  if (src) mediaEl.src = src;
  if (subtitlesUrl) {
    // Remove existing tracks
    Array.from(mediaEl.querySelectorAll('track')).forEach(t => t.remove());
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = subtitlesLabel;
    track.srclang = 'xx';
    track.src = subtitlesUrl;
    track.default = true;
    mediaEl.appendChild(track);
  }
  mediaEl.controls = true;
  mediaEl.autoplay = !!autoplay;
}

export function formatTime(sec) {
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const m = Math.floor((sec / 60) % 60).toString().padStart(2, '0');
  const h = Math.floor(sec / 3600);
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}
