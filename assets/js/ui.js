// Utilitários compartilhados: carregamento de dados, formatação e pedaços de HTML.

const cache = new Map();
export function load(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then((r) => {
      if (!r.ok) throw new Error(`Falha ao carregar ${path}`);
      return r.json();
    }));
  }
  return cache.get(path);
}
export const getCore = () => load('data/core.json');
export const getEdition = (y) => load(`data/copas/${y}.json`);
export const getPlayers = () => load('data/players.json');
export const getRecords = () => load('data/records.json');
export const getStadiums = () => load('data/stadiums.json');
export const getScorers = () => load('data/scorers.json');

// O "core" é carregado uma vez no início e fica disponível aqui.
export const C = { core: null, ed: {} };
export function setCore(core) {
  C.core = core;
  core.editions.forEach((e) => { C.ed[e.y] = e; });
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => Number(n).toLocaleString('pt-BR');
export const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function fmtDate(iso, long = false) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return long ? `${d} de ${['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][m - 1]} de ${y}`
    : `${d} ${MONTHS[m - 1]} ${y}`;
}
export function age(birth, on = new Date().toISOString().slice(0, 10)) {
  if (!birth) return null;
  const [by, bm, bd] = birth.split('-').map(Number);
  const [y, m, d] = on.split('-').map(Number);
  return y - by - ((m < bm || (m === bm && d < bd)) ? 1 : 0);
}

