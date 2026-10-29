// Mock exam: 20 random grammar gaps + 10 vocabulary questions, scored at the end.

import { el, sample, isCorrect, hintFor, badge } from './util.js';
import { store } from './store.js';
import { buildVocabQuestion } from './vocab.js';

const G = 20;
const V = 10;

export function renderExam(grammar, vocab) {
  const root = el('div', {});
  intro();
  return root;

  function intro() {
    const history = store.get().exams.slice(-5).reverse();
    const pptOnly = el('input', { type: 'checkbox', id: 'exam-ppt' });
    root.replaceChildren(
      el('header', { class: 'section-head' },
        el('p', { class: 'eyebrow' }, 'Simulacro'),
        el('h1', {}, 'Grammar & Vocabulary'),
        el('p', { class: 'lead' }, `${G} preguntas de gramática (20 pts) + ${V} de vocabulario (10 pts), en orden aleatorio. Verás tus resultados y errores al final.`)
      ),
      el('div', { class: 'card stack-sm' },
        el('div', { class: 'check-row' }, pptOnly, el('label', { for: 'exam-ppt' }, 'Solo frases de gramática del PPT (sin las nuevas)')),
        el('button', { type: 'button', class: 'btn btn-primary btn-lg', onclick: () => run(pptOnly.checked) }, 'Empezar simulacro')
      ),
      history.length ? el('section', { class: 'card' },
        el('h2', { class: 'h4' }, 'Últimos intentos'),
        el('ul', { class: 'history' }, history.map((h) => el('li', {},
          el('span', {}, new Date(h.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })),
          el('strong', {}, `${h.grammar + h.vocab}/30`),
          el('span', { class: 'muted small' }, `G ${h.grammar}/20 · V ${h.vocab}/10`)
        )))
      ) : null
    );
  }

  function run(pptOnly) {
    const pool = grammar.exercises
      .filter((ex) => !pptOnly || ex.source === 'ppt')
      .flatMap((ex) => ex.items.map((item) => ({ ...item, exTitle: ex.title, source: ex.source, slide: ex.slide })));
    const gq = sample(pool, G).map((item) => ({ kind: 'grammar', ...item }));
    const vq = sample(vocab.words, V).map((w) => buildVocabQuestion(vocab.words, w));
    const questions = sample([...gq, ...vq], G + V);
    const answers = new Array(questions.length).fill('');
    let i = 0;

    function show() {
      const q = questions[i];
      const nav = el('div', { class: 'actions exam-nav' },
        el('button', { type: 'button', class: 'btn', disabled: i === 0, onclick: () => { save(); i--; show(); } }, '← Anterior'),
        i < questions.length - 1
          ? el('button', { type: 'button', class: 'btn btn-primary', onclick: () => { save(); i++; show(); } }, 'Siguiente →')
          : el('button', { type: 'button', class: 'btn btn-primary', onclick: () => { save(); finish(); } }, 'Terminar y corregir')
      );
      let body;
      let save = () => {};
      if (q.kind === 'grammar') {
        const [before, after = ''] = q.text.split('___');
        const input = el('input', { type: 'text', class: 'gap-input', size: 20, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Tu respuesta', value: answers[i] });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); nav.querySelector('.btn-primary').click(); } });
        save = () => { answers[i] = input.value.trim(); };
        body = el('div', {},
          el('p', { class: 'q-prompt' }, 'Grammar · completa el espacio'),
          el('p', { class: 'q-stem', lang: 'en' }, before, input, after)
        );
        requestAnimationFrame(() => input.focus());
      } else {
        const opts = el('div', { class: 'options', role: 'radiogroup', 'aria-label': 'Opciones' }, q.options.map((o) =>
          el('button', { type: 'button', class: 'option', role: 'radio', 'aria-checked': String(answers[i] === o), onclick: (e) => {
            answers[i] = o;
            opts.querySelectorAll('.option').forEach((b) => b.setAttribute('aria-checked', String(b === e.currentTarget)));
          } }, o)));
        body = el('div', {},
          el('p', { class: 'q-prompt' }, `Vocabulary · ${q.prompt}`),
          el('p', { class: 'q-stem', lang: 'en' }, q.stem),
          opts
        );
        requestAnimationFrame(() => opts.querySelector('.option').focus());
      }
      const answered = answers.filter(Boolean).length;
      root.replaceChildren(
        el('div', { class: 'exam-top' },
          el('p', { class: 'muted small' }, `Pregunta ${i + 1} de ${questions.length} · respondidas ${answered}`),
          el('button', { type: 'button', class: 'btn btn-ghost small', onclick: () => { if (confirm('¿Salir del simulacro? Se perderán las respuestas.')) intro(); } }, 'Salir')
        ),
        el('div', { class: 'progress-line' }, el('span', { style: `width:${((i + 1) / questions.length) * 100}%` })),
        el('div', { class: 'card exam-q' }, body),
        nav
      );
    }

    function finish() {
      const unanswered = answers.filter((a) => !a).length;
      if (unanswered && !confirm(`Tienes ${unanswered} preguntas sin responder. ¿Corregir de todas formas?`)) return;
      let g = 0;
      let v = 0;
      const errors = [];
      questions.forEach((q, n) => {
        const given = answers[n];
        const ok = q.kind === 'grammar' ? isCorrect(given, q.answers, q.text.split('___')[0]) : given === q.answer;
        if (ok) { q.kind === 'grammar' ? g++ : v++; } else errors.push({ q, given, n: n + 1 });
      });
      store.update((s) => { s.exams.push({ date: new Date().toISOString(), grammar: g, vocab: v }); });
      results(g, v, errors);
    }

    show();
  }

  function results(g, v, errors) {
    const total = g + v;
    root.replaceChildren(
      el('header', { class: 'section-head' },
        el('p', { class: 'eyebrow' }, 'Resultado del simulacro'),
        el('h1', {}, `${total} / 30`),
        el('p', { class: 'lead' }, total >= 27 ? '¡Excelente! Estás listo.' : total >= 21 ? 'Buen resultado. Repasa los errores de abajo.' : 'Sigue practicando: revisa la teoría y los errores.')
      ),
      el('div', { class: 'score-split' },
        el('div', { class: 'card stat' }, el('span', { class: 'stat-num' }, `${g}/20`), el('span', { class: 'muted' }, 'Grammar')),
        el('div', { class: 'card stat' }, el('span', { class: 'stat-num' }, `${v}/10`), el('span', { class: 'muted' }, 'Vocabulary'))
      ),
      el('h2', { class: 'h3' }, errors.length ? `Para repasar (${errors.length})` : 'Sin errores 🎉'),
      el('ol', { class: 'error-list' }, errors.map(({ q, given, n }) => {
        const correct = q.kind === 'grammar' ? q.answers[0] : q.answer;
        const hint = q.kind === 'grammar' && given ? hintFor(given, q.answers) : '';
        return el('li', { class: 'card' },
          el('p', { class: 'muted small' }, `#${n} · ${q.kind === 'grammar' ? q.exTitle : 'Vocabulary'} `, q.kind === 'grammar' ? badge(q.source, q.slide) : null),
          el('p', { lang: 'en' }, q.kind === 'grammar' ? q.text : q.stem),
          el('p', {}, 'Tu respuesta: ', el('span', { class: 'bad' }, given || '(vacía)')),
          el('p', {}, 'Correcta: ', el('strong', { class: 'ok' }, correct),
            q.kind === 'grammar' && q.answers.length > 1 ? el('span', { class: 'muted small' }, ` (también: ${q.answers.slice(1).join(' · ')})`) : null),
          hint ? el('p', { class: 'fb-hint' }, hint) : null,
          el('p', { class: 'fb-why' }, el('strong', {}, '¿Por qué? '), q.why)
        );
      })),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn btn-primary', onclick: intro }, 'Hacer otro simulacro'),
        el('a', { class: 'btn', href: '#grammar/teoria' }, 'Repasar teoría')
      )
    );
    root.querySelector('h1').focus?.();
  }
}
