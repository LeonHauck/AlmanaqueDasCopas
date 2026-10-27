import { C, champScore, esc, flag, fmt, getRecords, playerLink, scoreNote, stars, teamFlag, teamName } from '../ui.js';
import { barChart } from '../chart.js';

const PITCH = `<svg class="hero__lines" viewBox="0 0 600 400" fill="none" stroke="#fff" stroke-width="2" aria-hidden="true">
  <rect x="10" y="10" width="580" height="380"/><line x1="300" y1="10" x2="300" y2="390"/>
  <circle cx="300" cy="200" r="60"/><circle cx="300" cy="200" r="3" fill="#fff"/>
  <rect x="10" y="100" width="90" height="200"/><rect x="10" y="155" width="32" height="90"/>
  <rect x="500" y="100" width="90" height="200"/><rect x="558" y="155" width="32" height="90"/>
  <path d="M100 160a50 50 0 0 1 0 80M500 160a50 50 0 0 0 0 80"/></svg>`;

export async function render(app) {
  const { core } = C;
  const recs = await getRecords();
  const eds = core.editions;
  const last = eds[eds.length - 1];
  const lastTeam = core.teams[last.champ];
  const f = last.final;
  const t = core.totals;
  const golden = last.aw.bola_ouro?.[0];
  const boot = last.top[0];

  const titleRank = Object.entries(core.teams).filter(([, x]) => x.titles.length)
    .sort((a, b) => b[1].titles.length - a[1].titles.length || a[1].titles[0] - b[1].titles[0]);

  const top10 = core.scorers.slice(0, 10);
  const maxG = top10[0][3];
  const fontaine = recs.mais_gols_edicao[0];
  const goleada = recs.goleadas[0];
  const youngest = recs.jovem_gol[0];
  const oldest = recs.velho_gol[0];
  const mostApps = recs.mais_jogos[0];

  document.title = 'Almanaque das Copas — Toda a história da Copa do Mundo';
  app.innerHTML = `
  <section class="hero">
    <div class="hero__pitch"></div>${PITCH}
    <div class="hero__inner">
      <div>
        <span class="kicker">${eds[0].y} — ${last.y} · ${eds.length} edições</span>
        <h1>Toda a história <span>da Copa</span><em>do Mundo</em></h1>
        <p>Cada jogo, cada gol, cada campeão. ${fmt(t.matches)} partidas, ${fmt(t.goals)} gols e ${fmt(t.teams)} seleções — de Montevidéu, em 1930, a Nova Jersey, em ${last.y}.</p>
        <div class="btns">
          <a class="btn btn--gold" href="#/copas">Explorar as Copas</a>
          <a class="btn" href="#/artilheiros">Artilheiros</a>
          <a class="btn" href="#/recordes">Recordes</a>
        </div>
      </div>
      <a class="champ-card" href="#/copa/${last.y}" style="display:block">
        <div class="champ-card__label">Campeã do Mundo ${last.y}</div>
        <div class="champ-card__team">${flag(lastTeam.f, 'flag--xl')}<div><h2>${esc(lastTeam.n)}</h2>${stars(lastTeam.titles.length)}</div></div>
        <div class="champ-card__final">
          <div class="board">
            <div class="board__team board__team--h"><span>${esc(teamName(f.h, last.y))}</span>${flag(teamFlag(f.h, last.y))}</div>
            <div class="board__score">${f.hs}–${f.as}<small>${scoreNote(f) || 'final'}</small></div>
            <div class="board__team">${flag(teamFlag(f.a, last.y))}<span>${esc(teamName(f.a, last.y))}</span></div>
          </div>
          <p class="muted" style="margin:14px 0 0;font-size:13.5px">
            ${golden ? `Bola de Ouro: <b style="color:var(--text)">${esc(golden[1])}</b> · ` : ''}
            Artilheiro: <b style="color:var(--text)">${esc(boot[1])}</b> (${boot[3]} gols)</p>
        </div>
      </a>
    </div>
  </section>

  <div class="wrap page" style="padding-top:28px">
    <div class="stats">
      <div class="stat stat--gold"><div class="stat__value">${eds.length}</div><div class="stat__label">Copas</div></div>
      <div class="stat"><div class="stat__value">${fmt(t.matches)}</div><div class="stat__label">Jogos</div></div>
      <div class="stat"><div class="stat__value">${fmt(t.goals)}</div><div class="stat__label">Gols</div></div>
      <div class="stat"><div class="stat__value">${(t.goals / t.matches).toFixed(2).replace('.', ',')}</div><div class="stat__label">Gols por jogo</div></div>
      <div class="stat"><div class="stat__value">${t.teams}</div><div class="stat__label">Seleções</div></div>
      <div class="stat"><div class="stat__value">${t.stadiums}</div><div class="stat__label">Estádios</div></div>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Galeria dos campeões</h2><a class="link-more" href="#/copas">Todas as Copas</a></div>
      <div class="stickers">${[...eds].reverse().map((e) => `
        <a class="sticker ${e.y === last.y ? 'sticker--new' : ''}" href="#/copa/${e.y}">
          ${e.y === last.y ? '<span class="badge">Mais recente</span>' : ''}
          <div class="sticker__year">${e.y}</div>
          <div class="sticker__host">${e.hosts.map((h) => flag(h[1], 'flag--sm')).join('')}<span>${esc(e.hosts.map((h) => h[0]).join(' / '))}</span></div>
          <div class="sticker__champ">${flag(teamFlag(e.champ, e.y))}<span>${esc(teamName(e.champ, e.y))}</span></div>
          <div class="sticker__score">${e.final.fr ? 'Quadrangular final' : `Final: ${champScore(e)}`} vs ${esc(teamName(e.ru, e.y))}</div>
        </a>`).join('')}
      </div>
    </section>

    <div class="grid grid-2 section">
      <section>
        <div class="section__head"><h2 class="section__title">Quem tem mais estrelas</h2><a class="link-more" href="#/selecoes">Seleções</a></div>
        <div class="titles">${titleRank.map(([code, x], i) => `
          <a class="titles__row" href="#/selecao/${code}">
            <span class="titles__pos">${i + 1}</span>
            <div><div class="team">${flag(x.f, 'flag--lg')}<div><div class="titles__name">${esc(x.n)}</div><div class="titles__years">${x.titles.join(' · ')}</div></div></div></div>
            ${stars(x.titles.length)}
          </a>`).join('')}
        </div>
      </section>
      <section>
        <div class="section__head"><h2 class="section__title">Maiores artilheiros</h2><a class="link-more" href="#/artilheiros">Ranking completo</a></div>
        <div class="card" style="padding:6px 18px">
          <div class="rec">${top10.map((s, i) => `
            <div class="rec__row">
              <span class="rank">${i + 1}</span>
              <div>${playerLink(s[0], s[1])}<div class="rec__sub">${esc(core.teams[s[2]].n)} · ${Object.keys(s[6]).join(', ')}</div>
                <div class="goalbar" style="margin-top:4px"><i style="width:${(s[3] / maxG) * 100}%"></i></div></div>
              <span class="rec__val">${s[3]}</span>
            </div>`).join('')}
          </div>
        </div>
      </section>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Média de gols por jogo</h2><a class="link-more" href="#/recordes">Mais números</a></div>
      <div class="card"><div id="chartAvg"></div>
        <p class="note">Passe o mouse (ou toque) sobre as barras. Em dourado, as Copas com mais e menos gols por partida.</p></div>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Você sabia?</h2></div>
      <div class="big-rec">
        <a class="card" href="#/jogador/${fontaine[0]}"><strong>${fontaine[4]}</strong><span>gols em uma só Copa</span>
          <p>${esc(fontaine[1])} (${esc(core.teams[fontaine[2]].n)}) em ${fontaine[3]}. Recorde até hoje.</p></a>
        <a class="card" href="#/jogo/${goleada.id}"><strong>${goleada.hs}–${goleada.as}</strong><span>maior goleada</span>
          <p>${esc(teamName(goleada.h, goleada.y))} x ${esc(teamName(goleada.a, goleada.y))}, em ${goleada.y}.</p></a>
        <a class="card" href="#/jogador/${youngest.pid}"><strong>${youngest.age.split(' ')[0]}</strong><span>anos: o mais jovem a marcar</span>
          <p>${esc(youngest.n)}, com ${esc(youngest.age)}, em ${youngest.m.y}.</p></a>
        <a class="card" href="#/jogador/${mostApps[0]}"><strong>${mostApps[3]}</strong><span>jogos em Copas</span>
          <p>${esc(mostApps[1])} é o recordista de partidas disputadas.</p></a>
      </div>
      <p class="note">O mais velho a marcar: ${playerLink(oldest.pid, oldest.n)}, com ${esc(oldest.age)}, em ${oldest.m.y}.</p>
    </section>
  </div>`;

  const data = recs.por_edicao.map(([y, g, m, avg]) => ({ label: String(y), value: avg, tip: `<b>${y}</b><br>${avg.toFixed(2).replace('.', ',')} gols por jogo<br><span class="muted">${g} gols em ${m} jogos</span>` }));
  const vals = data.map((d) => d.value);
  barChart(document.getElementById('chartAvg'), data, {
    fmt: (v) => String(v).replace('.', ','), labelEvery: 2,
    highlight: [vals.indexOf(Math.max(...vals)), vals.indexOf(Math.min(...vals))],
  });
}
