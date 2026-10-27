import { C, esc, fmtDate, flag, getEdition, getPlayers, matchUrl, scoreNote, team, teamFlag, teamName } from '../ui.js';

export async function render(app, pid) {
  const players = await getPlayers();
  const p = players[pid];
  if (!p) throw new Error('Jogador não encontrado.');
  const { core } = C;
  document.title = `${p.n} — Almanaque das Copas`;
  const years = Object.keys(p.e).map(Number);
  const maxG = Math.max(1, ...years.map((y) => p.e[y][1]));
  const awards = [];
  core.editions.forEach((e) => Object.entries(e.aw).forEach(([k, list]) => list.forEach((w) => {
    if (w[0] === pid) awards.push([e.y, core.awards[k]]);
  })));
  const champ = years.filter((y) => C.ed[y].champ === edTeam(p, y));
  const onlyPre70 = years.every((y) => y < 1970);
  const initials = p.n.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  app.innerHTML = `<div class="wrap page">
    <div class="player-hero">
      <div class="shirt" aria-hidden="true">${esc(initials)}</div>
      <div>
        <span class="kicker">${esc(core.positions[p.p] || 'Jogador')}</span>
        <h1 class="page-title" style="margin:6px 0 8px">${esc(p.n)}</h1>
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
          ${p.t.map((c) => team(c, null, { cls: 'flag--lg' })).join('')}
          ${p.b ? `<span class="muted">Nascido em ${fmtDate(p.b, true)}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="stats" style="margin-top:28px">
      <div class="stat stat--gold"><div class="stat__value">${p.g}</div><div class="stat__label">Gols</div></div>
      <div class="stat"><div class="stat__value">${years.length}</div><div class="stat__label">${years.length === 1 ? 'Copa' : 'Copas'}</div></div>
      <div class="stat"><div class="stat__value">${onlyPre70 ? '—' : p.j}</div><div class="stat__label">Jogos${years.some((y) => y < 1970) && !onlyPre70 ? ' (desde 1970)' : ''}</div></div>
      <div class="stat"><div class="stat__value">${p.gp}</div><div class="stat__label">De pênalti</div></div>
      <div class="stat"><div class="stat__value">${champ.length}</div><div class="stat__label">${champ.length === 1 ? 'Título' : 'Títulos'}</div></div>
      <div class="stat"><div class="stat__value">${p.ca[0]}<span class="muted" style="font-size:24px"> / ${p.ca[1]}</span></div><div class="stat__label">Amarelos / vermelhos</div></div>
    </div>

    ${awards.length ? `<section class="section"><div class="section__head"><h2 class="section__title">Prêmios</h2></div>
      <div class="pills">${awards.map(([y, a]) => `<span class="pill" style="font-size:14px;padding:5px 10px">🏆 ${esc(a)} <b>${y}</b></span>`).join('')}</div></section>` : ''}

    <section class="section">
      <div class="section__head"><h2 class="section__title">Copa a Copa</h2></div>
      <div class="card"><div class="ed-bars">${years.map((y) => {
        const [j, g] = p.e[y];
        const t = edTeam(p, y);
        return `<div class="ed-bar"><a class="ed-bar__y" href="#/copa/${y}">${y}</a>
          <div class="ed-bar__track" title="${g} gols"><i style="width:${(g / maxG) * 100}%"></i></div>
          <span>${t ? flag(teamFlag(t, y), 'flag--sm') : ''} <b>${g}</b> ${g === 1 ? 'gol' : 'gols'}${y >= 1970 ? ` · ${j} ${j === 1 ? 'jogo' : 'jogos'}` : ''}${champ.includes(y) ? ' <span title="Campeão" style="color:var(--gold)">★</span>' : ''}</span></div>`;
      }).join('')}</div>
      ${years.some((y) => y < 1970) ? '<p class="note">Escalações (e, portanto, número de jogos) estão disponíveis a partir de 1970.</p>' : ''}</div>
    </section>

    ${p.g ? `<section class="section"><div class="section__head"><h2 class="section__title">Todos os gols</h2></div><div class="matches" id="goals"><div class="loading" style="min-height:120px"><div class="ball"></div></div></div></section>` : ''}
  </div>`;

  if (!p.g) return;
  const goalYears = years.filter((y) => p.e[y][1]);
  const eds = await Promise.all(goalYears.map((y) => getEdition(y)));
  const rows = [];
  eds.forEach((d, i) => {
    const y = goalYears[i];
    d.matches.forEach((m) => {
      const mine = m.goals.filter((g) => g.pid === pid && !g.og);
      if (!mine.length) return;
      const opp = mine[0].c === m.h ? m.a : m.h;
      rows.push(`<a class="match" href="${matchUrl(m.id)}" style="grid-template-columns:70px 1fr auto 26px">
        <div class="match__meta"><b style="color:var(--gold);font-size:18px">${y}</b><br>${fmtDate(m.d)}</div>
        <div class="match__team">${mine.map((g) => `<span class="pill">${g.min}${g.pen ? ' pên.' : ''}</span>`).join(' ')}
          <span class="muted">vs</span> ${flag(teamFlag(opp, y), 'flag--sm')}<span>${esc(teamName(opp, y))}</span></div>
        <div class="match__score">${m.hs}–${m.as}${scoreNote(m) ? `<small>${scoreNote(m)}</small>` : ''}</div>
        <div class="match__go">›</div></a>`);
    });
  });
  document.getElementById('goals').innerHTML = rows.join('');
}

// Seleção do jogador naquela Copa (quase sempre a mesma; alguns poucos mudaram de país)
function edTeam(p, y) {
  return p.ey?.[y] || p.t[p.t.length - 1];
}
