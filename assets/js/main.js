import { C, esc, flag, getCore, getPlayers, setCore, teamFlag, teamName } from './ui.js';
import * as home from './views/home.js';
import * as copas from './views/copas.js';
import * as copa from './views/copa.js';
import * as jogo from './views/jogo.js';
import * as artilheiros from './views/artilheiros.js';
import * as selecoes from './views/selecoes.js';
import * as selecao from './views/selecao.js';
import * as jogador from './views/jogador.js';
import * as estadios from './views/estadios.js';
import * as recordes from './views/recordes.js';

const app = document.getElementById('app');

const routes = [
  [/^$/, home, null],
  [/^copas$/, copas, 'copas'],
  [/^copa\/(\d{4})(?:\/(\w+))?$/, copa, 'copas'],
  [/^jogo\/(M-\d{4}-\d+)$/, jogo, 'copas'],
  [/^artilheiros$/, artilheiros, 'artilheiros'],
  [/^selecoes$/, selecoes, 'selecoes'],
  [/^selecao\/([A-Z]{3})$/, selecao, 'selecoes'],
  [/^jogador\/([\w-]+)$/, jogador, 'artilheiros'],
  [/^estadios$/, estadios, 'estadios'],
  [/^recordes$/, recordes, 'recordes'],
];

let lastPath = null;
async function router() {
  const path = location.hash.replace(/^#\/?/, '').replace(/\/$/, '');
  const route = routes.find(([re]) => re.test(path));
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', route && a.dataset.nav === route[2]));
  closeMenu();
  if (!route) {
    app.innerHTML = `<div class="wrap page"><h1 class="page-title">Impedimento!</h1><p class="page-lead">Essa página não existe. <a class="link-more" href="#/">Voltar ao início</a></p></div>`;
    return;
  }
  const params = path.match(route[0]).slice(1);
  // Trocar só a aba dentro da mesma edição não volta ao topo
  const samePage = lastPath && lastPath.split('/').slice(0, 2).join('/') === path.split('/').slice(0, 2).join('/');
  lastPath = path;
  try {
    await route[1].render(app, ...params);
    if (!samePage) window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    app.innerHTML = `<div class="wrap page"><h1 class="page-title">Bola fora</h1><p class="page-lead">Não foi possível carregar esta página. ${esc(err.message)}</p></div>`;
  }
}

// ---------- menu mobile
const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
function closeMenu() { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});

// ---------- faixa de placares (todas as finais)
function buildTicker() {
  const items = C.core.editions.map((e) => {
    const f = e.final;
    const note = f.ps ? ` (${f.ps[0]}–${f.ps[1]} pên.)` : f.et ? ' (prorr.)' : '';
    return `<span class="tick"><b>${e.y}</b>${flag(teamFlag(f.h, e.y), 'flag--sm')}${esc(teamName(f.h, e.y))}
      <span class="score">${f.hs}–${f.as}</span>${esc(teamName(f.a, e.y))}${flag(teamFlag(f.a, e.y), 'flag--sm')}<span class="muted">${note}</span></span>`;
  }).join('');
  document.getElementById('ticker').innerHTML = items + items;
}

// ---------- busca
const search = document.getElementById('search');
const input = document.getElementById('searchInput');
const results = document.getElementById('searchResults');
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let playerIndex = null;
let sel = 0;

async function openSearch() {
  search.hidden = false;
  input.value = '';
  results.innerHTML = '';
  input.focus();
  if (!playerIndex) {
    const players = await getPlayers();
    playerIndex = Object.entries(players).map(([pid, p]) => ({ pid, p, k: norm(p.n) }))
      .sort((a, b) => b.p.g - a.p.g || b.p.j - a.p.j);
  }
}
function closeSearch() { search.hidden = true; }
function doSearch() {
  const q = norm(input.value.trim());
  if (q.length < 2) { results.innerHTML = ''; return; }
  const out = [];
  C.core.editions.filter((e) => String(e.y).includes(q) || e.hosts.some((h) => norm(h[0]).includes(q)))
    .forEach((e) => out.push(`<a href="#/copa/${e.y}">${flag(e.hosts[0][1])}<span>Copa de ${e.y}</span><small>${esc(e.hosts.map((h) => h[0]).join(', '))}</small></a>`));
  Object.entries(C.core.teams).filter(([, t]) => norm(t.n).includes(q) || t.hist.some((h) => norm(h).includes(q)))
    .forEach(([code, t]) => out.push(`<a href="#/selecao/${code}">${flag(t.f)}<span>${esc(t.n)}</span><small>${t.years ? Object.keys(t.years).length : 0} Copas</small></a>`));
  (playerIndex || []).filter((x) => x.k.includes(q)).slice(0, 25).forEach(({ pid, p }) => {
    const t = C.core.teams[p.t[p.t.length - 1]];
    out.push(`<a href="#/jogador/${pid}">${t ? flag(t.f) : ''}<span>${esc(p.n)}</span><small>${p.g} gols · ${Object.keys(p.e).join(', ')}</small></a>`);
  });
  results.innerHTML = out.slice(0, 30).join('') || '<div class="empty">Nenhum resultado.</div>';
  sel = 0;
  results.querySelector('a')?.classList.add('sel');
}
input.addEventListener('input', doSearch);
input.addEventListener('keydown', (e) => {
  const links = [...results.querySelectorAll('a')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    links[sel]?.classList.remove('sel');
    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % Math.max(links.length, 1);
    links[sel]?.classList.add('sel');
    links[sel]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && links[sel]) {
    location.hash = links[sel].getAttribute('href');
    closeSearch();
  }
});
results.addEventListener('click', (e) => { if (e.target.closest('a')) closeSearch(); });
search.addEventListener('click', (e) => { if (e.target === search) closeSearch(); });
document.getElementById('searchBtn').addEventListener('click', openSearch);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !search.hidden) closeSearch();
  if (e.key === '/' && search.hidden && !/input|textarea|select/i.test(document.activeElement.tagName)) {
    e.preventDefault();
    openSearch();
  }
});

// ---------- início
(async () => {
  setCore(await getCore());
  buildTicker();
  window.addEventListener('hashchange', router);
  router();
})();
