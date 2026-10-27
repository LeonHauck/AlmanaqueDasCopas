import { C, esc, fmt, getStadiums, pageHead, plural } from '../ui.js';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Mapa Leaflet reutilizável. list = estádios; finals = ids que recebem destaque dourado.
export function makeMap(el, list, { finals = null, label = null } = {}) {
  if (!window.L) {
    el.innerHTML = '<p class="empty">Não foi possível carregar o mapa.</p>';
    return null;
  }
  const map = L.map(el, { scrollWheelZoom: false, worldCopyJump: true });
  // Mapa base escuro da Esri (gratuito, não exige chave)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Mapa © <a href="https://www.esri.com">Esri</a>, HERE, Garmin, © OpenStreetMap', maxZoom: 16,
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16, pane: 'overlayPane',
  }).addTo(map);
  const markers = {};
  const pts = [];
  list.filter((s) => s.ll).forEach((s) => {
    const isFinal = finals ? finals.includes(s.id) : s.finals.length > 0;
    const icon = L.divIcon({ className: '', html: `<div class="pin ${isFinal ? 'pin--final' : ''}"></div>`, iconSize: isFinal ? [18, 18] : [14, 14] });
    const mk = L.marker(s.ll, { icon, title: s.n, zIndexOffset: isFinal ? 1000 : 0 }).addTo(map);
    mk.bindPopup(`<h4>${esc(s.n)}</h4><div class="muted">${esc(s.city)}, ${esc(s.country)}${s.cap ? ` · ${fmt(s.cap)} lugares` : ''}</div>
      <div style="margin-top:6px">${label ? label(s) : `${plural(s.games, 'jogo', 'jogos')} em Copas`}</div>
      <div style="margin-top:4px">${s.years.map((y) => `<a href="#/copa/${y}/estadios" style="color:var(--gold);margin-right:6px">${y}</a>`).join('')}</div>
      ${s.finals.length ? `<div style="margin-top:4px">🏆 Final: ${s.finals.join(', ')}</div>` : ''}`);
    markers[s.id] = mk;
    pts.push(s.ll);
  });
  if (pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 7 });
  else map.setView([20, 0], 2);
  return {
    focus(id) {
      const mk = markers[id];
      if (!mk) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      map.setView(mk.getLatLng(), 12);
      mk.openPopup();
    },
  };
}

export async function render(app) {
  const all = await getStadiums();
  const { core } = C;
  document.title = 'Estádios — Almanaque das Copas';
  const ranking = [...all].sort((a, b) => b.games - a.games || b.finals.length - a.finals.length).slice(0, 10);
  const finalsVenues = all.filter((s) => s.finals.length).sort((a, b) => a.finals[0] - b.finals[0]);
  const countries = new Set(all.map((s) => s.country)).size;

  app.innerHTML = `<div class="wrap page">
    ${pageHead('Onde a bola rolou', 'Estádios e sedes', `${all.length} estádios em ${countries} países receberam jogos de Copa do Mundo. Em dourado, os palcos de final. Clique em um ponto para ver os detalhes.`)}
    <div class="filters">
      <input class="input" id="q" type="search" placeholder="Buscar estádio ou cidade…" aria-label="Buscar estádio ou cidade">
      <select class="select" id="y" aria-label="Filtrar por Copa"><option value="">Todas as Copas</option>
        ${[...core.editions].reverse().map((e) => `<option value="${e.y}">${e.y} · ${esc(e.hosts.map((h) => h[0]).join(' / '))}</option>`).join('')}</select>
    </div>
    <div id="mapBox"></div>

    <div class="grid grid-2 section">
      <section>
        <div class="section__head"><h2 class="section__title">Templos das Copas</h2></div>
        <div class="card" style="padding:6px 18px"><div class="rec">${ranking.map((s, i) => `
          <div class="rec__row" data-sid="${s.id}" style="cursor:pointer"><span class="rank">${i + 1}</span>
            <div><b>${esc(s.n)}</b><div class="rec__sub">${esc(s.city)}, ${esc(s.country)} · ${s.years.join(', ')}</div></div>
            <span class="rec__val">${s.games}<span class="muted" style="font-size:12px"> jogos</span></span></div>`).join('')}</div></div>
      </section>
      <section>
        <div class="section__head"><h2 class="section__title">Palcos das finais</h2></div>
        <div class="card" style="padding:6px 18px"><div class="rec">${finalsVenues.map((s) => `
          <div class="rec__row" data-sid="${s.id}" style="cursor:pointer;grid-template-columns:1fr auto"><div><b>${esc(s.n)}</b><div class="rec__sub">${esc(s.city)}, ${esc(s.country)}</div></div>
            <span class="rec__val" style="font-size:15px">${s.finals.join(' · ')}</span></div>`).join('')}</div></div>
      </section>
    </div>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Todos os estádios</h2><span class="muted" id="count"></span></div>
      <div class="stadium-list" id="list"></div>
      <div class="more-row" id="more"></div>
      <p class="note">Capacidade atual informada pela base de dados; muitos estádios foram reformados desde que receberam a Copa.</p>
    </section>
  </div>`;

  let map = null;
  let shown = 24;
  const filtered = () => {
    const q = norm(document.getElementById('q').value.trim());
    const y = Number(document.getElementById('y').value);
    return all.filter((s) => (!y || s.years.includes(y)) && (!q || norm(`${s.n} ${s.city} ${s.country}`).includes(q)));
  };
  const drawMap = (list) => {
    const box = document.getElementById('mapBox');
    box.innerHTML = '<div id="map"></div>';
    map = makeMap(box.firstChild, list);
  };
  const drawList = (list) => {
    const sorted = [...list].sort((a, b) => b.games - a.games);
    document.getElementById('count').textContent = plural(list.length, 'estádio', 'estádios');
    document.getElementById('list').innerHTML = sorted.slice(0, shown).map((s) => `
      <div class="stadium" data-sid="${s.id}"><h4>${esc(s.n)}</h4><p>${esc(s.city)}, ${esc(s.country)}${s.cap ? ` · ${fmt(s.cap)} lugares` : ''}</p>
        <div class="pills"><span class="pill"><b>${s.games}</b> ${s.games === 1 ? 'jogo' : 'jogos'}</span>${s.years.map((y) => `<span class="pill">${y}</span>`).join('')}
        ${s.finals.length ? '<span class="badge">Final</span>' : ''}</div></div>`).join('') || '<p class="empty">Nenhum estádio encontrado.</p>';
    document.getElementById('more').innerHTML = sorted.length > shown ? `<button class="btn">Mostrar mais (${sorted.length - shown})</button>` : '';
  };
  const apply = () => { shown = 24; const l = filtered(); drawMap(l); drawList(l); };
  document.getElementById('q').addEventListener('input', () => { clearTimeout(apply.t); apply.t = setTimeout(apply, 250); });
  document.getElementById('y').addEventListener('change', apply);
  document.getElementById('more').addEventListener('click', () => { shown += 24; drawList(filtered()); });
  app.querySelector('.page').addEventListener('click', (e) => {
    const n = e.target.closest('[data-sid]');
    if (n) map?.focus(n.dataset.sid);
  });
  apply();
}
