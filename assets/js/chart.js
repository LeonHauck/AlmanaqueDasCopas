// Gráfico de barras em SVG, de uma série só, com tooltip ao passar o mouse/tocar.
// data: [{ label, value, tip }]  — tip é o HTML do tooltip
import { esc } from './ui.js';

export function barChart(el, data, { height = 260, fmt = (v) => v, labelEvery = 1, highlight = [] } = {}) {
  const draw = () => {
    const W = Math.max(el.clientWidth, 300);
    const H = height;
    const pad = { t: 22, r: 8, b: 26, l: 34 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const max = Math.max(...data.map((d) => d.value));
    const step = niceStep(max);
    const top = Math.ceil(max / step) * step;
    const bw = iw / data.length;
    const gap = Math.max(2, bw * 0.28);
    const y = (v) => pad.t + ih - (v / top) * ih;
    const every = W < 560 ? Math.max(labelEvery, 3) : labelEvery;
    const maxI = data.findIndex((d) => d.value === max);
    const minV = Math.min(...data.map((d) => d.value));
    const minI = data.findIndex((d) => d.value === minV);

    let grid = '';
    for (let v = 0; v <= top + 1e-9; v += step) {
      grid += `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="axis-label" x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(+v.toFixed(2))}</text>`;
    }
    const bars = data.map((d, i) => {
      const x = pad.l + i * bw + gap / 2;
      const w = bw - gap;
      const yy = y(d.value);
      const h = pad.t + ih - yy;
      const r = Math.min(4, w / 2, h);
      const path = `M${x},${pad.t + ih} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + w - r} Q${x + w},${yy} ${x + w},${yy + r} V${pad.t + ih} Z`;
      const showVal = i === maxI || i === minI || highlight.includes(i);
      return `<g><rect class="hit" data-i="${i}" x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${ih}"/>
        <path class="bar ${highlight.includes(i) ? 'hl' : ''}" d="${path}"/>
        ${showVal ? `<text class="val" x="${x + w / 2}" y="${yy - 6}" text-anchor="middle">${fmt(d.value)}</text>` : ''}
        ${i % every === 0 || i === data.length - 1 ? `<text class="axis-label" x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>` : ''}</g>`;
    }).join('');
    el.innerHTML = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de barras">${grid}${bars}</svg><div class="tooltip" hidden></div></div>`;

    const tip = el.querySelector('.tooltip');
    const svg = el.querySelector('svg');
    const show = (e) => {
      const hit = e.target.closest('.hit');
      if (!hit) return;
      const i = +hit.dataset.i;
      el.querySelectorAll('.bar').forEach((b, j) => b.classList.toggle('on', j === i));
      tip.innerHTML = data[i].tip;
      tip.hidden = false;
      const x = pad.l + i * bw + bw / 2;
      tip.style.left = `${Math.min(Math.max(x, 70), W - 70)}px`;
      tip.style.top = `${y(data[i].value)}px`;
    };
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; el.querySelectorAll('.bar.on').forEach((b) => b.classList.remove('on')); });
  };
  draw();
  let t;
  const ro = new ResizeObserver(() => {
    if (!el.isConnected) { ro.disconnect(); return; }
    clearTimeout(t);
    t = setTimeout(draw, 120);
  });
  ro.observe(el);
}

function niceStep(max) {
  const raw = max / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