export function flagSrc(iso) {
  if (!iso) return '';
  return iso.startsWith('local:') ? `assets/flags/${iso.slice(6)}.svg` : `https://flagcdn.com/${iso}.svg`;
}
export function flag(iso, cls = '', alt = '') {
  return `<img class="flag ${cls}" src="${flagSrc(iso)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
}

// Nome e bandeira da seleção. Com o ano, usa o nome da época (ex.: Alemanha Ocidental).
export function teamName(code, y) {
  const n = y && C.ed[y]?.names?.[code];
  return n ? n[0] : (C.core.teams[code]?.n ?? code);
}
export function teamFlag(code, y) {
  const n = y && C.ed[y]?.names?.[code];
  return n ? n[1] : C.core.teams[code]?.f;
}
export function team(code, y, { cls = '', link = true, short = false } = {}) {
  if (!code) return '<span class="muted">—</span>';
  const name = teamName(code, y);
  const inner = `${flag(teamFlag(code, y), cls)}<span>${esc(short ? code : name)}</span>`;
  return link ? `<a class="team" href="#/selecao/${code}">${inner}</a>` : `<span class="team">${inner}</span>`;
}
export const playerLink = (pid, name) => pid ? `<a href="#/jogador/${pid}">${esc(name)}</a>` : esc(name);
export const stars = (n) => n ? `<span class="stars" aria-label="${n} títulos">${'★'.repeat(n)}</span>` : '';
export const stageName = (k) => C.core.stages[k] ?? k;
export const yearsSuffix = (ys) => ys.length ? ys.join(' · ') : '';

// Placar de um jogo em texto (com prorrogação e pênaltis)
export function scoreTxt(m) {
  return `${m.hs}–${m.as}`;
}
export function scoreNote(m) {
  if (m.ps) return `pên. ${m.ps[0]}–${m.ps[1]}`;
  if (m.et) return 'prorr.';
  return '';
}
// Placar da final do ponto de vista do campeão: "3–0", "3–3 (4–2 pên.)"
export function champScore(e) {
  const f = e.final;
  const home = f.h === e.champ;
  const sc = home ? `${f.hs}–${f.as}` : `${f.as}–${f.hs}`;
  if (f.ps) return `${sc} (${home ? f.ps[0] : f.ps[1]}–${home ? f.ps[1] : f.ps[0]} pên.)`;
  return f.et ? `${sc} prorr.` : sc;
}
export function winnerSide(m) {
  if (m.hs !== m.as) return m.hs > m.as ? 'h' : 'a';
  if (m.ps) return m.ps[0] > m.ps[1] ? 'h' : 'a';
  return null;
}
export const matchUrl = (id) => `#/jogo/${id}`;
export const yearOfMatch = (id) => Number(id.split('-')[1]);

// Linha de jogo usada nas listas
export function matchRow(m, y, { meta = true } = {}) {
  const w = winnerSide(m);
  const note = scoreNote(m);
  return `<a class="match" href="${matchUrl(m.id)}">
    <div class="match__meta">${meta ? `${fmtDate(m.d)}<br>${esc(m.g || stageName(m.st))}` : ''}</div>
    <div class="match__team match__team--h ${w === 'a' ? 'lose' : ''}"><span>${esc(teamName(m.h, y))}</span>${flag(teamFlag(m.h, y))}</div>
    <div class="match__score">${scoreTxt(m)}${note ? `<small>${note}</small>` : ''}</div>
    <div class="match__team ${w === 'h' ? 'lose' : ''}">${flag(teamFlag(m.a, y))}<span>${esc(teamName(m.a, y))}</span></div>
    <div class="match__go" aria-hidden="true">›</div>
  </a>`;
}

// Tabela ordenável simples: cols = [{key, label, cls, sort:'num'|'str', render(row)}]
export function sortableTable(el, cols, rows, { sortKey, desc = true, limit = 0, rowClass } = {}) {
  let key = sortKey ?? cols.find((c) => c.sort)?.key;
  let dir = desc ? -1 : 1;
  let shown = limit;
  const draw = () => {
    const col = cols.find((c) => c.key === key);
    const val = (r) => (col?.value ? col.value(r) : r[key]);
    const sorted = col ? [...rows].sort((a, b) => {
      const va = val(a); const vb = val(b);
      return (col.sort === 'str' ? String(va).localeCompare(String(vb), 'pt') : (va - vb)) * dir;
    }) : rows;
    const list = shown ? sorted.slice(0, shown) : sorted;
    el.innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr>${cols.map((c) =>
      `<th class="${c.cls || ''} ${c.key === key ? `sorted ${dir > 0 ? 'asc' : ''}` : ''}" ${c.sort ? `data-sort="${c.key}" tabindex="0" aria-sort="${c.key === key ? (dir > 0 ? 'ascending' : 'descending') : 'none'}"` : ''}>${c.label}</th>`).join('')}
      </tr></thead><tbody>${list.map((r, i) => `<tr class="${rowClass ? rowClass(r, i) : ''}">${cols.map((c) =>
        `<td class="${c.cls || ''}">${c.render ? c.render(r, i) : esc(r[c.key])}</td>`).join('')}</tr>`).join('') ||
        `<tr><td colspan="${cols.length}" class="empty">Nada encontrado.</td></tr>`}</tbody></table></div>
      ${shown && sorted.length > shown ? `<div class="more-row"><button class="btn" data-more>Mostrar mais (${fmt(sorted.length - shown)})</button></div>` : ''}`;
    el.querySelectorAll('th[data-sort]').forEach((th) => {
      const go = () => {
        const k = th.dataset.sort;
        if (k === key) dir = -dir; else { key = k; dir = cols.find((c) => c.key === k).sort === 'str' ? 1 : -1; }
        draw();
      };
      th.addEventListener('click', go);
      th.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
    el.querySelector('[data-more]')?.addEventListener('click', () => { shown += limit; draw(); });
  };
  draw();
  return { update(newRows) { rows = newRows; shown = limit; draw(); } };
}

// Abas acessíveis: tabs = [{id, label}], onChange(id)
export function tabs(el, list, onChange, current) {
  el.innerHTML = list.map((t) => `<button class="tab" role="tab" data-tab="${t.id}" aria-selected="${t.id === current}">${t.label}</button>`).join('');
  el.setAttribute('role', 'tablist');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    el.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    onChange(b.dataset.tab);
  });
  onChange(current);
}

export const pageHead = (kicker, title, lead = '') => `
  <span class="kicker">${kicker}</span>
  <h1 class="page-title">${title}</h1>
  ${lead ? `<p class="page-lead">${lead}</p>` : ''}`;

export const resultClass = (label) => ({
  'Campeão': 'r100', 'Vice-campeão': 'r90', '3º lugar': 'r80', '4º lugar': 'r70',
}[label] || '');

// Peso da campanha para colorir a faixa de participações
export function resultWeight(label) {
  const map = { 'Campeão': 100, 'Vice-campeão': 90, '3º lugar': 80, '4º lugar': 70, 'Semifinal': 65, 'Quadrangular final': 60,
    'Quartas de final': 50, '2ª fase de grupos': 45, 'Oitavas de final': 40, '16 avos de final': 30, 'Fase de grupos': 10 };
  return map[label] ?? 10;
}
