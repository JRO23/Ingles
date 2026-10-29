// Progress lives only in this browser (localStorage). Every access is guarded
// because storage can be blocked (private mode, disabled site data).

const KEY = 'gv5-review-v1';

const empty = () => ({
  ex: {},        // exercise id -> { best, total, attempts }
  cards: {},     // word -> 'known' | 'review'
  quiz: {},      // quiz id -> { best, total }
  exams: [],     // { date, grammar, vocab }
  essays: [],    // { date, topic, words }
  speaking: 0,   // finished speaking timer sessions
  draft: { topic: '', text: '', checks: [] },
  prefs: {}
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

export const store = {
  get: () => state,
  update(fn) { fn(state); save(); },
  recordScore(bucket, id, correct, total) {
    this.update((s) => {
      const prev = s[bucket][id] || { best: 0, total, attempts: 0 };
      s[bucket][id] = { best: Math.max(prev.best, correct), total, attempts: prev.attempts + 1 };
    });
  },
  pref(key, value) {
    if (value === undefined) return state.prefs[key];
    this.update((s) => { s.prefs[key] = value; });
  },
  reset() { state = empty(); save(); }
};
