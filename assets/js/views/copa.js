import {
  C, esc, flag, fmt, fmtDate, getEdition, matchRow, matchUrl, playerLink, plural, sortableTable, stageName,
  tabs, team, teamName, winnerSide,
} from '../ui.js';
import { makeMap } from './estadios.js';

const KO = ['round of 32', 'round of 16', 'quarter-finals', 'semi-finals', 'final'];
const STAGE_ORDER = ['group stage', 'round of 32', 'round of 16', 'second group stage', 'quarter-finals', 'semi-finals', 'final round', 'third-place match', 'final'];
const AWARD_ICON = {
  bola_ouro: ['⚽', 't-gold'], bola_prata: ['⚽', 't-silver'], bola_bronze: ['⚽', 't-bronze'],
  chuteira_ouro: ['👟', 't-gold'], chuteira_prata: ['👟', 't-silver'], chuteira_bronze: ['👟', 't-bronze'],
  luva_ouro: ['🧤', 't-gold'], jovem: ['⭐', 't-green'],
};

export async function render(app, yStr, tab = 'jogos') {
  const y = Number(yStr);
  const e = C.ed[y];
  if (!e) throw new Error('Edição não encontrada.');
  const d = await getEdition(y);
  const years = C.core.editions.map((x) => x.y);
  const i = years.indexOf(y);
  const prev = years[i - 1];
  const next = years[i + 1];
  document.title = `Copa de ${y} — Almanaque das Copas`;

  const place = (pos, code, cls) => `<div class="podium__item ${cls}"><small>${pos}</small>${code ? team(code, y, { cls: 'flag--lg' }) : '<span class="muted">—</span>'}</div>`;
  const facts = [
    ['Seleções', e.nt], ['Jogos', e.nm], ['Gols', e.ng], ['Média', String(e.avg).replace('.', ',')],
    ['Estádios', e.nst], ['Cidades', e.ncity], ['Cartões vermelhos', e.y < 1970 ? '—' : e.red],
    ['Disputas de pênaltis', e.pso],
  ];
  if (e.att) facts.push(['Público total', fmt(e.att)]);
  if (e.coach.length) facts.push(['Técnico campeão', esc(e.coach.join(', '))]);

  app.innerHTML = `
  <section class="ed-hero" data-year="${y}">
    <div class="ed-hero__inner">
      <div class="ed-nav">
        ${prev ? `<a href="#/copa/${prev}">← ${prev}</a>` : '<span></span>'}
        <a href="#/copas">Todas as Copas</a>
        ${next ? `<a href="#/copa/${next}">${next} →</a>` : '<span></span>'}
      </div>
      <span class="kicker">${fmtDate(e.start, true)} — ${fmtDate(e.end, true)}</span>
      <h1 class="page-title">Copa do Mundo de ${y}</h1>
      <div class="ed-hosts">${e.hosts.map((h) => `<span class="team">${flag(h[1], 'flag--lg')}<span>${esc(h[0])}</span></span>`).join('<span class="muted">·</span>')}</div>
      <p class="story">${esc(e.story)}</p>
      <div class="podium">
        ${place('Campeão', e.champ, 'p1')}${place('Vice-campeão', e.ru, 'p2')}${place('3º lugar', e.third, 'p3')}${place('4º lugar', e.fourth, 'p4')}
      </div>
      <div class="facts">${facts.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
    </div>
  </section>
  <div class="wrap page" style="padding-top:0">
    <div class="tabs" id="tabs"></div>
    <div id="tabBody"></div>
  </div>`;

  const body = document.getElementById('tabBody');
  const hasKO = d.matches.some((m) => m.st === 'semi-finals');
  const list = [
    { id: 'jogos', label: 'Jogos' },
    ...(hasKO ? [{ id: 'chave', label: 'Chaveamento' }] : []),
    ...(Object.keys(d.groups).length ? [{ id: 'grupos', label: 'Grupos' }] : []),
    { id: 'artilharia', label: 'Artilharia' },
    { id: 'premios', label: 'Prêmios' },
    { id: 'estadios', label: 'Estádios' },
  ];
  if (!list.some((t) => t.id === tab)) tab = 'jogos';
  tabs(document.getElementById('tabs'), list, (id) => {
    history.replaceState(null, '', `#/copa/${y}/${id}`);
    ({ jogos, chave: bracket, grupos: groups, artilharia: scorers, premios: awards, estadios: stadiums })[id](body, d, e);
  }, tab);
}

