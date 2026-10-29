// Vocabulary: flashcards, word-bank readings, multiple choice, matching, list.

import { el, shuffle, sample, badge, announce } from './util.js';
import { store } from './store.js';
import { makeTabs } from './ui.js';

export function renderVocab(data, sub) {
  const tabs = makeTabs([
    { id: 'flashcards', label: 'Flashcards', render: () => flashcards(data) },
    { id: 'textos', label: 'Completar textos', render: () => readings(data) },
    { id: 'quiz', label: 'Opción múltiple', render: () => multipleChoice(data) },
    { id: 'emparejar', label: 'Emparejar', render: () => matching(data) },
    { id: 'lista', label: 'Lista', render: () => wordList(data) }
  ], { prefKey: 'vocabTab', initial: sub });
  return el('div', {},
    el('header', { class: 'section-head' },
      el('p', { class: 'eyebrow' }, 'Vocabulary · 10 pts'),
      el('h1', {}, 'Health & Health Policy'),
      el('p', { class: 'lead' }, `${data.words.length} palabras de los dos bancos del PPT (diap. 21 y 23). Las definiciones vienen de los crucigramas del PPT (diap. 20 y 22).`)
    ),
    tabs.node
  );
}

function setTitle(id, data) {
  return data.sets.find((s) => s.id === id)?.title ?? id;
}

/* ---------- Flashcards ---------- */
function flashcards(data) {
  let filter = 'all';
  let deck = [];
  let index = 0;

  const counter = el('p', { class: 'muted small', 'aria-live': 'polite' });
  const known = el('p', { class: 'small' });
  const card = el('button', { type: 'button', class: 'flashcard', 'aria-pressed': 'false', onclick: flip });
  const stage = el('div', { class: 'flash-stage' }, card);
  const filters = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Filtrar tarjetas' },
    [['all', 'Todas'], ['health', 'Health'], ['policy', 'Policy'], ['review', 'Repasar']].map(([id, label]) =>
      el('button', { type: 'button', class: 'seg', 'aria-pressed': String(id === filter), onclick: (e) => {
        filter = id;
        filters.querySelectorAll('.seg').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
        build();
      } }, label))
  );

  function build() {
    const marks = store.get().cards;
    deck = data.words.filter((w) => filter === 'all' || w.set === filter || (filter === 'review' && marks[w.word] !== 'known'));
    index = 0;
    show();
  }

  function show() {
    card.classList.remove('flipped');
    card.setAttribute('aria-pressed', 'false');
    const marks = store.get().cards;
    const knownCount = data.words.filter((w) => marks[w.word] === 'known').length;
    known.textContent = `La sé: ${knownCount} de ${data.words.length}`;
    if (!deck.length) {
      card.replaceChildren(el('span', { class: 'face front' }, el('span', { class: 'fc-word' }, '¡Nada por repasar!'), el('span', { class: 'muted' }, 'Elige otro filtro.')));
      counter.textContent = '';
      return;
    }
    const w = deck[index];
    const mark = marks[w.word];
    card.setAttribute('aria-label', `Tarjeta ${index + 1} de ${deck.length}: ${w.word}. Pulsa para voltear.`);
    card.replaceChildren(
      el('span', { class: 'face front', 'aria-hidden': 'false' },
        el('span', { class: 'fc-set' }, setTitle(w.set, data)),
        el('span', { class: 'fc-word' }, w.word),
        el('span', { class: 'fc-pos' }, w.pos),
        mark ? el('span', { class: `fc-mark ${mark}` }, mark === 'known' ? 'La sé' : 'Repasar') : null,
        el('span', { class: 'fc-hint' }, 'Toca o pulsa Espacio para voltear')
      ),
      el('span', { class: 'face back', 'aria-hidden': 'true' },
        el('span', { class: 'fc-def' }, w.definition),
        el('span', { class: 'fc-es', lang: 'es' }, el('span', { class: 'muted small' }, 'Español: '), w.es),
        el('span', { class: 'fc-ex' }, `“${w.example}”`),
        el('span', { class: 'fc-src' }, w.definitionSource === 'ppt' ? 'Definición del PPT' : 'Definición nueva')
      )
    );
    counter.textContent = `${index + 1} / ${deck.length}`;
  }

  function flip() {
    if (!deck.length) return;
    const flipped = card.classList.toggle('flipped');
    card.setAttribute('aria-pressed', String(flipped));
    card.querySelector('.front').setAttribute('aria-hidden', String(flipped));
    card.querySelector('.back').setAttribute('aria-hidden', String(!flipped));
    if (flipped) announce(`${deck[index].definition}. En español: ${deck[index].es}`);
  }

  function move(step) {
    if (!deck.length) return;
    index = (index + step + deck.length) % deck.length;
    show();
  }

  function mark(value) {
    if (!deck.length) return;
    const word = deck[index].word;
    store.update((s) => { s.cards[word] = value; });
    if (filter === 'review' && value === 'known') {
      deck.splice(index, 1);
      if (index >= deck.length) index = 0;
      show();
    } else move(1);
  }

  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(1); card.focus(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); card.focus(); }
  });

  build();
  return el('div', { class: 'flash-wrap' },
    el('div', { class: 'toolbar' }, filters, known),
    stage,
    el('div', { class: 'flash-controls' },
      el('button', { type: 'button', class: 'btn icon-btn', 'aria-label': 'Anterior', onclick: () => move(-1) }, '←'),
      el('button', { type: 'button', class: 'btn btn-review', onclick: () => mark('review') }, 'Repasar'),
      el('button', { type: 'button', class: 'btn btn-known', onclick: () => mark('known') }, 'La sé'),
      el('button', { type: 'button', class: 'btn icon-btn', 'aria-label': 'Siguiente', onclick: () => move(1) }, '→')
    ),
    el('div', { class: 'flash-foot' },
      counter,
      el('button', { type: 'button', class: 'btn btn-ghost small', onclick: () => { deck = shuffle(deck); index = 0; show(); } }, 'Barajar')
    ),
    el('p', { class: 'muted small center' }, 'Teclado: Espacio voltea · ← → cambian de tarjeta')
  );
}

