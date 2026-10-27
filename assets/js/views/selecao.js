import { C, esc, flag, getEdition, matchRow, playerLink, resultWeight, stars } from '../ui.js';

const CONFS = { UEFA: 'UEFA · Europa', CONMEBOL: 'CONMEBOL · América do Sul', CONCACAF: 'CONCACAF · América do Norte, Central e Caribe', CAF: 'CAF · África', AFC: 'AFC · Ásia', OFC: 'OFC · Oceania' };

export async function render(app, code) {
  const { core } = C;
  const t = core.teams[code];
  if (!t) throw new Error('Seleção não encontrada.');
  document.title = `${t.n} nas Copas — Almanaque das Copas`;
  const years = Object.keys(t.years).map(Number);
  const apps = years.length;
  const maxTop = t.top[0]?.[2] || 1;
  const finals = [...t.finals].sort();

  const strip = core.editions.map((e) => {
    const r = t.years[e.y];
    if (!r) return `<span class="r0" title="${e.y}: não participou">${String(e.y).slice(2)}</span>`;
    return `<a class="r${resultWeight(r[0])}" href="#/copa/${e.y}" title="${e.y}: ${esc(r[0])}">${String(e.y).slice(2)}</a>`;
  }).join('');

  app.innerHTML = `<div class="wrap page">
    <div class="team-hero">
      ${flag(t.f, 'flag--xl')}
      <div>
        <span class="kicker">${esc(CONFS[t.conf] || t.conf)}</span>
        <h1 class="page-title" style="margin:6px 0 4px">${esc(t.n)}</h1>
        ${stars(t.titles.length)}
        ${t.hist.length ? `<p class="muted" style="margin:6px 0 0">Inclui a campanha como ${esc(t.hist.join(', '))}.</p>` : ''}
      </div>
    </div>

    <div class="stats" style="margin-top:28px">
      <div class="stat stat--gold"><div class="stat__value">${t.titles.length}</div><div class="stat__label">${t.titles.length === 1 ? 'Título' : 'Títulos'}</div></div>
      <div class="stat"><div class="stat__value">${apps}</div><div class="stat__label">Copas</div></div>
      <div class="stat"><div class="stat__value">${t.p}</div><div class="stat__label">Jogos</div></div>
      <div class="stat"><div class="stat__value">${t.w}<span class="muted" style="font-size:24px"> / ${t.d} / ${t.l}</span></div><div class="stat__label">V / E / D</div></div>
      <div class="stat"><div class="stat__value">${t.gf}<span class="muted" style="font-size:24px"> : ${t.ga}</span></div><div class="stat__label">Gols pró : contra</div></div>
      <div class="stat"><div class="stat__value">${t.p ? Math.round(((t.w * 3 + t.d) / (t.p * 3)) * 100) : 0}%</div><div class="stat__label">Aproveitamento</div></div>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Participações</h2></div>
      <div class="strip">${strip}</div>
      <div class="legend">
        <span><i style="background:var(--gold)"></i>Campeão</span><span><i style="background:var(--silver)"></i>Vice</span>
        <span><i style="background:var(--bronze)"></i>3º lugar</span><span><i style="background:#8fb7a0"></i>4º / semifinal</span>
        <span><i style="background:#3fa066"></i>Quartas / 2ª fase</span><span><i style="background:#2f6f4a"></i>Oitavas / 16 avos</span>
        <span><i style="background:#2a4b38"></i>Fase de grupos</span><span><i style="background:rgba(255,255,255,.08)"></i>Não participou</span>
      </div>
    </section>

    <div class="grid grid-2 section">
      <section>
        <div class="section__head"><h2 class="section__title">Campanhas</h2></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Copa</th><th>Resultado</th><th class="r">J</th><th class="r">V</th><th class="r">E</th><th class="r">D</th><th class="r">Gols</th></tr></thead>
          <tbody>${[...years].reverse().map((y) => {
            const [lab, p, w, d, l, gf, ga] = t.years[y];
            return `<tr class="${lab === 'Campeão' ? 'top1' : ''}"><td><a class="strong" href="#/copa/${y}">${y}</a></td>
              <td>${lab === 'Campeão' ? `<b style="color:var(--gold)">★ ${lab}</b>` : esc(lab)}</td>
              <td class="r">${p}</td><td class="r">${w}</td><td class="r">${d}</td><td class="r">${l}</td><td class="r">${gf}:${ga}</td></tr>`;
          }).join('')}</tbody></table></div>
        ${t.pso[0] + t.pso[1] ? `<p class="note">Disputas de pênaltis: ${t.pso[0]} ${t.pso[0] === 1 ? 'vitória' : 'vitórias'} e ${t.pso[1]} ${t.pso[1] === 1 ? 'derrota' : 'derrotas'}.</p>` : ''}
      </section>
      <section>
        <div class="section__head"><h2 class="section__title">Artilheiros da seleção</h2></div>
        <div class="card" style="padding:6px 18px">
          ${t.top.length ? `<div class="rec">${t.top.map((s, i) => `<div class="rec__row"><span class="rank">${i + 1}</span>
            <div>${playerLink(s[0], s[1])}<div class="goalbar" style="margin-top:4px"><i style="width:${(s[2] / maxTop) * 100}%"></i></div></div>
            <span class="rec__val">${s[2]}</span></div>`).join('')}</div>` : '<p class="empty">Esta seleção ainda não marcou gols em Copas.</p>'}
        </div>
        ${finals.length ? `<div class="section__head" style="margin-top:28px"><h2 class="section__title">Finais</h2></div><div class="matches" id="finals"></div>` : ''}
      </section>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Jogos</h2>
        <select class="select" id="yearSel" aria-label="Escolher Copa">${[...years].reverse().map((y) => `<option>${y}</option>`).join('')}</select>
      </div>
      <div class="matches" id="games"></div>
    </section>
  </div>`;

  // finais disputadas
  if (finals.length) {
    const rows = await Promise.all(finals.map(async (y) => {
      const e = core.editions.find((x) => x.y === y);
      const d = await getEdition(y);
      const m = d.matches.find((x) => x.id === e.final.id);
      return m ? matchRow(m, y) : '';
    }));
    document.getElementById('finals').innerHTML = rows.join('');
  }

  const sel = document.getElementById('yearSel');
  const showYear = async (y) => {
    const d = await getEdition(y);
    const ms = d.matches.filter((m) => m.h === code || m.a === code);
    document.getElementById('games').innerHTML = ms.map((m) => matchRow(m, y)).join('');
  };
  sel.addEventListener('change', () => showYear(Number(sel.value)));
  showYear(years[years.length - 1]);
}
