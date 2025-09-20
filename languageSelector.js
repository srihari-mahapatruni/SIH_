//  — Language selection component (ES module)
const LANGUAGES = [
  { code: 'hi', native: 'हिन्दी', name: 'Hindi' },
  { code: 'bn', native: 'বাংলা', name: 'Bengali' },
  { code: 'ta', native: 'தமிழ்', name: 'Tamil' },
  { code: 'te', native: 'తెలుగు', name: 'Telugu' },
  { code: 'mr', native: 'मराठी', name: 'Marathi' },
  { code: 'gu', native: 'ગુજરાતી', name: 'Gujarati' },
  { code: 'kn', native: 'ಕನ್ನಡ', name: 'Kannada' },
  { code: 'ml', native: 'മലയാളം', name: 'Malayalam' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', name: 'Punjabi' },
  { code: 'or', native: 'ଓଡ଼ିଆ', name: 'Odia' },
  { code: 'ur', native: 'اردو', name: 'Urdu' },
];

export function populateLanguageSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  for (const lang of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = `${lang.native} (${lang.name})`;
    selectEl.appendChild(opt);
  }
  const def = detectDefaultCode();
  const found = Array.from(selectEl.options).find(o => o.value === def);
  if (found) selectEl.value = def;
}

export function getSelectedLanguage(selectEl) {
  if (!selectEl) return 'hi';
  return selectEl.value || 'hi';
}

export function labelForCode(code) {
  const l = LANGUAGES.find(l => l.code === code);
  return l ? `${l.native} (${l.name})` : code;
}

function detectDefaultCode() {
  const n = navigator.language || 'en-US';
  const code = (n.split('-')[0] || '').toLowerCase();
  // If user locale matches an Indian language code, pick it; else default to Hindi
  return LANGUAGES.some(l => l.code === code) ? code : 'hi';
}