/* ---------- Readings with word bank ---------- */
function readings(data) {
  return el('div', { class: 'stack' }, data.readings.map((r) => readingCard(r)));
}

function readingCard(r) {
  const selects = new Map();
  const score = el('span', { class: 'score', 'aria-live': 'polite' });
  const chips = new Map(r.bank.map((w) => [w, el('li', { class: 'chip' }, w)]));
  const feedback = el('ol', { class: 'gap-feedback-list' });
  const rows = new Map();

  const paragraphs = r.text.split('\n\n').map((para) => {
    const p = el('p', { class: 'reading-text' });
    for (const part of para.split(/(\[\d+\])/)) {
      const m = part.match(/^\[(\d+)\]$/);
      if (!m) { p.append(part); continue; }
      const n = m[1];
      const select = el('select', { class: 'gap-select', 'aria-label': `Espacio ${n}`, onchange: () => check(n) },
        el('option', { value: '' }, `(${n}) ……`),
        r.bank.map((w) => el('option', { value: w }, w))
      );
      selects.set(n, select);
      p.append(el('span', { class: 'gap-inline', 'data-n': n }, select));
      const row = el('li', { value: n, hidden: true });
      rows.set(n, row);
      feedback.append(row);
    }
    return p;
  });

  function check(n) {
    const select = selects.get(n);
    const row = rows.get(n);
    const answer = r.answers[n];
    const wrap = select.parentElement;
    if (!select.value) {
      wrap.dataset.state = 'empty';
      row.hidden = true;
    } else {
      const ok = select.value === answer;
      wrap.dataset.state = ok ? 'right' : 'wrong';
      row.hidden = false;
      row.replaceChildren(el('div', { class: 'feedback' },
        ok ? el('p', { class: 'fb-title ok' }, '✓ ', answer) : el('p', { class: 'fb-title bad' }, '✗ Respuesta: ', el('strong', {}, answer)),
        el('p', { class: 'fb-why' }, el('strong', {}, '¿Por qué? '), r.why[n])
      ));
      announce(ok ? `Espacio ${n}: correcto` : `Espacio ${n}: incorrecto, era ${answer}`);
    }
    refresh();
  }

  function refresh() {
    const values = [...selects.values()].map((s) => s.value);
    for (const [word, chip] of chips) chip.classList.toggle('used', values.includes(word));
    const right = [...selects].filter(([n, s]) => s.value === r.answers[n]).length;
    score.textContent = `${right} / ${selects.size} correctas`;
    if (values.every(Boolean)) store.recordScore('ex', r.id, right, selects.size);
  }

  function retry() {
    for (const [n, s] of selects) { s.value = ''; check(n); }
    selects.values().next().value.focus();
  }

  function reveal() {
    for (const [n, s] of selects) { s.value = r.answers[n]; check(n); }
  }

  refresh();
  const best = store.get().ex[r.id];
  return el('section', { class: 'card reading' },
    el('header', { class: 'card-head' },
      el('h2', {}, r.title),
      el('div', { class: 'ex-tags' }, badge(r.source, r.slide), best ? el('span', { class: 'pill' }, `mejor ${best.best}/${best.total}`) : null)
    ),
    el('p', { class: 'muted small' }, 'Elige la palabra del banco para cada espacio. La corrección es inmediata.'),
    el('ul', { class: 'bank', 'aria-label': 'Banco de palabras' }, [...chips.values()]),
    paragraphs,
    el('p', { class: 'meta' }, score),
    feedback,
    el('div', { class: 'actions' },
      el('button', { type: 'button', class: 'btn', onclick: retry }, 'Reintentar'),
      el('button', { type: 'button', class: 'btn btn-ghost', onclick: reveal }, 'Ver todas las respuestas')
    )
  );
}

