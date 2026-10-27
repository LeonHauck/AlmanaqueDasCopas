import { C, esc, flag, pageHead, sortableTable, stars, team } from '../ui.js';

const CONFS = { UEFA: 'Europa', CONMEBOL: 'América do Sul', CONCACAF: 'América do Norte/Central', CAF: 'África', AFC: 'Ásia', OFC: 'Oceania' };
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function render(app) {
  const { core } = C;
  document.title = 'Seleções — Almanaque das Copas';
  const rows = Object.entries(core.teams).map(([code, t]) => ({
    code, ...t, apps: Object.keys(t.years).length, nt: t.titles.length, pts: t.w * 3 + t.d, sg: t.gf - t.ga,
    k: norm(t.n + ' ' + t.hist.join(' ')),
  }));
  const confsUsed = Object.keys(CONFS).filter((c) => rows.some((r) => r.conf === c));

  app.innerHTML = `<div class="wrap page">
    ${pageHead(`${rows.length} seleções`, 'Seleções', 'Todas as seleções que já disputaram uma Copa do Mundo. Clique em uma para ver a história completa: campanhas, artilheiros e jogos.')}
    <div class="filters">
      <input class="input" id="q" type="search" placeholder="Buscar seleção…" aria-label="Buscar seleção">
      <div class="chips" id="conf"><button class="chip on" data-c="">Todas</button>
        ${confsUsed.map((c) => `<button class="chip" data-c="${c}" title="${CONFS[c]}">${c}</button>`).join('')}</div>
      <div class="chips" id="view" style="margin-left:auto"><button class="chip on" data-v="cards">Cartões</button><button class="chip" data-v="table">Ranking</button></div>
    </div>
    <div id="out"></div>
    <p class="note">Ranking histórico: vitória = 3 pontos, empate = 1. Jogos decididos nos pênaltis contam como empate, como faz a FIFA.
    A Alemanha inclui a Alemanha Ocidental, e a RD Congo inclui o Zaire.</p>
  </div>`;

  const out = document.getElementById('out');
  let view = 'cards';
  let conf = '';
  let table = null;

  const filtered = () => {
    const q = norm(document.getElementById('q').value.trim());
    return rows.filter((r) => (!conf || r.conf === conf) && (!q || r.k.includes(q)));
  };
  const draw = () => {
    const list = filtered();
    if (view === 'cards') {
      table = null;
      const sorted = [...list].sort((a, b) => b.nt - a.nt || b.bw - a.bw || b.apps - a.apps || a.n.localeCompare(b.n, 'pt'));
      out.innerHTML = sorted.length ? `<div class="teamcards">${sorted.map((r) => `
        <a class="teamcard" href="#/selecao/${r.code}">${flag(r.f, 'flag--lg')}
          <div><h3>${esc(r.n)} ${stars(r.nt)}</h3>
          <p>${r.apps} ${r.apps === 1 ? 'Copa' : 'Copas'} · melhor campanha: <b style="color:var(--text-2)">${esc(r.best)}</b></p></div>
        </a>`).join('')}</div>` : '<p class="empty">Nenhuma seleção encontrada.</p>';
      return;
    }
    if (table) { table.update(list); return; }
    table = sortableTable(out, [
      { key: 'rank', label: '#', cls: 'pos', render: (r, i) => i + 1 },
      { key: 'n', label: 'Seleção', sort: 'str', render: (r) => `<span class="strong">${team(r.code)}</span>` },
      { key: 'nt', label: 'Títulos', sort: 'num', cls: 'c', render: (r) => (r.nt ? `<span class="stars" style="font-size:13px">${'★'.repeat(r.nt)}</span>` : '') },
      { key: 'apps', label: 'Copas', sort: 'num', cls: 'r' },
      { key: 'p', label: 'J', sort: 'num', cls: 'r' },
      { key: 'w', label: 'V', sort: 'num', cls: 'r' },
      { key: 'd', label: 'E', sort: 'num', cls: 'r' },
      { key: 'l', label: 'D', sort: 'num', cls: 'r' },
      { key: 'gf', label: 'GP', sort: 'num', cls: 'r' },
      { key: 'ga', label: 'GC', sort: 'num', cls: 'r' },
      { key: 'sg', label: 'SG', sort: 'num', cls: 'r', render: (r) => (r.sg > 0 ? '+' : '') + r.sg },
      { key: 'pts', label: 'Pts', sort: 'num', cls: 'r', render: (r) => `<span class="strong">${r.pts}</span>` },
      { key: 'bw', label: 'Melhor campanha', sort: 'num', render: (r) => esc(r.best) },
    ], list, { sortKey: 'pts', rowClass: (r, i) => (i < 3 ? `top${i + 1}` : '') });
  };

  document.getElementById('q').addEventListener('input', draw);
  document.getElementById('conf').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    conf = b.dataset.c;
    document.querySelectorAll('#conf .chip').forEach((c) => c.classList.toggle('on', c === b));
    draw();
  });
  document.getElementById('view').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    view = b.dataset.v;
    document.querySelectorAll('#view .chip').forEach((c) => c.classList.toggle('on', c === b));
    draw();
  });
  draw();
}