function jogos(el, d, e) {
  const stages = STAGE_ORDER.filter((s) => d.matches.some((m) => m.st === s));
  const groupNames = [...new Set(d.matches.filter((m) => m.st === 'group stage').map((m) => m.g))].sort();
  el.innerHTML = `
    <div class="filters"><div class="chips" id="chips">
      <button class="chip on" data-f="all">Todos</button>
      ${stages.map((s) => `<button class="chip" data-f="${s}">${stageName(s)}</button>`).join('')}
    </div></div>
    <div id="list"></div>`;
  const draw = (f) => {
    const html = stages.filter((s) => f === 'all' || f === s).map((s) => {
      const ms = d.matches.filter((m) => m.st === s);
      if (s === 'group stage' && groupNames.length > 1) {
        return groupNames.map((g) => `<h3 class="stage-title">${esc(g)}</h3><div class="matches">${ms.filter((m) => m.g === g).map((m) => matchRow(m, e.y)).join('')}</div>`).join('');
      }
      return `<h3 class="stage-title">${stageName(s)}</h3><div class="matches">${ms.map((m) => matchRow(m, e.y)).join('')}</div>`;
    }).join('');
    el.querySelector('#list').innerHTML = html;
  };
  el.querySelector('#chips').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-f]');
    if (!b) return;
    el.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === b));
    draw(b.dataset.f);
  });
  draw('all');
}

// Monta o chaveamento de trás para frente, a partir da final, para alinhar os confrontos.
function bracket(el, d, e) {
  const by = (s) => d.matches.filter((m) => m.st === s);
  const winner = (m) => { const w = winnerSide(m); return w ? m[w] : null; };
  const final = by('final')[0];
  const cols = [[final]];
  for (let k = KO.indexOf('final') - 1; k >= 0; k--) {
    const pool = by(KO[k]);
    if (!pool.length) break;
    const next = [];
    for (const m of cols[0]) {
      for (const c of [m.h, m.a]) {
        const src = pool.find((x) => winner(x) === c);
        if (src) next.push(src);
      }
    }
    if (!next.length) break;
    cols.unshift(next);
  }
  const startK = KO.length - cols.length;
  const third = by('third-place match')[0];
  const card = (m, cls = '') => {
    const w = winnerSide(m);
    const row = (side) => `<div class="bm__row ${w === side ? 'w' : w ? 'l' : ''}">${team(m[side], e.y, { link: false, cls: 'flag--sm' })}
      <b>${side === 'h' ? m.hs : m.as}${m.ps ? `<sup> (${side === 'h' ? m.ps[0] : m.ps[1]})</sup>` : ''}</b></div>`;
    return `<a class="bm ${cls}" href="${matchUrl(m.id)}">${row('h')}${row('a')}</a>`;
  };
  el.innerHTML = `<div class="bracket">${cols.map((col, i) => `
    <div class="bracket__col"><h4>${stageName(KO[startK + i])}</h4><div class="bracket__slots">
      ${col.map((m) => `<div class="bracket__slot">${card(m, KO[startK + i] === 'final' ? 'bm--final' : '')}
        ${KO[startK + i] === 'final' && third ? `<h4 style="margin-top:22px">${stageName('third-place match')}</h4>${card(third)}` : ''}</div>`).join('')}
    </div></div>`).join('')}</div>
    ${d.matches.some((m) => m.st === 'second group stage') ? '<p class="note">Nesta Copa, parte da fase decisiva foi disputada em grupos — veja a aba Grupos.</p>' : ''}
    <p class="note">Entre parênteses, o placar da disputa de pênaltis. Clique em um confronto para ver os detalhes.</p>`;
}

function groups(el, d, e) {
  const names = Object.keys(d.groups);
  el.innerHTML = `<div class="groups">${names.map((g) => `
    <div class="group"><h4>${esc(g)}</h4>
      <div class="table-wrap"><table class="tbl"><thead><tr>
        <th>#</th><th>Seleção</th><th class="c">J</th><th class="c">V</th><th class="c">E</th><th class="c">D</th><th class="c">Gols</th><th class="c">SG</th><th class="c">Pts</th>
      </tr></thead><tbody>${d.groups[g].map((r, i) => `<tr class="${r.adv ? 'adv' : ''}">
        <td class="pos" style="font-size:16px">${i + 1}</td><td>${team(r.c, e.y, { cls: 'flag--sm' })}</td>
        <td class="c">${r.pl}</td><td class="c">${r.w}</td><td class="c">${r.d}</td><td class="c">${r.l}</td>
        <td class="c">${r.gf}:${r.ga}</td><td class="c">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="c strong">${r.pts}</td>
      </tr>`).join('')}</tbody></table></div>
    </div>`).join('')}</div>
    <p class="note">Faixa verde: seleção classificada. ${e.y < 1994 ? 'Até 1990, a vitória valia 2 pontos.' : 'Vitória vale 3 pontos.'}</p>`;
}

