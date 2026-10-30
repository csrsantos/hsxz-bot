const COLOR_RE = /^#?([0-9a-f]{6})$/i;
const EMOJI_RE = new RegExp(
  '^(?:' +
    '<a?:\\w{2,32}:\\d{17,20}>' +
    '|\\p{Regional_Indicator}{2}' +
    '|[#*0-9]\\uFE0F?\\u20E3' +
    '|\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?' +
      '(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})?)*' +
  ')$',
  'u'
);

/** '#5865f2' | '5865F2' -> '#5865F2'; inválido -> null */
function parseColor(input) {
  const m = COLOR_RE.exec(String(input || '').trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

function toColorInt(input, fallback = 0x5865f2) {
  const c = parseColor(input);
  return c ? parseInt(c.slice(1), 16) : fallback;
}

/** Aceita um único emoji (unicode ou customizado). Inválido -> null */
function parseEmoji(input) {
  const s = String(input || '').trim();
  return s && EMOJI_RE.test(s) ? s : null;
}

function isHttpUrl(input) {
  try {
    const u = new URL(String(input));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function slugify(text, max = 20) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max);
}

function pad(n, size = 4) {
  return String(n).padStart(size, '0');
}

function duration(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}min`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

module.exports = { parseColor, toColorInt, parseEmoji, isHttpUrl, slugify, pad, duration };
