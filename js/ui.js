// Reusable widgets: accessible tabs and a countdown timer.

import { el, formatTime, announce } from './util.js';
import { store } from './store.js';

let tabSeq = 0;

// tabs: [{ id, label, render: () => Node }]. Panels render lazily on first open.
export function makeTabs(tabs, { prefKey, initial } = {}) {
  const uid = `t${++tabSeq}`;
  const list = el('div', { class: 'tabs', role: 'tablist' });
  const panels = el('div', { class: 'tab-panels' });
  const buttons = new Map();
  const panelMap = new Map();

  for (const tab of tabs) {
    const button = el('button', {
      type: 'button', role: 'tab', class: 'tab', id: `${uid}-${tab.id}-tab`,
      'aria-controls': `${uid}-${tab.id}`, 'aria-selected': 'false', tabindex: '-1',
      onclick: () => select(tab.id, true)
    }, tab.label);
    const panel = el('div', { role: 'tabpanel', class: 'tab-panel', id: `${uid}-${tab.id}`, 'aria-labelledby': button.id, hidden: true, tabindex: '-1' });
    buttons.set(tab.id, button);
    panelMap.set(tab.id, panel);
    list.append(button);
    panels.append(panel);
  }

  list.addEventListener('keydown', (e) => {
    const ids = tabs.map((t) => t.id);
    const current = ids.findIndex((id) => buttons.get(id) === document.activeElement);
    if (current < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = (current + 1) % ids.length;
    if (e.key === 'ArrowLeft') next = (current - 1 + ids.length) % ids.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = ids.length - 1;
    if (next === null) return;
    e.preventDefault();
    select(ids[next], true);
    buttons.get(ids[next]).focus();
  });

  function select(id, user) {
    if (!buttons.has(id)) id = tabs[0].id;
    for (const tab of tabs) {
      const on = tab.id === id;
      const button = buttons.get(tab.id);
      const panel = panelMap.get(tab.id);
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
      if (on && !panel.dataset.ready) {
        panel.append(tab.render());
        panel.dataset.ready = '1';
      }
    }
    if (prefKey && user) store.pref(prefKey, id);
  }

  select(initial || (prefKey && store.pref(prefKey)) || tabs[0].id);
  return { node: el('div', { class: 'tabs-wrap' }, list, panels), select };
}

// Countdown timer. presets: minutes the user can pick from.
export function makeTimer({ presets, label, onFinish }) {
  let total = presets[0] * 60;
  let remaining = total;
  let endsAt = null;
  let tick = null;

  const display = el('div', { class: 'timer-display', role: 'timer', 'aria-label': label }, formatTime(remaining));
  const bar = el('div', { class: 'timer-bar' }, el('span'));
  const startBtn = el('button', { type: 'button', class: 'btn btn-primary', onclick: toggle }, 'Iniciar');
  const resetBtn = el('button', { type: 'button', class: 'btn', onclick: reset }, 'Reiniciar');
  const presetGroup = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Duración' },
    presets.map((m) => el('button', {
      type: 'button', class: 'seg', 'aria-pressed': String(m === presets[0]),
      onclick: (e) => {
        if (endsAt) return;
        total = m * 60;
        presetGroup.querySelectorAll('.seg').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
        reset();
      }
    }, `${m} min`))
  );

  function render() {
    display.textContent = formatTime(remaining);
    bar.firstChild.style.width = `${(1 - remaining / total) * 100}%`;
    display.classList.toggle('low', remaining <= 60 && remaining > 0);
    display.classList.toggle('done', remaining <= 0);
  }

  function toggle() {
    if (endsAt) {
      clearInterval(tick);
      remaining = Math.max(0, (endsAt - Date.now()) / 1000);
      endsAt = null;
      startBtn.textContent = 'Continuar';
      return;
    }
    if (remaining <= 0) reset();
    endsAt = Date.now() + remaining * 1000;
    startBtn.textContent = 'Pausar';
    tick = setInterval(step, 250);
  }

  function step() {
    remaining = Math.max(0, (endsAt - Date.now()) / 1000);
    render();
    if (remaining <= 0) {
      clearInterval(tick);
      endsAt = null;
      startBtn.textContent = 'Iniciar';
      beep();
      announce('¡Se acabó el tiempo!');
      onFinish?.();
    }
  }

  function reset() {
    clearInterval(tick);
    endsAt = null;
    remaining = total;
    startBtn.textContent = 'Iniciar';
    render();
  }

  render();
  return el('div', { class: 'timer' }, presets.length > 1 ? presetGroup : null, display, bar, el('div', { class: 'actions' }, startBtn, resetBtn));
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch { /* audio not available */ }
}
