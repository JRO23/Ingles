// Writing: essay guide, practice topics, model essay and a timed editor.

import { el, badge, countWords } from './util.js';
import { store } from './store.js';
import { makeTabs, makeTimer } from './ui.js';

export function renderWriting(data, sub) {
  let tabs;
  const openEditor = (topicId) => {
    store.update((s) => { s.draft.topic = topicId; });
    tabs.select('editor', true);
    document.dispatchEvent(new CustomEvent('writing-topic', { detail: topicId }));
    document.getElementById('essay')?.focus();
  };
  tabs = makeTabs([
    { id: 'guia', label: 'Estructura', render: () => guide(data) },
    { id: 'conectores', label: 'Conectores y opinión', render: () => phrases(data) },
    { id: 'temas', label: 'Temas', render: () => topics(data, openEditor) },
    { id: 'modelo', label: 'Ensayo modelo', render: () => model(data) },
    { id: 'editor', label: 'Practicar (60 min)', render: () => editor(data) }
  ], { prefKey: 'writingTab', initial: sub });

  return el('div', {},
    el('header', { class: 'section-head' },
      el('p', { class: 'eyebrow' }, 'Writing evaluation'),
      el('h1', {}, 'Agree / disagree essay'),
      el('ul', { class: 'facts' }, data.exam.notes.map((n) => el('li', {}, n)))
    ),
    tabs.node
  );
}

function guide(data) {
  return el('ol', { class: 'steps' }, data.structure.map((s) =>
    el('li', { class: 'card step' },
      el('h2', { class: 'h3' }, s.part, ' ', el('span', { class: 'muted small' }, s.words)),
      el('ul', {}, s.tips.map((t) => el('li', {}, t))),
      el('blockquote', { class: 'example', lang: 'en' }, s.example)
    )));
}

function phraseGroups(groups) {
  return el('div', { class: 'phrase-grid' }, groups.map((g) =>
    el('section', { class: 'card' },
      el('h3', { class: 'h4' }, g.group),
      el('ul', { class: 'phrases', lang: 'en' }, g.items.map((i) => el('li', {}, i)))
    )));
}

function phrases(data) {
  return el('div', { class: 'stack' },
    el('h2', { class: 'h3' }, 'Conectores útiles'),
    phraseGroups(data.connectors),
    el('h2', { class: 'h3' }, 'Frases para dar tu opinión'),
    phraseGroups(data.opinion)
  );
}

function topics(data, openEditor) {
  return el('div', { class: 'stack' }, data.topics.map((t) =>
    el('article', { class: 'card topic' },
      el('div', { class: 'ex-tags' }, badge(t.source, t.slide)),
      el('p', { class: 'topic-prompt', lang: 'en' }, t.prompt),
      el('details', {},
        el('summary', {}, 'Ideas para argumentar'),
        el('ul', {}, t.ideas.map((i) => el('li', {}, i)))
      ),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: () => openEditor(t.id) }, 'Practicar este tema')
    )));
}

function model(data) {
  const topic = data.topics.find((t) => t.id === data.model.topic);
  return el('article', { class: 'card' },
    el('p', { class: 'ex-tags' }, el('span', { class: 'badge badge-new' }, 'Nuevo'), el('span', { class: 'muted small' }, data.model.label)),
    el('p', { class: 'topic-prompt', lang: 'en' }, topic.prompt),
    el('div', { class: 'model-essay', lang: 'en' }, data.model.text.split('\n\n').map((p) => el('p', {}, p))),
    el('p', { class: 'muted small' }, `${countWords(data.model.text)} palabras · fíjate en los conectores y en la gramática del curso (used to, would, be used to, usually, will).`)
  );
}

function editor(data) {
  const draft = store.get().draft;
  const select = el('select', { class: 'input', id: 'essay-topic', onchange: () => store.update((s) => { s.draft.topic = select.value; }) },
    el('option', { value: '' }, 'Elige un tema…'),
    data.topics.map((t) => el('option', { value: t.id }, `${t.source === 'ppt' ? '[PPT] ' : ''}${t.prompt.replace(/ To what extent.*/, '').replace(/"/g, '')}`))
  );
  select.value = draft.topic || '';
  document.addEventListener('writing-topic', (e) => { select.value = e.detail; });

  const counter = el('span', { class: 'word-count', 'aria-live': 'polite' });
  const area = el('textarea', {
    id: 'essay', class: 'essay', lang: 'en', spellcheck: 'false', rows: 16,
    placeholder: 'Write your essay here… (se guarda automáticamente en este navegador)',
    'aria-describedby': 'essay-count'
  });
  area.value = draft.text || '';
  counter.id = 'essay-count';
  let saveTimer = null;
  const updateCount = () => {
    const n = countWords(area.value);
    counter.textContent = `${n} palabras`;
    counter.dataset.level = n >= 250 ? 'good' : n >= 150 ? 'ok' : 'low';
  };
  area.addEventListener('input', () => {
    updateCount();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.update((s) => { s.draft.text = area.value; }), 400);
  });
  updateCount();

  const saved = el('p', { class: 'muted small', 'aria-live': 'polite' });
  const finish = () => {
    const words = countWords(area.value);
    if (words < 50) { saved.textContent = 'Escribe al menos 50 palabras para registrar el ensayo.'; return; }
    store.update((s) => { s.essays.push({ date: new Date().toISOString(), topic: select.value, words }); });
    saved.textContent = `Ensayo registrado (${words} palabras). Ensayos practicados: ${store.get().essays.length}.`;
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(area.value); saved.textContent = 'Texto copiado.'; } catch { area.select(); saved.textContent = 'Selecciona y copia con Ctrl+C.'; }
  };
  const clear = () => {
    if (!area.value || confirm('¿Borrar el texto del editor?')) {
      area.value = '';
      store.update((s) => { s.draft.text = ''; s.draft.checks = []; });
      checklist.querySelectorAll('input').forEach((c) => { c.checked = false; });
      updateCount();
    }
  };

  const checks = new Set(draft.checks || []);
  const checklist = el('ul', { class: 'checklist' }, data.checklist.map((c, i) => {
    const id = `chk-${i}`;
    const box = el('input', { type: 'checkbox', id, checked: checks.has(i), onchange: () => store.update((s) => {
      const set = new Set(s.draft.checks || []);
      box.checked ? set.add(i) : set.delete(i);
      s.draft.checks = [...set];
    }) });
    return el('li', {}, box, el('label', { for: id }, c));
  }));

  return el('div', { class: 'editor-layout' },
    el('div', { class: 'editor-main' },
      el('label', { for: 'essay-topic', class: 'label' }, 'Tema'),
      select,
      el('div', { class: 'editor-bar' }, el('label', { for: 'essay', class: 'label' }, 'Tu ensayo'), counter),
      area,
      el('p', { class: 'muted small' }, 'Objetivo orientativo: 250–350 palabras (introducción, 2–3 párrafos, conclusión).'),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn btn-primary', onclick: finish }, 'Terminé'),
        el('button', { type: 'button', class: 'btn', onclick: copy }, 'Copiar texto'),
        el('button', { type: 'button', class: 'btn btn-ghost', onclick: clear }, 'Borrar')
      ),
      saved
    ),
    el('aside', { class: 'editor-side' },
      el('section', { class: 'card' }, el('h2', { class: 'h4' }, 'Temporizador'), makeTimer({ presets: [60], label: 'Tiempo restante del ensayo' })),
      el('section', { class: 'card' }, el('h2', { class: 'h4' }, 'Autoevaluación'), checklist)
    )
  );
}
