import { C, esc, flag, getScorers, pageHead, playerLink, sortableTable, team, teamFlag } from '../ui.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export async function render(app) {
  const all = await getScorers();
  const { core } = C;
  document.title = 'Artilheiros — Almanaque das Copas';
  const teamsWithGoals = [...new Set(all.map((s) => s[2]))].sort((a, b) => core.teams[a].n.localeCompare(core.teams[b].n, 'pt'));
  const eds = core.editions;

  app.innerHTML = `<div class="wrap page">
    ${pageHead('Bola na rede', 'Artilheiros', `Os ${all.length.toLocaleString('pt-BR')} jogadores que já marcaram em Copas do Mundo. Gols contra não entram na conta; gols de pênalti durante o jogo, sim (disputas de pênaltis não contam).`)}

    <section>
      <div class="section__head"><h2 class="section__title">Artilheiros de cada Copa</h2></div>
      <div class="stickers" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
        ${[...eds].reverse().map((e) => {
          const best = e.top.filter((s) => s[3] === e.top[0][3]);
          return `<div class="sticker" style="cursor:default">
            <a href="#/copa/${e.y}/artilharia" class="sticker__year" style="font-size:36px">${e.y}</a>
            ${best.map((s) => `<div class="sticker__champ" style="font-size:16px;margin-top:6px">${flag(teamFlag(s[2], e.y), 'flag--sm')}${playerLink(s[0], s[1])}</div>`).join('')}
            <div class="sticker__score"><b style="color:var(--gold);font-size:16px">${best[0][3]}</b> gols</div>
          </div>`;
        }).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Ranking de todos os tempos</h2></div>
      <div class="filters">
        <input class="input" id="q" type="search" placeholder="Buscar jogador…" aria-label="Buscar jogador">
        <select class="select" id="t" aria-label="Filtrar por seleção"><option value="">Todas as seleções</option>
          ${teamsWithGoals.map((c) => `<option value="${c}">${esc(core.teams[c].n)}</option>`).join('')}</select>
        <select class="select" id="y" aria-label="Filtrar por Copa"><option value="">Todas as Copas</option>
          ${[...eds].reverse().map((e) => `<option value="${e.y}">${e.y}</option>`).join('')}</select>
      </div>
      <div id="table"></div>
    </section>
  </div>`;

  const max = all[0][3];
  const rows = all.map((s) => ({ pid: s[0], n: s[1], c: s[2], g: s[3], p: s[4], ne: s[5], ed: s[6], k: norm(s[1]) }));
  const table = sortableTable(document.getElementById('table'), [
    { key: 'rank', label: '#', cls: 'pos', render: (r, i) => i + 1 },
    { key: 'n', label: 'Jogador', sort: 'str', render: (r) => `<span class="strong">${playerLink(r.pid, r.n)}</span>` },
    { key: 'c', label: 'Seleção', sort: 'str', value: (r) => core.teams[r.c].n, render: (r) => team(r.c, null, { cls: 'flag--sm' }) },
    { key: 'g', label: 'Gols', sort: 'num', cls: 'r', render: (r) => `<span class="strong" style="color:var(--gold)">${r.g}</span>` },
    { key: 'bar', label: '', render: (r) => `<div class="goalbar"><i style="width:${(r.g / max) * 100}%"></i></div>` },
    { key: 'p', label: 'Pênaltis', sort: 'num', cls: 'r' },
    { key: 'ne', label: 'Copas c/ gol', sort: 'num', cls: 'r' },
    { key: 'ed', label: 'Gols por Copa', render: (r) => `<div class="pills">${Object.entries(r.ed).map(([y, g]) => `<span class="pill">${y} <b>${g}</b></span>`).join('')}</div>` },
  ], rows, { sortKey: 'g', limit: 50, rowClass: (r, i) => (i < 3 ? `top${i + 1}` : '') });

  const apply = () => {
    const q = norm(document.getElementById('q').value.trim());
    const t = document.getElementById('t').value;
    const y = document.getElementById('y').value;
    let list = rows.filter((r) => (!q || r.k.includes(q)) && (!t || r.c === t));
    if (y) list = list.filter((r) => r.ed[y]).map((r) => ({ ...r, g: r.ed[y], ed: { [y]: r.ed[y] } }));
    table.update(list);
  };
  ['q', 't', 'y'].forEach((id) => document.getElementById(id).addEventListener('input', apply));
}
