import { C, champScore, esc, flag, fmtDate, pageHead, teamFlag, teamName } from '../ui.js';

export async function render(app) {
  const eds = [...C.core.editions].reverse();
  document.title = 'As Copas — Almanaque das Copas';
  app.innerHTML = `<div class="wrap page">
    ${pageHead('1930 — ' + eds[0].y, 'Todas as Copas', 'Escolha uma edição para ver os jogos, a tabela, o chaveamento, os artilheiros, os prêmios e os estádios.')}
    <div class="grid grid-auto" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">
      ${eds.map((e) => {
        const top = e.top.filter((s) => s[3] === e.top[0][3]);
        return `<a class="card sticker" href="#/copa/${e.y}" style="padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
            <div><div class="sticker__year" style="font-size:58px">${e.y}</div>
            <div class="sticker__host">${e.hosts.map((h) => flag(h[1], 'flag--sm')).join('')}<span>${esc(e.hosts.map((h) => h[0]).join(' / '))}</span></div></div>
            <span class="badge badge--ghost">${e.nt} seleções</span>
          </div>
          <div class="podium__item p1" style="margin:6px 0 12px"><small>Campeão</small>
            <div class="team">${flag(teamFlag(e.champ, e.y), 'flag--lg')}<span>${esc(teamName(e.champ, e.y))}</span></div></div>
          <div class="muted" style="font-size:13.5px;display:grid;gap:3px">
            <div>${e.final.fr ? 'Decidida em quadrangular final' : `Final: <b style="color:var(--text)">${esc(teamName(e.champ, e.y))} ${champScore(e)} ${esc(teamName(e.ru, e.y))}</b>`}</div>
            <div>Artilharia: <b style="color:var(--text)">${top.map((s) => esc(s[1])).join(', ')}</b> (${top[0][3]} gols)</div>
            <div>${e.nm} jogos · ${e.ng} gols · ${String(e.avg).replace('.', ',')} por jogo</div>
            <div>${fmtDate(e.start)} a ${fmtDate(e.end)}</div>
          </div>
        </a>`;
      }).join('')}
    </div>
  </div>`;
}