/* ---------- Multiple choice ---------- */
export function buildVocabQuestion(words, w) {
  const useCloze = Math.random() < 0.5;
  const distractors = sample(words.filter((o) => o.word !== w.word), 3).map((o) => o.word);
  return {
    kind: 'vocab',
    prompt: useCloze ? 'Completa la frase:' : '¿Qué palabra corresponde a esta definición?',
    stem: useCloze ? w.cloze : w.definition,
    options: shuffle([w.word, ...distractors]),
    answer: w.word,
    why: `${w.word} = ${w.definition} (${w.es}). Ej.: ${w.example}`
  };
}

function multipleChoice(data) {
  const root = el('div', { class: 'quiz' });
  const TOTAL = 10;

  function start() {
    const questions = sample(data.words, TOTAL).map((w) => buildVocabQuestion(data.words, w));
    let i = 0;
    let right = 0;

    function show() {
      const q = questions[i];
      const fb = el('div', { class: 'feedback', hidden: true, 'aria-live': 'polite' });
      const next = el('button', { type: 'button', class: 'btn btn-primary', hidden: true, onclick: () => {
        i++;
        if (i < questions.length) show(); else finish();
      } }, i === questions.length - 1 ? 'Ver resultado' : 'Siguiente →');
      const opts = el('div', { class: 'options', role: 'group', 'aria-label': 'Opciones' }, q.options.map((o) =>
        el('button', { type: 'button', class: 'option', onclick: (e) => {
          const ok = o === q.answer;
          if (ok) right++;
          opts.querySelectorAll('.option').forEach((b) => {
            b.disabled = true;
            if (b.textContent === q.answer) b.dataset.state = 'right';
          });
          if (!ok) e.currentTarget.dataset.state = 'wrong';
          fb.hidden = false;
          fb.replaceChildren(
            el('p', { class: `fb-title ${ok ? 'ok' : 'bad'}` }, ok ? '✓ Correcto' : `✗ Era: ${q.answer}`),
            el('p', { class: 'fb-why' }, q.why)
          );
          next.hidden = false;
          next.focus();
        } }, o)));
      root.replaceChildren(
        el('div', { class: 'progress-line' }, el('span', { style: `width:${(i / questions.length) * 100}%` })),
        el('p', { class: 'muted small' }, `Pregunta ${i + 1} de ${questions.length} · aciertos: ${right}`),
        el('p', { class: 'q-prompt' }, q.prompt),
        el('p', { class: 'q-stem' }, q.stem),
        opts, fb, el('div', { class: 'actions' }, next)
      );
      opts.querySelector('.option').focus();
    }

    function finish() {
      store.recordScore('quiz', 'vocab-mc', right, TOTAL);
      root.replaceChildren(
        el('div', { class: 'result' },
          el('p', { class: 'big-score' }, `${right}/${TOTAL}`),
          el('p', {}, right >= 8 ? '¡Muy bien!' : right >= 5 ? 'Vas bien; repasa las flashcards marcadas.' : 'Repasa las flashcards y vuelve a intentarlo.'),
          el('button', { type: 'button', class: 'btn btn-primary', onclick: start }, 'Otro quiz')
        )
      );
      root.querySelector('button').focus();
    }

    show();
  }

  root.append(
    el('p', {}, `${TOTAL} preguntas al azar: definición → palabra, o completar una frase.`),
    el('button', { type: 'button', class: 'btn btn-primary', onclick: start }, 'Empezar')
  );
  return root;
}

