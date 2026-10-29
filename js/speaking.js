// Speaking: functional phrases, discussion questions and a 10–15 min timer.

import { el, badge, sample } from './util.js';
import { store } from './store.js';
import { makeTabs, makeTimer } from './ui.js';

export function renderSpeaking(data, sub) {
  const tabs = makeTabs([
    { id: 'frases', label: 'Frases útiles', render: () => phrases(data) },
    { id: 'preguntas', label: 'Preguntas', render: () => questions(data) },
    { id: 'simulacro', label: 'Practicar con tiempo', render: () => practice(data) }
  ], { prefKey: 'speakingTab', initial: sub });

  return el('div', {},
    el('header', { class: 'section-head' },
      el('p', { class: 'eyebrow' }, 'Speaking evaluation'),
      el('h1', {}, 'Conversación en grupos de 3'),
      el('ul', { class: 'facts' }, data.exam.notes.map((n) => el('li', {}, n)))
    ),
    tabs.node
  );
}

function phrases(data) {
  return el('div', { class: 'phrase-grid' }, data.phrases.map((g) =>
    el('section', { class: 'card' },
      el('h2', { class: 'h4' }, g.group),
      el('ul', { class: 'phrases', lang: 'en' }, g.items.map((i) => el('li', {}, i)))
    )));
}

function questions(data) {
  return el('div', { class: 'stack' }, data.questions.map((g) =>
    el('section', { class: 'card' },
      el('header', { class: 'card-head' }, el('h2', { class: 'h3' }, g.group), badge(g.source, g.slide)),
      el('ol', { class: 'questions', lang: 'en' }, g.items.map((q) => el('li', {}, q))),
      g.note ? el('p', { class: 'note' }, '⚠ ', g.note) : null
    )));
}

function practice(data) {
  const all = data.questions.flatMap((g) => g.items);
  const picked = el('ol', { class: 'questions picked', lang: 'en', 'aria-live': 'polite' });
  const draw = () => picked.replaceChildren(...sample(all, 2).map((q) => el('li', {}, q)));
  draw();
  return el('div', { class: 'speak-layout' },
    el('section', { class: 'card' },
      el('h2', { class: 'h3' }, 'Dos temas al azar'),
      picked,
      el('button', { type: 'button', class: 'btn', onclick: draw }, 'Otros dos temas'),
      el('p', { class: 'muted small' }, 'Consejo: túrnense, usen las frases para incluir a todos y den ejemplos personales.')
    ),
    el('section', { class: 'card' },
      el('h2', { class: 'h3' }, 'Temporizador'),
      makeTimer({
        presets: [10, 15],
        label: 'Tiempo de conversación',
        onFinish: () => store.update((s) => { s.speaking += 1; })
      })
    )
  );
}
