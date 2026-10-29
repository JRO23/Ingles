// Entry point: loads the study data, renders sections and handles routing.

import { el, badge } from './util.js';
import { store } from './store.js';
import { makeTabs } from './ui.js';
import { exerciseCard } from './exercises.js';
import { renderVocab } from './vocab.js';
import { renderWriting } from './writing.js';
import { renderSpeaking } from './speaking.js';
import { renderExam } from './exam.js';

const SECTIONS = ['inicio', 'grammar', 'vocab', 'writing', 'speaking', 'exam'];
const main = document.getElementById('main');
const views = {};
let data;

/* ---------- Theme ---------- */
const themeBtn = document.getElementById('theme-toggle');
function applyTheme(theme) {
  if (theme) document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
  const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  themeBtn.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  themeBtn.setAttribute('aria-pressed', String(dark));
}
themeBtn.addEventListener('click', () => {
  const dark = themeBtn.getAttribute('aria-pressed') === 'true';
  const next = dark ? 'light' : 'dark';
  store.pref('theme', next);
  applyTheme(next);
});
applyTheme(store.pref('theme'));

/* ---------- Data ---------- */
async function loadJSON(name) {
  const res = await fetch(`data/${name}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No se pudo cargar data/${name}.json (${res.status})`);
  return res.json();
}

async function init() {
  try {
    const [grammar, vocab, writing, speaking] = await Promise.all(['grammar', 'vocab', 'writing', 'speaking'].map(loadJSON));
    data = { grammar, vocab, writing, speaking };
  } catch (err) {
    main.replaceChildren(el('div', { class: 'card error-box' },
      el('h1', { class: 'h3' }, 'No se pudo cargar el contenido'),
      el('p', {}, String(err.message)),
      el('p', { class: 'muted' }, 'Si abriste index.html directamente desde el disco, sírvelo con un servidor local (mira el README) o usa la versión de GitHub Pages.')
    ));
    console.error(err);
    return;
  }
  main.querySelector('.loading')?.remove();
  window.addEventListener('hashchange', route);
  route();
}