function scorers(el, d, e) {
  const map = new Map();
  const own = [];
  d.matches.forEach((m) => m.goals.forEach((g) => {
    if (g.og) { own.push({ g, m }); return; }
    const k = g.pid || g.n;
    const r = map.get(k) || { pid: g.pid, n: g.n, c: g.c, goals: 0, pens: 0 };
    r.goals += 1;
    r.pens += g.pen ? 1 : 0;
    map.set(k, r);
  }));
  const rows = [...map.values()];
  const max = Math.max(...rows.map((r) => r.goals));
  el.innerHTML = '<div id="sc"></div><div id="og"></div>';
  sortableTable(el.querySelector('#sc'), [
    { key: 'pos', label: '#', cls: 'pos', render: (r, i) => i + 1 },
    { key: 'n', label: 'Jogador', sort: 'str', render: (r) => `<span class="strong">${playerLink(r.pid, r.n)}</span>` },
    { key: 'c', label: 'Seleção', render: (r) => team(r.c, e.y, { cls: 'flag--sm' }) },
    { key: 'goals', label: 'Gols', sort: 'num', cls: 'r', render: (r) => `<span class="strong" style="color:var(--gold)">${r.goals}</span>` },
    { key: 'pens', label: 'Pênaltis', sort: 'num', cls: 'r' },
    { key: 'bar', label: '', render: (r) => `<div class="goalbar"><i style="width:${(r.goals / max) * 100}%"></i></div>` },
  ], rows, { sortKey: 'goals', limit: 30, rowClass: (r) => (r.goals === max ? 'top1' : '') });
  if (own.length) {
    el.querySelector('#og').innerHTML = `<p class="note" style="margin-top:18px"><b>Gols contra (${own.length}):</b> ${own.map(({ g, m }) =>
      `${playerLink(g.pid, g.n)} (${esc(teamName(g.c, e.y))}, <a href="${matchUrl(m.id)}">${esc(teamName(m.h, e.y))} x ${esc(teamName(m.a, e.y))}</a>)`).join('; ')}</p>`;
  }
}

function awards(el, d, e) {
  const keys = Object.keys(AWARD_ICON).filter((k) => e.aw[k]);
  el.innerHTML = keys.length ? `<div class="awards">${keys.map((k) => e.aw[k].map((p) => `
    <div class="award"><div class="award__ico ${AWARD_ICON[k][1]}">${AWARD_ICON[k][0]}</div>
      <div><small>${C.core.awards[k]}</small><b>${playerLink(p[0], p[1])}</b><div class="muted" style="font-size:13px">${team(p[2], e.y, { cls: 'flag--sm' })}</div></div>
    </div>`).join('')).join('')}</div>
    <p class="note">A Bola de Ouro existe desde 1982, a Luva de Ouro desde 1994 e o prêmio de Melhor Jogador Jovem desde 2006. Os artilheiros anteriores foram reconhecidos depois pela FIFA.</p>`
    : '<p class="empty">Sem prêmios individuais registrados nesta edição.</p>';
}

function stadiums(el, d, e) {
  const games = {};
  d.matches.forEach((m) => { games[m.sid] = (games[m.sid] || 0) + 1; });
  const list = [...d.stadiums].sort((a, b) => games[b.id] - games[a.id]);
  el.innerHTML = `<div id="map" style="height:420px"></div>
    <div class="stadium-list" style="margin-top:16px">${list.map((s) => `
      <div class="stadium" data-sid="${s.id}"><h4>${esc(s.n)}</h4><p>${esc(s.city)}, ${esc(s.country)}${s.cap ? ` · capacidade atual ${fmt(s.cap)}` : ''}</p>
        <span class="pill"><b>${games[s.id]}</b> ${games[s.id] === 1 ? 'jogo' : 'jogos'} em ${e.y}</span>
        ${s.id === e.final.sid ? '<span class="badge" style="margin-left:6px">Final</span>' : ''}</div>`).join('')}</div>`;
  const map = makeMap(el.querySelector('#map'), list, { finals: [e.final.sid], label: (s) => `${plural(games[s.id], 'jogo', 'jogos')} em ${e.y}` });
  el.querySelectorAll('[data-sid]').forEach((n) => n.addEventListener('click', () => map?.focus(n.dataset.sid)));
}
