// Fill-in-the-gap engine used by the grammar exercises.
// Each item is checked as soon as the learner presses Enter or leaves the box.

import { el, isCorrect, hintFor, badge, announce, normalize } from './util.js';
import { store } from './store.js';

export function renderExercise(ex, { onChange } = {}) {
  const items = ex.items.map((item, i) => ({ ...item, n: i + 1, state: 'empty' }));
  const score = el('span', { class: 'score', 'aria-live': 'polite' });
  const list = el(ex.layout === 'paragraph' ? 'div' : 'ol', { class: ex.layout === 'paragraph' ? 'gap-paragraph' : 'gap-list' });
  const feedbackList = ex.layout === 'paragraph' ? el('ol', { class: 'gap-feedback-list' }) : null;

  for (const item of items) buildItem(item);

  function buildItem(item) {
    const [before, after = ''] = item.text.split('___');
    const width = Math.max(...item.answers.map((a) => a.length)) + 2;
    item.input = el('input', {
      type: 'text',
      class: 'gap-input',
      size: Math.min(width, 26),
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      'aria-label': `Espacio ${item.n}: ${item.text.replace('___', '…')}`,
      onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); check(item, true); } },
      onchange: () => check(item, false)
    });
    item.feedback = el('div', { class: 'feedback', hidden: true });
    const sentence = el('span', { class: 'sentence' },
      before, item.input, after,
      item.verify ? el('span', { class: 'badge badge-verify', title: 'Para verificar con el profesor' }, 'Verificar') : null,
      item.extra ? el('span', { class: 'badge badge-extra' }, 'Extra') : null
    );

    if (ex.layout === 'paragraph') {
      if (item.break) list.append(el('span', { class: 'para-break' }));
      item.row = el('span', { class: 'gap-inline', 'data-n': item.n }, el('sup', { class: 'gap-num' }, item.n), sentence, ' ');
      list.append(item.row);
      item.feedbackRow = el('li', { value: item.n, hidden: true }, item.feedback);
      feedbackList.append(item.feedbackRow);
    } else {
      item.row = el('li', { class: 'gap-item' }, el('p', {}, sentence), item.feedback);
      list.append(item.row);
    }
  }

  function check(item, moveNext) {
    const value = item.input.value.trim();
    if (!value) {
      item.state = 'empty';
      paint(item);
      return;
    }
    item.state = isCorrect(value, item.answers, item.text.split('___')[0]) ? 'right' : 'wrong';
    paint(item);
    update();
    if (moveNext) {
      const next = items.find((it) => it.n > item.n && it.state === 'empty');
      if (next) next.input.focus();
    }
  }

  function paint(item) {
    item.row.dataset.state = item.state;
    item.input.setAttribute('aria-invalid', item.state === 'wrong' ? 'true' : 'false');
    const box = item.feedback;
    box.replaceChildren();
    const show = item.state !== 'empty';
    box.hidden = !show;
    if (item.feedbackRow) item.feedbackRow.hidden = !show;
    if (!show) return;

    const main = item.answers[0];
    // Other valid answers, without the one already shown/typed and without
    // contraction variants ("'m seeing" vs "am seeing").
    const shown = item.state === 'right' ? item.input.value : main;
    const seen = new Set([normalize(shown)]);
    const altText = item.answers.filter((a) => !seen.has(normalize(a)) && seen.add(normalize(a))).join(' · ');
    if (item.state === 'right') {
      box.append(el('p', { class: 'fb-title ok' }, '✓ Correcto'));
    } else {
      box.append(
        el('p', { class: 'fb-title bad' }, '✗ Respuesta: ', el('strong', {}, main)),
      );
      const hint = hintFor(item.input.value, item.answers);
      if (hint) box.append(el('p', { class: 'fb-hint' }, hint));
    }
    if (altText) box.append(el('p', { class: 'fb-alt' }, 'También válido: ', altText));
    box.append(el('p', { class: 'fb-why' }, el('strong', {}, '¿Por qué? '), item.why));
    announce(item.state === 'right' ? `Espacio ${item.n}: correcto` : `Espacio ${item.n}: incorrecto. Respuesta: ${main}`);
  }

  function update() {
    const done = items.filter((it) => it.state !== 'empty').length;
    const right = items.filter((it) => it.state === 'right').length;
    score.textContent = `${right} / ${items.length} correctas`;
    if (done === items.length) {
      store.recordScore('ex', ex.id, right, items.length);
      onChange?.();
    }
  }

  function checkAll() {
    for (const item of items) {
      if (!item.input.value.trim()) {
        item.state = 'wrong';
        paint(item);
      } else check(item, false);
    }
    update();
  }

  function retry() {
    for (const item of items) {
      item.input.value = '';
      item.state = 'empty';
      paint(item);
    }
    score.textContent = `0 / ${items.length} correctas`;
    items[0].input.focus();
  }

  score.textContent = `0 / ${items.length} correctas`;
  const best = store.get().ex[ex.id];

  return el('div', { class: 'exercise' },
    el('div', { class: 'exercise-head' },
      el('p', { class: 'instructions' }, ex.instructions),
      el('p', { class: 'meta' }, score, best ? el('span', { class: 'muted' }, ` · mejor: ${best.best}/${best.total}`) : null)
    ),
    list,
    feedbackList,
    el('div', { class: 'actions' },
      el('button', { class: 'btn btn-primary', type: 'button', onclick: checkAll }, 'Comprobar todo'),
      el('button', { class: 'btn', type: 'button', onclick: retry }, 'Reintentar')
    )
  );
}

export function exerciseCard(ex, opts) {
  const best = store.get().ex[ex.id];
  const details = el('details', { class: 'card ex-card', 'data-source': ex.source },
    el('summary', {},
      el('span', { class: 'ex-title' }, ex.title),
      el('span', { class: 'ex-tags' },
        badge(ex.source, ex.slide),
        el('span', { class: 'muted small' }, `${ex.items.length} frases`),
        best ? el('span', { class: 'pill' }, `${best.best}/${best.total}`) : null
      )
    )
  );
  let body = null;
  details.addEventListener('toggle', () => {
    if (details.open && !body) {
      body = renderExercise(ex, opts);
      details.append(body);
    }
  });
  return details;
}