/* ---------- Router ---------- */
function route() {
  const [section = 'inicio', sub] = location.hash.replace(/^#\/?/, '').split('/');
  const id = SECTIONS.includes(section) ? section : 'inicio';

  document.querySelectorAll('.nav a').forEach((a) => {
    if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  if (id === 'inicio' || !views[id]) {
    views[id]?.remove();
    views[id] = el('section', { class: 'view', 'data-view': id, 'aria-labelledby': `${id}-title` }, build(id, sub));
    main.append(views[id]);
    views[id].querySelector('h1')?.setAttribute('id', `${id}-title`);
  } else if (sub) {
    views[id].querySelector(`[role="tab"][id$="-${sub}-tab"]`)?.click();
  }
  for (const [key, view] of Object.entries(views)) view.hidden = key !== id;

  const title = views[id].querySelector('h1')?.textContent;
  document.title = id === 'inicio' ? 'GV Review · Level 5' : `${title} · GV Review`;
  window.scrollTo(0, 0);
  const h1 = views[id].querySelector('h1');
  if (h1 && document.activeElement !== document.body) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
}

function build(id, sub) {
  switch (id) {
    case 'grammar': return renderGrammar(data.grammar, sub);
    case 'vocab': return renderVocab(data.vocab, sub);
    case 'writing': return renderWriting(data.writing, sub);
    case 'speaking': return renderSpeaking(data.speaking, sub);
    case 'exam': return renderExam(data.grammar, data.vocab);
    default: return renderHome();
  }
}

/* ---------- Progress ---------- */
function ratio(ids) {
  const ex = store.get().ex;
  let best = 0;
  let total = 0;
  for (const id of ids) {
    const item = [...data.grammar.exercises, ...data.vocab.readings].find((e) => e.id === id);
    const size = item.items ? item.items.length : Object.keys(item.answers).length;
    best += ex[id]?.best ?? 0;
    total += size;
  }
  return total ? best / total : 0;
}

function cardRatio(set) {
  const words = data.vocab.words.filter((w) => w.set === set);
  const cards = store.get().cards;
  return words.filter((w) => cards[w.word] === 'known').length / words.length;
}

function progressRows() {
  const exIds = (topic) => data.grammar.exercises.filter((e) => e.topic === topic).map((e) => e.id);
  return [
    { label: 'Past & Present Habits', detail: 'Ejercicios del PPT + nuevos', value: ratio(exIds('habits')), href: '#grammar/ejercicios' },
    { label: 'Future Tenses', detail: 'Ejercicios del PPT + nuevos', value: ratio(exIds('future')), href: '#grammar/ejercicios' },
    { label: 'Health', detail: 'Flashcards "la sé" + Vocabulary Building 1', value: (cardRatio('health') + ratio(['ppt-vb1'])) / 2, href: '#vocab/flashcards' },
    { label: 'Health Policy', detail: 'Flashcards "la sé" + Vocabulary Building 2', value: (cardRatio('policy') + ratio(['ppt-vb2'])) / 2, href: '#vocab/textos' }
  ];
}

/* ---------- Home ---------- */
function renderHome() {
  const s = store.get();
  const lastExam = s.exams.at(-1);
  const bestExam = s.exams.reduce((m, e) => Math.max(m, e.grammar + e.vocab), 0);

  const parts = [
    { pts: '20', unit: 'pts', name: 'Grammar', desc: 'Past & present habits · Future tenses', href: '#grammar' },
    { pts: '10', unit: 'pts', name: 'Vocabulary', desc: 'Health · Health policy', href: '#vocab' },
    { pts: '60', unit: 'min', name: 'Writing', desc: 'Ensayo agree / disagree, en papel, 2 temas para elegir', href: '#writing' },
    { pts: '10–15', unit: 'min', name: 'Speaking', desc: 'Grupos de 3, dos temas, conversación entre ustedes', href: '#speaking' }
  ];

  return el('div', { class: 'home' },
    el('header', { class: 'hero' },
      el('p', { class: 'eyebrow' }, 'English X · Level 5'),
      el('h1', {}, 'Final Grammar & Vocabulary Review'),
      el('p', { class: 'lead' }, 'Todo lo del repaso del profesor, con ejercicios corregidos al instante. Tu progreso se guarda solo en este navegador.')
    ),

    el('section', { 'aria-labelledby': 'h-eval' },
      el('h2', { id: 'h-eval', class: 'h3' }, 'Qué evalúa el examen'),
      el('div', { class: 'part-grid' }, parts.map((p) =>
        el('a', { class: 'card part', href: p.href },
          el('span', { class: 'part-pts' }, p.pts, el('small', {}, ` ${p.unit}`)),
          el('span', { class: 'part-name' }, p.name),
          el('span', { class: 'part-desc' }, p.desc)
        )))
    ),

    el('section', { 'aria-labelledby': 'h-prog' },
      el('h2', { id: 'h-prog', class: 'h3' }, 'Tu progreso'),
      el('ul', { class: 'progress-list card' }, progressRows().map((r) => {
        const pct = Math.round(r.value * 100);
        return el('li', {},
          el('a', { href: r.href, class: 'progress-row' },
            el('span', { class: 'pr-label' }, r.label, el('span', { class: 'muted small' }, r.detail)),
            el('span', { class: 'pr-bar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': r.label }, el('span', { style: `width:${pct}%` })),
            el('span', { class: 'pr-pct' }, `${pct}%`)
          ));
      })),
      el('div', { class: 'mini-stats' },
        el('div', { class: 'card stat' }, el('span', { class: 'stat-num' }, lastExam ? `${lastExam.grammar + lastExam.vocab}/30` : '—'), el('span', { class: 'muted small' }, 'Último simulacro'), bestExam ? el('span', { class: 'small' }, `Mejor: ${bestExam}/30`) : null),
        el('div', { class: 'card stat' }, el('span', { class: 'stat-num' }, String(s.essays.length)), el('span', { class: 'muted small' }, 'Ensayos practicados')),
        el('div', { class: 'card stat' }, el('span', { class: 'stat-num' }, String(s.speaking)), el('span', { class: 'muted small' }, 'Conversaciones cronometradas'))
      )
    ),

    el('section', { 'aria-labelledby': 'h-quick' },
      el('h2', { id: 'h-quick', class: 'h3' }, 'Acceso rápido'),
      el('div', { class: 'quick-grid' },
        quick('#grammar/teoria', 'Teoría de gramática', 'would · used to · be used to · usually · futuros'),
        quick('#grammar/ejercicios', 'Ejercicios de gramática', 'Los 4 del PPT + 3 nuevos'),
        quick('#vocab/flashcards', 'Flashcards', `${data.vocab.words.length} palabras`),
        quick('#vocab/textos', 'Vocabulary Building 1 y 2', 'Textos del PPT con banco de palabras'),
        quick('#writing/editor', 'Escribir un ensayo', 'Con temporizador de 60 min'),
        quick('#exam', 'Simulacro de examen', '20 grammar + 10 vocabulary')
      )
    ),

    el('section', { class: 'card legend' },
      el('h2', { class: 'h4' }, 'Etiquetas'),
      el('p', {}, badge('ppt', 11), ' contenido original del PPT (con número de diapositiva). ', badge('nuevo'), ' contenido creado para esta página. ',
        el('span', { class: 'badge badge-verify' }, 'Verificar'), ' respuestas para confirmar con el profesor.')
    ),

    el('p', { class: 'center' },
      el('button', { type: 'button', class: 'btn btn-ghost small', onclick: () => {
        if (confirm('¿Borrar todo tu progreso guardado (ejercicios, flashcards, simulacros y borrador)?')) { store.reset(); location.hash = '#inicio'; route(); }
      } }, 'Borrar mi progreso')
    )
  );
}

function quick(href, title, desc) {
  return el('a', { class: 'card quick', href }, el('span', { class: 'quick-title' }, title, ' →'), el('span', { class: 'muted small' }, desc));
}

/* ---------- Grammar ---------- */
function renderGrammar(g, sub) {
  const tabs = makeTabs([
    { id: 'teoria', label: 'Teoría', render: () => theory(g) },
    { id: 'ejercicios', label: 'Ejercicios', render: () => exercises(g) },
    { id: 'verificar', label: 'Verificar con el profesor', render: () => verify(g) }
  ], { prefKey: 'grammarTab', initial: sub });
  return el('div', {},
    el('header', { class: 'section-head' },
      el('p', { class: 'eyebrow' }, 'Grammar · 20 pts'),
      el('h1', {}, 'Habits & Future Tenses'),
      el('p', { class: 'lead' }, 'Explicación de cada estructura, ejercicios del PPT y práctica extra con corrección inmediata.')
    ),
    tabs.node
  );
}

function theory(g) {
  const group = (id, title, intro) => el('section', { class: 'stack' },
    el('h2', { class: 'h3 group-title' }, title),
    intro,
    g.topics.filter((t) => t.group === id).map(topicCard)
  );
  return el('div', { class: 'stack' },
    group('habits', 'Past and Present Habits', null),
    el('section', { class: 'card' },
      el('h3', { class: 'h4' }, 'Compáralos de un vistazo'),
      el('div', { class: 'table-wrap' }, el('table', { class: 'compare' },
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Forma'), el('th', { scope: 'col' }, 'Significado'), el('th', { scope: 'col' }, 'Ejemplo'))),
        el('tbody', {}, g.compare.map((c) => el('tr', {}, el('th', { scope: 'row' }, c.form), el('td', {}, c.meaning), el('td', { lang: 'en' }, c.example))))
      ))
    ),
    group('future', 'Future Tenses', el('p', { class: 'muted' }, 'El PPT (diap. 17) resume tres estructuras. Future Perfect se añade como extra porque aparece en el ejercicio de la diap. 18.'))
  );
}

function topicCard(t) {
  const form = (label, cls, text) => el('div', { class: `form-row ${cls}` }, el('span', { class: 'form-sign', 'aria-label': label }, cls === 'aff' ? '+' : cls === 'neg' ? '−' : '?'), el('span', { lang: 'en' }, text));
  return el('article', { class: 'card topic-card' },
    el('header', { class: 'card-head' },
      el('div', {}, el('h3', { class: 'topic-title', lang: 'en' }, t.title), el('p', { class: 'muted small' }, t.subtitle)),
      t.inPPT ? badge('ppt', t.slide) : el('span', { class: 'badge badge-extra' }, 'Extra · no está en el resumen')
    ),
    el('p', {}, t.summary),
    el('p', { class: 'structure' }, el('strong', {}, 'Estructura: '), t.structure),
    el('div', { class: 'forms' },
      form('Afirmativa', 'aff', t.forms.affirmative),
      form('Negativa', 'neg', t.forms.negative),
      form('Interrogativa', 'que', t.forms.question)
    ),
    el('details', {},
      el('summary', {}, 'Más ejemplos'),
      el('ul', { lang: 'en' }, t.examples.map((e) => el('li', {}, e)))
    ),
    el('details', {},
      el('summary', {}, `Errores comunes (${t.mistakes.length})`),
      el('ul', { class: 'mistakes' }, t.mistakes.map((m) => el('li', {},
        el('span', { class: 'wrong', lang: 'en' }, el('s', {}, m.wrong)),
        el('span', { class: 'right', lang: 'en' }, m.right),
        el('span', { class: 'muted small' }, m.why)
      )))
    )
  );
}

function exercises(g) {
  let filter = 'all';
  const list = el('div', { class: 'stack' });
  const render = () => list.replaceChildren(...g.exercises
    .filter((ex) => filter === 'all' || ex.source === filter)
    .map((ex) => exerciseCard(ex, {})));
  const filters = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Filtrar ejercicios' },
    [['all', 'Todos'], ['ppt', 'Del PPT'], ['nuevo', 'Nuevos']].map(([id, label]) =>
      el('button', { type: 'button', class: 'seg', 'aria-pressed': String(id === filter), onclick: (e) => {
        filter = id;
        filters.querySelectorAll('.seg').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
        render();
      } }, label)));
  render();
  return el('div', {},
    el('div', { class: 'toolbar' }, filters, el('p', { class: 'muted small' }, 'Escribe y pulsa Enter (o sal del recuadro) para corregir. Se aceptan contracciones y formas completas.')),
    list
  );
}

function verify(g) {
  const flagged = g.exercises.flatMap((ex) => ex.items.filter((i) => i.verify).map((i) => ({ ...i, ex })));
  return el('div', { class: 'stack' },
    el('p', {}, 'Preguntas donde la clave acepta más de una respuesta o el PPT no es del todo claro. Confírmalas con tu profesor antes del examen.'),
    el('ol', { class: 'stack verify-list' },
      flagged.map((i) => el('li', { class: 'card' },
        el('p', { class: 'muted small' }, i.ex.title, ' ', badge(i.ex.source, i.ex.slide)),
        el('p', { lang: 'en' }, i.text),
        el('p', {}, 'Aceptadas: ', el('strong', {}, i.answers.filter((a) => !a.startsWith("'")).join(' / '))),
        el('p', { class: 'fb-why' }, i.why)
      )),
      g.teacherNotes.map((n) => el('li', { class: 'card' },
        el('p', { class: 'muted small' }, n.where),
        el('p', {}, n.note)
      ))
    )
  );
}

init();
