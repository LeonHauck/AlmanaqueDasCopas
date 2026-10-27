import { C, esc, flag, getRecords, matchUrl, pageHead, playerLink, scoreNote, team, teamFlag, teamName } from '../ui.js';
import { barChart } from '../chart.js';

const CONF_NAMES = { UEFA: 'Europa (UEFA)', CONMEBOL: 'América do Sul (CONMEBOL)' };

const recList = (title, rows, note = '') => `<section class="card">
  <h3>${title}</h3>
  <div class="rec">${rows.map((r, i) => `<div class="rec__row"><span class="rank">${i + 1}</span>
    <div>${r.main}${r.sub ? `<div class="rec__sub">${r.sub}</div>` : ''}</div><span class="rec__val">${r.val}</span></div>`).join('')}</div>
  ${note ? `<p class="note">${note}</p>` : ''}</section>`;

const matchMain = (m) => `<a href="${matchUrl(m.id)}">${flag(teamFlag(m.h, m.y), 'flag--sm')} ${esc(teamName(m.h, m.y))} x ${esc(teamName(m.a, m.y))} ${flag(teamFlag(m.a, m.y), 'flag--sm')}</a>`;
const matchSub = (m) => `${m.y} · ${esc(m.st)}`;
const pTeam = (code, y) => `${flag(teamFlag(code, y), 'flag--sm')} ${esc(teamName(code, y))}`;