/* ---------- Matching ---------- */
function matching(data) {
  const root = el('div', { class: 'match' });
  const SIZE = 6;

  function round() {
    const words = sample(data.words, SIZE);
    let selected = null;
    let firstTry = 0;
    let matched = 0;
    const missed = new Set();
    const status = el('p', { class: 'muted small', 'aria-live': 'polite' }, 'Elige una palabra y luego su definición.');

    const left = el('div', { class: 'match-col', role: 'group', 'aria-label': 'Palabras' }, words.map((w) =>
      el('button', { type: 'button', class: 'match-btn word', 'data-word': w.word, 'aria-pressed': 'false', onclick: (e) => pick(e.currentTarget) }, w.word)));
    const right = el('div', { class: 'match-col', role: 'group', 'aria-label': 'Definiciones' }, shuffle(words).map((w) =>
      el('button', { type: 'button', class: 'match-btn def', 'data-word': w.word, onclick: (e) => answer(e.currentTarget) }, w.definition)));

    function pick(btn) {
      left.querySelectorAll('.word').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      selected = btn;
      status.textContent = `Seleccionada: ${btn.dataset.word}. Ahora elige su definición.`;
    }

    function answer(btn) {
      if (!selected) { status.textContent = 'Primero elige una palabra de la columna izquierda.'; return; }
      const word = selected.dataset.word;
      if (btn.dataset.word === word) {
        if (!missed.has(word)) firstTry++;
        matched++;
        for (const b of [selected, btn]) { b.disabled = true; b.dataset.state = 'right'; b.setAttribute('aria-pressed', 'false'); }
        selected = null;
        status.textContent = `✓ ${word}: correcto.`;
        if (matched === SIZE) done();
        else left.querySelector('.word:not([disabled])')?.focus();
      } else {
        missed.add(word);
        btn.dataset.state = 'wrong';
        setTimeout(() => { delete btn.dataset.state; }, 600);
        status.textContent = `✗ Esa no es la definición de ${word}. Intenta otra.`;
      }
    }

    function done() {
      store.recordScore('quiz', 'vocab-match', firstTry, SIZE);
      root.querySelector('.match-result').replaceChildren(
        el('p', { class: 'fb-title ok' }, `¡Completado! ${firstTry}/${SIZE} al primer intento.`),
        el('button', { type: 'button', class: 'btn btn-primary', onclick: round }, 'Nueva ronda')
      );
      root.querySelector('.match-result button').focus();
    }

    root.replaceChildren(status, el('div', { class: 'match-grid' }, left, right), el('div', { class: 'match-result actions' }));
  }

  round();
  return root;
}

/* ---------- Word list ---------- */
function wordList(data) {
  const search = el('input', { type: 'search', class: 'input', placeholder: 'Buscar palabra o traducción…', 'aria-label': 'Buscar en la lista' });
  const body = el('div', { class: 'word-list' });
  function render() {
    const q = search.value.trim().toLowerCase();
    body.replaceChildren(...data.sets.map((set) => {
      const words = data.words.filter((w) => w.set === set.id && (!q || `${w.word} ${w.es} ${w.definition}`.toLowerCase().includes(q)));
      if (!words.length) return '';
      return el('section', {},
        el('h2', { class: 'h3' }, set.title),
        el('dl', { class: 'glossary' }, words.map((w) => [
          el('dt', {}, w.word, ' ', el('span', { class: 'muted small' }, w.pos)),
          el('dd', {}, el('span', {}, w.definition), el('span', { class: 'es' }, w.es), el('span', { class: 'ex' }, w.example))
        ]))
      );
    }));
  }
  search.addEventListener('input', render);
  render();
  return el('div', {}, search, body);
}
