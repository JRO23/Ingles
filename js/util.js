// Small DOM + text helpers shared by every section.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(list, n) {
  return shuffle(list).slice(0, n);
}

// Normalizes an answer so that case, extra spaces, curly quotes and
// contractions don't matter: "I'm" == "I am", "isn't" == "is not".
export function normalize(text) {
  return ` ${String(text)} `
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.!?,;:"]/g, ' ')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/n't\b/g, ' not')
    .replace(/'m\b/g, ' am')
    .replace(/'re\b/g, ' are')
    .replace(/'ll\b/g, ' will')
    .replace(/'ve\b/g, ' have')
    .replace(/'s\b/g, ' is')
    .replace(/\s+/g, ' ')
    .trim();
}

// `before` is the sentence text before the gap: if the learner retypes its
// last words ("I am seeing" after "I ___"), those words are ignored.
export function isCorrect(input, answers, before = '') {
  const value = normalize(input);
  if (!value) return false;
  const accepted = answers.map(normalize);
  if (accepted.includes(value)) return true;
  const words = value.split(' ');
  const tail = normalize(before).split(' ').filter(Boolean);
  for (let k = 1; k <= Math.min(3, tail.length, words.length - 1); k++) {
    if (words.slice(0, k).join(' ') === tail.slice(-k).join(' ') && accepted.includes(words.slice(k).join(' '))) return true;
  }
  return false;
}

// Targeted tips for the most frequent mistakes of this unit.
export function hintFor(input, answers) {
  const value = normalize(input);
  const accepted = answers.map(normalize).join(' | ');
  if (/\bdid( not)?\b.*\bused to\b/.test(value)) {
    return 'Ojo: después de did / didn\'t se escribe "use to" (sin -d).';
  }
  if (/\bwould\b/.test(value) && !/\bwould\b/.test(accepted)) {
    return 'Aquí no va would: no se usa con verbos de estado (have, know, like, hate…) ni normalmente en negativo o preguntas.';
  }
  if (/\bused to \w+ing\b/.test(value) && !/\b(am|is|are|was|were)\b/.test(value) && /\b(am|is|are) used to\b/.test(accepted)) {
    return 'Te falta el verbo be: estar acostumbrado = am / is / are used to + -ing.';
  }
  if (/\bused to \w+ing\b/.test(accepted) && /\bused to \w+\b/.test(value) && !/\bused to \w+ing\b/.test(value) && !/\bused to the\b/.test(value)) {
    return 'Después de be used to, el verbo va en -ing.';
  }
  if (/\buse to\b/.test(value) && !/\bdid\b/.test(value) && !/\bdid\b/.test(accepted)) {
    return 'En afirmativo se escribe "used to" (con -d).';
  }
  return '';
}

export function countWords(text) {
  const words = text.trim().match(/[\p{L}\p{N}'’-]+/gu);
  return words ? words.length : 0;
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function badge(source, slide) {
  if (source === 'ppt') return el('span', { class: 'badge badge-ppt', title: 'Contenido original del PPT' }, slide ? `PPT · diap. ${slide}` : 'PPT');
  return el('span', { class: 'badge badge-new', title: 'Contenido nuevo, creado para esta página' }, 'Nuevo');
}

export function announce(message) {
  const region = document.getElementById('live');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = message; });
}