export async function render(app) {
  const r = await getRecords();
  const { core } = C;
  document.title = 'Recordes — Almanaque das Copas';
  const top = core.scorers[0];
  const fontaine = r.mais_gols_edicao[0];
  const hat5 = r.hattricks[0];
  const apps = r.mais_jogos[0];
  const copas = r.mais_copas.filter((x) => x[3] === r.mais_copas[0][3]);
  const gol = r.goleadas[0];

  app.innerHTML = `<div class="wrap page">
    ${pageHead('Números que fizeram história', 'Recordes', `Os grandes números das ${core.editions.length} Copas: goleadas, artilheiros, veteranos, prodígios e muito mais.`)}

    <div class="big-rec">
      <a class="card" href="#/jogador/${top[0]}"><strong>${top[3]}</strong><span>gols: maior artilheiro</span><p>${esc(top[1])} (${esc(core.teams[top[2]].n)})</p></a>
      <a class="card" href="#/jogador/${fontaine[0]}"><strong>${fontaine[4]}</strong><span>gols em uma Copa</span><p>${esc(fontaine[1])}, ${fontaine[3]}</p></a>
      <a class="card" href="${matchUrl(hat5.m.id)}"><strong>${hat5.g}</strong><span>gols em um jogo</span><p>${esc(hat5.n)} contra ${esc(teamName(hat5.m.h === hat5.c ? hat5.m.a : hat5.m.h, hat5.m.y))}, ${hat5.m.y}</p></a>
      <a class="card" href="#/jogador/${apps[0]}"><strong>${apps[3]}</strong><span>jogos disputados</span><p>${esc(apps[1])}</p></a>
      <div class="card"><strong>${copas[0][3]}</strong><span>Copas disputadas</span><p>${copas.map((x) => playerLink(x[0], x[1])).join(' e ')}</p></div>
      <a class="card" href="${matchUrl(gol.id)}"><strong>${gol.hs}–${gol.as}</strong><span>maior goleada</span><p>${esc(teamName(gol.h, gol.y))} x ${esc(teamName(gol.a, gol.y))}, ${gol.y}</p></a>
      <div class="card"><strong>${core.totals.hat}</strong><span>hat-tricks</span><p>Três gols ou mais de um jogador na mesma partida.</p></div>
      <div class="card"><strong>${core.totals.og}</strong><span>gols contra</span><p>E ${core.totals.pens} gols de pênalti com a bola rolando.</p></div>
    </div>

    <section class="section card">
      <div class="section__head" style="margin-bottom:6px"><h2 class="section__title" id="chartTitle">Gols por Copa</h2>
        <div class="chips" id="chartSel"><button class="chip on" data-k="g">Total de gols</button><button class="chip" data-k="avg">Média por jogo</button><button class="chip" data-k="red">Expulsões</button><button class="chip" data-k="nt">Seleções</button></div></div>
      <div id="chart"></div>
    </section>

    <div class="grid grid-2 section" id="lists"></div>
  </div>`;

  // gráfico
  const series = {
    g: { title: 'Gols por Copa', idx: 1, fmt: (v) => v, unit: 'gols' },
    avg: { title: 'Média de gols por jogo', idx: 3, fmt: (v) => String(v).replace('.', ','), unit: 'gols por jogo' },
    red: { title: 'Expulsões por Copa (desde 1970)', idx: 4, fmt: (v) => v, unit: 'expulsões', from: 1970 },
    nt: { title: 'Seleções participantes', idx: 5, fmt: (v) => v, unit: 'seleções' },
  };
  const drawChart = (k) => {
    const s = series[k];
    document.getElementById('chartTitle').textContent = s.title;
    const rows = r.por_edicao.filter((x) => !s.from || x[0] >= s.from);
    const data = rows.map((x) => ({ label: String(x[0]), value: x[s.idx], tip: `<b>${x[0]}</b><br>${s.fmt(x[s.idx])} ${s.unit}` }));
    const vals = data.map((d) => d.value);
    barChart(document.getElementById('chart'), data, { fmt: s.fmt, labelEvery: 2, highlight: [vals.lastIndexOf(Math.max(...vals))] });
  };
  document.getElementById('chartSel').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    document.querySelectorAll('#chartSel .chip').forEach((c) => c.classList.toggle('on', c === b));
    drawChart(b.dataset.k);
  });
  drawChart('g');

  const ageRows = (list) => list.slice(0, 5).map((x) => ({
    main: `${playerLink(x.pid, x.n)} <span class="muted">${pTeam(x.c, x.m.y)}</span>`,
    sub: `<a href="${matchUrl(x.m.id)}">${esc(teamName(x.m.h, x.m.y))} x ${esc(teamName(x.m.a, x.m.y))}</a> · ${x.m.y}`,
    val: `<span style="font-size:14px">${esc(x.age)}</span>`,
  }));

  const html = [
    recList('Maiores goleadas', r.goleadas.slice(0, 8).map((m) => ({ main: matchMain(m), sub: matchSub(m), val: `${m.hs}–${m.as}` }))),
    recList('Jogos com mais gols', r.mais_gols_jogo.slice(0, 8).map((m) => ({ main: matchMain(m), sub: matchSub(m) + (scoreNote(m) ? ` · ${scoreNote(m)}` : ''), val: `${m.hs}–${m.as}` }))),
    recList('Mais gols em uma só Copa', r.mais_gols_edicao.slice(0, 8).map((x) => ({ main: playerLink(x[0], x[1]), sub: `${pTeam(x[2], x[3])} · <a href="#/copa/${x[3]}">${x[3]}</a>`, val: x[4] }))),
    recList('Mais jogos em Copas', r.mais_jogos.slice(0, 8).map((x) => ({ main: playerLink(x[0], x[1]), sub: `${pTeam(x[2])} · ${x[4]} Copas`, val: x[3] })), 'Contagem a partir de 1970, quando a base passa a ter escalações.'),
    recList('Mais Copas disputadas', r.mais_copas.slice(0, 8).map((x) => ({ main: playerLink(x[0], x[1]), sub: `${pTeam(x[2])} · ${x[4].join(', ')}`, val: x[3] })), 'Copas em que o jogador entrou em campo (a partir de 1970).'),
    recList('Mais gols em um só jogo', r.hattricks.filter((h) => h.g >= 4).map((h) => ({ main: `${playerLink(h.pid, h.n)} <span class="muted">${pTeam(h.c, h.m.y)}</span>`, sub: `<a href="${matchUrl(h.m.id)}">${esc(teamName(h.m.h, h.m.y))} ${h.m.hs}–${h.m.as} ${esc(teamName(h.m.a, h.m.y))}</a> · ${h.m.y}`, val: h.g }))),
    recList('Mais jovens a marcar', ageRows(r.jovem_gol)),
    recList('Mais velhos a marcar', ageRows(r.velho_gol)),
    recList('Mais jovens a jogar', ageRows(r.jovem_jogo), 'A partir de 1970.'),
    recList('Mais velhos a jogar', ageRows(r.velho_jogo), 'A partir de 1970.'),
    recList('Melhores ataques em uma Copa', r.ataques.slice(0, 8).map(([y, c, g]) => ({ main: team(c, y, { cls: 'flag--sm' }), sub: `<a href="#/copa/${y}">${y}</a> · ${esc(core.teams[c].years[y][0])}`, val: g }))),
    recList('Disputas de pênaltis', r.penaltis.slice(0, 8).map(([c, w, l]) => ({ main: team(c, null, { cls: 'flag--sm' }), sub: `${w} ${w === 1 ? 'vitória' : 'vitórias'} · ${l} ${l === 1 ? 'derrota' : 'derrotas'}`, val: w + l })), 'Total de disputas de pênaltis em Copas.'),
    recList('Jogos mais violentos', r.cartoes_jogo.slice(0, 6).map((m) => ({ main: matchMain(m), sub: `${matchSub(m)} · ${m.yel} amarelos`, val: `${m.red} <span class="card-r" style="vertical-align:0"></span>` })), 'Ordenado por expulsões.'),
    recList('Títulos por continente', r.titulos_conf.map(([c, n]) => ({ main: esc(CONF_NAMES[c] || c), sub: core.editions.filter((e) => core.teams[e.champ].conf === c).map((e) => e.y).join(' · '), val: n }))),
  ].join('');

  const hosts = `<section class="card"><h3>Como foram os anfitriões</h3><div class="rec">${r.anfitrioes.map(([y, c, res]) => `
    <div class="rec__row" style="grid-template-columns:60px 1fr auto"><a href="#/copa/${y}" class="rank" style="color:var(--gold)">${y}</a>
      <div>${team(c, y, { cls: 'flag--sm' })}</div><span style="font-size:13.5px;${res === 'Campeão' ? 'color:var(--gold);font-weight:700' : ''}">${esc(res)}</span></div>`).join('')}</div>
    <p class="note">${r.anfitrioes.filter((x) => x[2] === 'Campeão').length} anfitriões foram campeões em casa.</p></section>`;

  const fast = `<section class="card"><h3>Gols no primeiro minuto</h3><div class="rec">${r.gols_rapidos.map((g) => `
    <div class="rec__row" style="grid-template-columns:1fr auto"><div>${playerLink(g.pid, g.n)} <span class="muted">${pTeam(g.c, g.m.y)}</span>
      <div class="rec__sub"><a href="${matchUrl(g.m.id)}">${esc(teamName(g.m.h, g.m.y))} x ${esc(teamName(g.m.a, g.m.y))}</a> · ${g.m.y}</div></div><span class="rec__val">${g.min}</span></div>`).join('')}</div>
    <p class="note">A base registra só o minuto. Até 2022, o gol mais rápido cronometrado era o de Hakan Şükür (Turquia), aos 11 segundos, contra a Coreia do Sul em 2002.</p></section>`;

  const hats = `<section class="card" style="grid-column:1/-1"><h3>Todos os hat-tricks (${r.hattricks.length})</h3>
    <div class="pills">${[...r.hattricks].sort((a, b) => a.m.y - b.m.y).map((h) => `<a class="pill" style="font-size:13px;padding:4px 8px" href="${matchUrl(h.m.id)}" title="${esc(teamName(h.m.h, h.m.y))} ${h.m.hs}–${h.m.as} ${esc(teamName(h.m.a, h.m.y))}">${h.m.y} · ${esc(h.n)}${h.g > 3 ? ` <b>${h.g}</b>` : ''}</a>`).join('')}</div></section>`;

  document.getElementById('lists').innerHTML = html + hosts + fast + hats;
}
