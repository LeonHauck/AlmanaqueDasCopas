import { C, esc, flag, fmt, fmtDate, getEdition, playerLink, scoreNote, stageName, teamFlag, teamName, winnerSide, yearOfMatch } from '../ui.js';

const minuteKey = (s) => {
  const [a, b] = s.replace("'", '').split('+').map(Number);
  return a + (b || 0) / 100;
};

export async function render(app, id) {
  const y = yearOfMatch(id);
  const d = await getEdition(y);
  const m = d.matches.find((x) => x.id === id);
  if (!m) throw new Error('Jogo não encontrado.');
  const st = d.stadiums.find((s) => s.id === m.sid);
  const w = winnerSide(m);
  const H = teamName(m.h, y);
  const A = teamName(m.a, y);
  document.title = `${H} ${m.hs}–${m.as} ${A} (${y}) — Almanaque das Copas`;

  // linha do tempo: gols e cartões vermelhos/amarelos em ordem
  const events = [
    ...m.goals.map((g) => ({ ...g, type: 'goal' })),
    ...m.cards.map((c) => ({ ...c, type: 'card' })),
  ].sort((a, b) => minuteKey(a.min) - minuteKey(b.min));
  const evHTML = (ev) => {
    if (ev.type === 'goal') {
      const tag = ev.og ? ' <span class="muted">(contra)</span>' : ev.pen ? ' <span class="muted">(pên.)</span>' : '';
      return `<span class="ico" aria-label="Gol">⚽</span> ${playerLink(ev.pid, ev.n)}${tag}`;
    }
    const cls = { Y: 'card-y', R: 'card-r', YR: 'card-yr' }[ev.k];
    const lab = { Y: 'Cartão amarelo', R: 'Cartão vermelho', YR: 'Segundo amarelo' }[ev.k];
    return `<span class="${cls}" role="img" aria-label="${lab}"></span> ${playerLink(ev.pid, ev.n)}`;
  };
  const timeline = events.map((ev) => `<div class="tl">
      <div class="tl__h">${ev.s === 'h' ? evHTML(ev) : ''}</div>
      <div class="tl__min">${ev.min}</div>
      <div>${ev.s === 'a' ? evHTML(ev) : ''}</div></div>`).join('');

  const lineup = (side) => {
    const list = m.lu[side];
    if (!list.length) return '';
    const row = (p) => `<li><span class="no">${p.no || ''}</span><span>${playerLink(p.pid, p.n)} <span class="sub">${C.core.positions[p.pos] ?? ''}</span></span>
      <span class="sub">${m.goals.filter((g) => g.pid === p.pid && !g.og).map(() => '⚽').join('')}${p.on ? ` ↑ ${p.on}` : ''}</span></li>`;
    return `<div class="card lineup"><h3 class="team">${flag(teamFlag(m[side], y), 'flag--lg')}<span>${esc(teamName(m[side], y))}</span></h3>
      <h5>Titulares</h5><ul>${list.filter((p) => p.st).map(row).join('')}</ul>
      ${list.some((p) => !p.st) ? `<h5>Entraram</h5><ul>${list.filter((p) => !p.st).map(row).join('')}</ul>` : ''}</div>`;
  };

  const shootout = m.pens.length ? `<div class="card" style="margin-top:22px"><h3>Disputa de pênaltis · ${m.ps[0]}–${m.ps[1]}</h3>
    <div class="grid grid-2">${['h', 'a'].map((s) => `<div><div class="team" style="margin-bottom:10px">${flag(teamFlag(m[s], y))}<b>${esc(teamName(m[s], y))}</b></div>
      ${m.pens.filter((p) => p.s === s).map((p) => `<div style="display:flex;gap:8px;align-items:center;padding:3px 0;font-size:14px">
        <span class="shootout"><i class="${p.ok ? 'ok' : 'no'}"></i></span>${esc(p.n)} <span class="muted">${p.ok ? 'converteu' : 'perdeu'}</span></div>`).join('')}</div>`).join('')}
    </div></div>` : '';

  const facts = [
    ['Data', `${fmtDate(m.d, true)}${m.t ? ` · ${m.t}` : ''}`],
    ['Fase', esc(m.g || stageName(m.st)) + (m.rep ? ' (jogo-desempate)' : '')],
    ['Estádio', st ? `${esc(st.n)}` : '—'],
    ['Cidade', st ? `${esc(st.city)}, ${esc(st.country)}` : '—'],
  ];
  if (m.att) facts.push(['Público', fmt(m.att)]);

  app.innerHTML = `
  <section class="matchhero">
    <div class="matchhero__inner">
      <div class="matchhero__meta"><a href="#/copa/${y}">Copa de ${y}</a> · ${esc(stageName(m.st))}${m.g ? ` · ${esc(m.g)}` : ''}</div>
      <div class="board">
        <a class="board__team board__team--h ${w === 'a' ? 'lose' : ''}" href="#/selecao/${m.h}">${flag(teamFlag(m.h, y), 'flag--xl')}<span>${esc(H)}</span></a>
        <div class="board__score">${m.hs}–${m.as}${scoreNote(m) ? `<small>${scoreNote(m)}</small>` : ''}</div>
        <a class="board__team board__team--a ${w === 'h' ? 'lose' : ''}" href="#/selecao/${m.a}">${flag(teamFlag(m.a, y), 'flag--xl')}<span>${esc(A)}</span></a>
      </div>
      <div class="facts">${facts.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
    </div>
  </section>
  <div class="wrap page">
    ${events.length ? `<section><div class="section__head"><h2 class="section__title">Lance a lance</h2></div><div class="card"><div class="timeline">${timeline}</div></div></section>`
      : '<p class="empty">Jogo sem gols.</p>'}
    ${shootout}
    ${m.lu.h.length ? `<section class="section"><div class="section__head"><h2 class="section__title">Escalações</h2></div>
      <div class="lineups">${lineup('h')}${lineup('a')}</div></section>`
      : '<p class="note">Escalações detalhadas disponíveis a partir da Copa de 1970.</p>'}
    <p style="margin-top:30px"><a class="link-more" href="#/copa/${y}/jogos">Todos os jogos de ${y}</a></p>
  </div>`;
}
