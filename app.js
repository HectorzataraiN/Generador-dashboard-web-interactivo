/* =============================================
   app.js — Dashboard Ventas
   Compartido por index.html y analytics.html
   ============================================= */

// ─────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────
const estado = {
  numRegistros:     14,
  ordenActual:      'fecha',
  autoActivo:       false,
  autoTimer:        null,
  precioMin:        299,
  categoria:        'todos',
  ultimosRegistros: [],
};

// ─────────────────────────────────────────────
// CATÁLOGOS
// ─────────────────────────────────────────────
const CATALOGO = {
  hardware:    ['Laptop Pro', 'Monitor 4K', 'SSD 1TB', 'RAM 32GB', 'GPU RTX 4070'],
  perifericos: ['Teclado Mec.', 'Mouse Ergonómico', 'Auriculares BT', 'Webcam HD', 'Hub USB-C', 'Mousepad XL'],
  mobiliario:  ['Silla Gamer', 'Escritorio Ajustable', 'Soporte Monitor', 'Reposapiés'],
};

const TODOS_PRODUCTOS = [
  ...CATALOGO.hardware,
  ...CATALOGO.perifericos,
  ...CATALOGO.mobiliario,
];

const PRECIO_MAX   = 12_000;
const UNIDADES_MIN = 1;
const UNIDADES_MAX = 50;

const COLORES = [
  '#00ff99','#00ccff','#ff6699','#ffcc00',
  '#aa88ff','#ff8844','#44ffee','#ff44bb',
];

// ─────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────
function randInt(min, max)  { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr)    { return arr[Math.floor(Math.random() * arr.length)]; }
function formatNum(n)       { return n.toLocaleString('es-MX'); }
function formatK(n)         { return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${formatNum(n)}`; }

function fechaRelativa(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getProductosPorCategoria(cat) {
  if (cat === 'todos') return TODOS_PRODUCTOS;
  return CATALOGO[cat] || TODOS_PRODUCTOS;
}

// ─────────────────────────────────────────────
// GENERADOR DE DATOS
// ─────────────────────────────────────────────
function generarRegistros() {
  const productos = getProductosPorCategoria(estado.categoria);
  const registros = [];
  for (let i = 0; i < estado.numRegistros; i++) {
    const unidades = randInt(UNIDADES_MIN, UNIDADES_MAX);
    const precio   = randInt(estado.precioMin, PRECIO_MAX);
    registros.push({
      fecha:     fechaRelativa(estado.numRegistros - 1 - i),
      producto:  randChoice(productos),
      categoria: Object.keys(CATALOGO).find(k => CATALOGO[k].includes(randChoice(productos))) || 'hardware',
      unidades,
      precio,
      total: unidades * precio,
    });
  }
  return registros;
}

// ─────────────────────────────────────────────
// KPIs
// ─────────────────────────────────────────────
function actualizarKPIs(registros) {
  if (!document.getElementById('val-total')) return;
  const totalVentas   = registros.reduce((a, r) => a + r.total, 0);
  const promedio      = Math.round(totalVentas / registros.length);
  const maxVenta      = Math.max(...registros.map(r => r.total));
  const transacciones = registros.reduce((a, r) => a + r.unidades, 0);

  const setValor = (id, valor) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('animating');
    setTimeout(() => { el.textContent = formatNum(valor); el.classList.remove('animating'); }, 200);
  };
  setValor('val-total',    totalVentas);
  setValor('val-promedio', promedio);
  setValor('val-max',      maxVenta);
  setValor('val-trans',    transacciones);

  document.querySelectorAll('.kpi-card').forEach(card => {
    card.classList.remove('updated');
    void card.offsetWidth;
    card.classList.add('updated');
  });
}

// ─────────────────────────────────────────────
// BARRAS VERTICALES
// ─────────────────────────────────────────────
function actualizarGrafico(registros) {
  const container = document.getElementById('chart-bars');
  const yAxis     = document.getElementById('chart-y-axis');
  if (!container) return;

  container.innerHTML = '';
  if (yAxis) yAxis.innerHTML = '';

  const totales = registros.map(r => r.total);
  const maxVal  = Math.max(...totales);
  const minVal  = Math.min(...totales);

  const periodoEl = document.getElementById('period-label');
  if (periodoEl) periodoEl.textContent = `${registros[0].fecha} → ${registros[registros.length-1].fecha}`;

  registros.forEach((reg, i) => {
    const pct = 8 + ((reg.total - minVal) / (maxVal - minVal || 1)) * 87;
    const col = document.createElement('div');
    col.className = 'bar-col';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${pct}%`;
    bar.style.animationDelay = `${i * 40}ms`;
    const value = document.createElement('span');
    value.className = 'bar-value';
    value.textContent = formatK(reg.total);

    bar.appendChild(value);
    
    const label = document.createElement('span');
    label.className = 'bar-label';
    label.textContent = reg.fecha;
    col.appendChild(bar);
    col.appendChild(label);
    container.appendChild(col);
  });

  if (yAxis) {
    const mid = Math.round((maxVal + minVal) / 2);
    [maxVal, mid, minVal].forEach(val => {
      const span = document.createElement('span');
      span.className = 'y-label';
      span.textContent = formatK(val);
      yAxis.appendChild(span);
    });
  }
}

// ─────────────────────────────────────────────
// ÁREA
// ─────────────────────────────────────────────
function actualizarGraficoArea(registros) {
  const svg     = document.getElementById('area-svg');
  const labelEl = document.getElementById('area-label');
  if (!svg) return;

  if (labelEl) labelEl.textContent = `${registros[0].fecha} → ${registros[registros.length-1].fecha}`;

  const W=400, H=160, padL=10, padR=10, padT=20, padB=24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const totales = registros.map(r => r.total);
  const maxVal  = Math.max(...totales);
  const minVal  = Math.min(...totales);

  const xFor = i => padL + (i / (registros.length-1)) * innerW;
  const yFor = v => padT + (1 - (v - minVal) / (maxVal - minVal || 1)) * innerH;
  const pts  = registros.map((r, i) => ({ x: xFor(i), y: yFor(r.total), r }));

  const lineD = pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const areaD = lineD + ` L${pts[pts.length-1].x.toFixed(2)},${(padT+innerH).toFixed(2)} L${pts[0].x.toFixed(2)},${(padT+innerH).toFixed(2)} Z`;

  const gridLines = [0, 0.5, 1].map(frac => {
    const y = padT + frac * innerH;
    return `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="0.5"/>`;
  }).join('');

  const step = Math.ceil(registros.length / 7);
  const xLabels = registros.filter((_,i) => i%step===0 || i===registros.length-1).map(r => {
    const idx = registros.indexOf(r);
    return `<text x="${xFor(idx).toFixed(1)}" y="${H-4}" text-anchor="middle" fill="var(--muted)" font-size="7" font-family="Space Mono">${r.fecha}</text>`;
  }).join('');

  const dots = pts.map((p,i) => `
    <circle class="area-dot" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3.5"
      fill="var(--bg)" stroke="var(--accent)" stroke-width="1.8"
      style="animation-delay:${i*30}ms"/>
  `).join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${gridLines}
    <path d="${areaD}" class="area-fill" fill="url(#areaGrad)"/>
    <path d="${lineD}" class="area-line" stroke="var(--accent)" stroke-width="2" fill="none" stroke-linejoin="round"/>
    ${dots}
    ${xLabels}`;
}

// ─────────────────────────────────────────────
// DONUT
// ─────────────────────────────────────────────
function actualizarGraficoDonut(registros) {
  const svg    = document.getElementById('donut-svg');
  const legend = document.getElementById('donut-legend');
  if (!svg) return;

  const catTotals = {};
  registros.forEach(r => {
    let cat = 'otros';
    for (const [k, v] of Object.entries(CATALOGO)) { if (v.includes(r.producto)) { cat = k; break; } }
    catTotals[cat] = (catTotals[cat] || 0) + r.total;
  });

  const entries = Object.entries(catTotals).sort((a,b) => b[1]-a[1]);
  const total   = entries.reduce((s,[,v]) => s+v, 0);
  const CX=100, CY=100, R=72, r=44;
  const catLabels = { hardware:'Hardware', perifericos:'Periféricos', mobiliario:'Mobiliario', otros:'Otros' };

  let segments = '';
  let cumAngle = -90;

  entries.forEach(([cat, val], i) => {
    const pct   = val / total;
    const angle = pct * 360;
    const rad   = (cumAngle * Math.PI) / 180;
    const rad2  = ((cumAngle + angle) * Math.PI) / 180;
    const x1 = CX + R*Math.cos(rad),  y1 = CY + R*Math.sin(rad);
    const x2 = CX + R*Math.cos(rad2), y2 = CY + R*Math.sin(rad2);
    const x3 = CX + r*Math.cos(rad2), y3 = CY + r*Math.sin(rad2);
    const x4 = CX + r*Math.cos(rad),  y4 = CY + r*Math.sin(rad);
    const largeArc = angle > 180 ? 1 : 0;
    const color = COLORES[i % COLORES.length];
    segments += `<path d="M${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} L${x3.toFixed(2)},${y3.toFixed(2)} A${r},${r} 0 ${largeArc},0 ${x4.toFixed(2)},${y4.toFixed(2)} Z"
      fill="${color}" opacity="0.9" class="donut-segment"
      data-cat="${catLabels[cat]||cat}" data-val="$${formatNum(val)}" style="animation-delay:${i*80}ms"/>`;
    cumAngle += angle;
  });

  svg.innerHTML = segments + `
    <text x="${CX}" y="${CY-6}"  text-anchor="middle" class="donut-center-label">TOTAL</text>
    <text x="${CX}" y="${CY+14}" text-anchor="middle" class="donut-center-value">${formatK(total)}</text>`;

  if (legend) {
    legend.innerHTML = entries.map(([cat,val],i) => {
      const pct = ((val/total)*100).toFixed(1);
      return `<div class="legend-item">
        <span class="legend-dot" style="background:${COLORES[i%COLORES.length]}"></span>
        <span>${catLabels[cat]||cat}</span>
        <span class="legend-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  svg.querySelectorAll('.donut-segment').forEach(seg => {
    seg.addEventListener('mouseenter', function() {
      this.style.filter = 'brightness(1.2)';
      mostrarToast(`${this.dataset.cat}: ${this.dataset.val}`);
    });
    seg.addEventListener('mouseleave', function() { this.style.filter = ''; });
  });
}

// ─────────────────────────────────────────────
// BARRAS HORIZONTALES
// ─────────────────────────────────────────────
function actualizarBarrasHorizontales(registros) {
  const wrapper = document.getElementById('hbar-wrapper');
  if (!wrapper) return;

  const prodTotals = {};
  registros.forEach(r => { prodTotals[r.producto] = (prodTotals[r.producto]||0) + r.total; });
  const sorted = Object.entries(prodTotals).sort((a,b)=>b[1]-a[1]).slice(0,8);

  if (!sorted.length) { wrapper.innerHTML = '<div class="chart-placeholder"><span>Sin datos</span></div>'; return; }

  const maxVal = sorted[0][1];
  wrapper.innerHTML = '';
  sorted.forEach(([nombre, val], i) => {
    const pct   = (val / maxVal) * 100;
    const color = COLORES[i % COLORES.length];
    const row   = document.createElement('div');
    row.className = 'hbar-row';
    row.innerHTML = `
      <span class="hbar-name" title="${nombre}">${nombre}</span>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${pct.toFixed(1)}%; background:${color}; animation-delay:${i*50}ms"></div>
      </div>
      <span class="hbar-val">${formatK(val)}</span>`;
    wrapper.appendChild(row);
  });
}

// ─────────────────────────────────────────────
// GAUGE
// ─────────────────────────────────────────────
function actualizarGauge(registros) {
  const arc      = document.getElementById('gauge-arc');
  const needle   = document.getElementById('gauge-needle');
  const pctLabel = document.getElementById('gauge-pct-label');
  const bigLabel = document.getElementById('gauge-big');
  if (!arc) return;

  const META_DIA    = 500_000;
  const totalVentas = registros.reduce((a,r) => a+r.total, 0);
  const promedioDia = totalVentas / registros.length;
  const pct         = Math.min(promedioDia / META_DIA, 1.2);
  const pct100      = Math.round(pct * 100);
  const arcLength   = 283;

  arc.style.strokeDashoffset = (arcLength * (1 - Math.min(pct,1))).toFixed(2);
  const color = pct < 0.5 ? '#ff4466' : pct < 0.8 ? '#ffcc00' : '#00ff99';
  arc.style.stroke = color;

  const needleAngle = -90 + Math.min(pct,1)*180;
  needle.setAttribute('transform', `rotate(${needleAngle.toFixed(1)}, 100, 110)`);
  needle.style.stroke = color;

  if (pctLabel) pctLabel.textContent = `${pct100}%`;
  if (bigLabel) { bigLabel.textContent = formatK(Math.round(promedioDia)); bigLabel.style.color = color; }
}

// ─────────────────────────────────────────────
// HEATMAP
// ─────────────────────────────────────────────
function actualizarMapaCalor(registros) {
  const wrapper = document.getElementById('heatmap-wrapper');
  const labelEl = document.getElementById('heatmap-label');
  if (!wrapper) return;

  const DIAS_SEMANA = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];
  const numSemanas  = Math.ceil(registros.length / 7);
  const maxVal      = Math.max(...registros.map(r => r.total));
  const minVal      = Math.min(...registros.map(r => r.total));

  if (labelEl) labelEl.textContent = `${registros.length} días · ${numSemanas} semanas`;

  function heatColor(val) {
    const t = (val - minVal) / (maxVal - minVal || 1);
    return `rgba(0, ${Math.round(80 + t*175)}, ${Math.round(60 + t*93)}, ${(0.15 + t*0.85).toFixed(2)})`;
  }

  wrapper.innerHTML = '';

  const colLabelsEl = document.createElement('div');
  colLabelsEl.className = 'heatmap-col-labels';
  for (let s = 0; s < numSemanas; s++) {
    const lbl = document.createElement('span');
    lbl.className = 'heatmap-col-label';
    lbl.textContent = `S${s+1}`;
    colLabelsEl.appendChild(lbl);
  }

  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  DIAS_SEMANA.forEach((dia, dIdx) => {
    const row = document.createElement('div');
    row.className = 'heatmap-row';
    const dayLabel = document.createElement('span');
    dayLabel.className = 'heatmap-day-label';
    dayLabel.textContent = dia;
    row.appendChild(dayLabel);

    for (let s = 0; s < numSemanas; s++) {
      const regIdx = s * 7 + dIdx;
      const cell   = document.createElement('div');
      cell.className = 'heatmap-cell';
      cell.style.animationDelay = `${(s*7+dIdx)*15}ms`;
      if (regIdx < registros.length) {
        const reg = registros[regIdx];
        cell.style.background = heatColor(reg.total);
        cell.setAttribute('data-tip', `${reg.fecha} · $${formatNum(reg.total)}`);
      } else {
        cell.style.background = 'var(--border)';
        cell.style.opacity = '0.3';
      }
      row.appendChild(cell);
    }
    grid.appendChild(row);
  });

  const legend = document.createElement('div');
  legend.className = 'heatmap-legend';
  legend.innerHTML = `<span>Bajo</span><div class="heatmap-legend-bar">${
    [0.1,0.3,0.5,0.7,0.9].map(t =>
      `<div class="heatmap-legend-cell" style="background:rgba(0,${Math.round(80+t*175)},${Math.round(60+t*93)},${(0.15+t*0.85).toFixed(2)})"></div>`
    ).join('')
  }</div><span>Alto</span>`;

  wrapper.appendChild(colLabelsEl);
  wrapper.appendChild(grid);
  wrapper.appendChild(legend);
}

// ─────────────────────────────────────────────
// TABLA
// ─────────────────────────────────────────────
function actualizarTabla(registros) {
  const tbody    = document.getElementById('table-body');
  const rowCount = document.getElementById('row-count');
  if (!tbody) return;

  let datos = [...registros];
  if (estado.ordenActual === 'total') datos.sort((a,b) => b.total - a.total);

  tbody.innerHTML = '';
  if (rowCount) rowCount.textContent = `${datos.length} registros`;

  datos.forEach((reg, i) => {
    const tr = document.createElement('tr');
    tr.style.animationDelay = `${i*25}ms`;

    let tendenciaHTML = '<span style="color:var(--muted)">—</span>';
    const idxOriginal = registros.indexOf(reg);
    if (idxOriginal > 0) {
      const diff = reg.total - registros[idxOriginal-1].total;
      const pct  = ((diff / registros[idxOriginal-1].total)*100).toFixed(1);
      tendenciaHTML = diff > 0
        ? `<span class="trend up">▲ ${pct}%</span>`
        : `<span class="trend down">▼ ${Math.abs(pct)}%</span>`;
    }
    tr.innerHTML = `
      <td style="color:var(--muted)">${String(i+1).padStart(2,'0')}</td>
      <td>${reg.fecha}</td>
      <td>${reg.producto}</td>
      <td style="text-align:right">${formatNum(reg.unidades)}</td>
      <td style="text-align:right">$${formatNum(reg.precio)}</td>
      <td class="col-total" style="text-align:right">$${formatNum(reg.total)}</td>
      <td>${tendenciaHTML}</td>`;
    tbody.appendChild(tr);
  });
}

// ─────────────────────────────────────────────
// GENERAR DATOS (principal)
// ─────────────────────────────────────────────
function generarDatos() {
  const btn = document.getElementById('btn-generar');
  if (btn) {
    btn.classList.add('loading');
    btn.innerHTML = `<svg class="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>Generando...`;
  }

  setTimeout(() => {
    const registros = generarRegistros();
    estado.ultimosRegistros = registros;

    actualizarKPIs(registros);
    actualizarGrafico(registros);
    actualizarGraficoArea(registros);
    actualizarGraficoDonut(registros);
    actualizarBarrasHorizontales(registros);
    actualizarGauge(registros);
    actualizarMapaCalor(registros);
    actualizarTabla(registros);

    if (btn) {
      btn.classList.remove('loading');
      btn.innerHTML = `<svg class="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>Generar Datos`;
    }
    mostrarToast('✓ Dashboard actualizado');
  }, 600);
}

// ─────────────────────────────────────────────
// TEMA
// ─────────────────────────────────────────────
function toggleTheme() {
  const html  = document.documentElement;
  const nuevo = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', nuevo);
  localStorage.setItem('dashboard-theme', nuevo);
  if (estado.ultimosRegistros.length > 0) {
    actualizarGraficoArea(estado.ultimosRegistros);
    actualizarGauge(estado.ultimosRegistros);
  }
}
function aplicarTemaGuardado() {
  const guardado = localStorage.getItem('dashboard-theme');
  if (guardado) document.documentElement.setAttribute('data-theme', guardado);
}

// ─────────────────────────────────────────────
// AUTO-REFRESCO
// ─────────────────────────────────────────────
function toggleAuto() {
  estado.autoActivo = !estado.autoActivo;
  const btn        = document.getElementById('btn-auto');
  const statusDot  = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  if (estado.autoActivo) {
    const ms = parseInt(document.getElementById('select-intervalo')?.value || '5000');
    estado.autoTimer = setInterval(generarDatos, ms);
    btn?.classList.add('active');
    statusDot?.classList.add('auto');
    if (statusText) statusText.textContent = `Auto ${ms/1000}s`;
    mostrarToast(`⚡ Auto-refresco cada ${ms/1000}s`);
  } else {
    clearInterval(estado.autoTimer);
    estado.autoTimer = null;
    btn?.classList.remove('active');
    statusDot?.classList.remove('auto');
    if (statusText) statusText.textContent = 'Sistema activo';
    mostrarToast('⏸ Auto-refresco detenido');
  }
}

// ─────────────────────────────────────────────
// FILTROS
// ─────────────────────────────────────────────
function setPeriodo(dias) {
  estado.numRegistros = dias;
  document.querySelectorAll('#grupo-periodo .grp-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.dias) === dias);
  });
  if (estado.ultimosRegistros.length > 0) generarDatos();
}

function setOrden(criterio) {
  estado.ordenActual = criterio;
  document.getElementById('sort-fecha')?.classList.toggle('active', criterio === 'fecha');
  document.getElementById('sort-total')?.classList.toggle('active', criterio === 'total');
  if (estado.ultimosRegistros.length > 0) actualizarTabla(estado.ultimosRegistros);
}

function actualizarLabelPrecio(valor) {
  estado.precioMin = parseInt(valor);
  const label = document.getElementById('label-precio');
  if (label) label.textContent = `$${formatNum(estado.precioMin)}`;
}

// ─────────────────────────────────────────────
// CSV
// ─────────────────────────────────────────────
function exportarCSV() {
  const registros = estado.ultimosRegistros;
  if (!registros.length) { mostrarToast('⚠ Genera datos primero'); return; }
  const cabecera = ['Fecha','Producto','Unidades','Precio Unitario','Total MXN'];
  const filas    = registros.map(r => [r.fecha,r.producto,r.unidades,r.precio,r.total].join(','));
  const csv      = [cabecera.join(','), ...filas].join('\n');
  const blob     = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url      = URL.createObjectURL(blob);
  const link     = document.createElement('a');
  link.href = url; link.download = `ventas_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  mostrarToast('✓ CSV descargado');
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
let toastTimer = null;
function mostrarToast(mensaje, duracion = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = mensaje;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), duracion);
}

// ─────────────────────────────────────────────
// COLOR PICKER
// ─────────────────────────────────────────────
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1,3), 16),
    g: parseInt(hex.slice(3,5), 16),
    b: parseInt(hex.slice(5,7), 16),
  };
}
function hexADim(hex, alpha = 0.2) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function aplicarColor(color, dim, swatch = null) {
  const root = document.documentElement;
  root.style.setProperty('--accent',     color);
  root.style.setProperty('--accent-dim', dim);

  const dot   = document.getElementById('preview-dot');
  const hexEl = document.getElementById('preview-hex');
  if (dot)   dot.style.background = color;
  if (hexEl) { hexEl.textContent = color; hexEl.style.color = color; }

  const inputNativo = document.getElementById('custom-color');
  if (inputNativo) inputNativo.value = color;

  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  if (swatch) swatch.classList.add('active');

  localStorage.setItem('dashboard-accent',     color);
  localStorage.setItem('dashboard-accent-dim', dim);

  if (estado.ultimosRegistros.length > 0) {
    actualizarGraficoArea(estado.ultimosRegistros);
    actualizarGauge(estado.ultimosRegistros);
  }
  mostrarToast(`🎨 Color aplicado ${color}`);
}

function aplicarColorPersonalizado(hex) {
  aplicarColor(hex, hexADim(hex, 0.2), null);
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
}

function toggleColorPicker() {
  document.getElementById('color-panel')?.classList.toggle('open');
}

function aplicarColorGuardado() {
  const color = localStorage.getItem('dashboard-accent');
  const dim   = localStorage.getItem('dashboard-accent-dim');
  if (color && dim) {
    document.documentElement.style.setProperty('--accent',     color);
    document.documentElement.style.setProperty('--accent-dim', dim);
    const dot   = document.getElementById('preview-dot');
    const hexEl = document.getElementById('preview-hex');
    if (dot)   dot.style.background = color;
    if (hexEl) { hexEl.textContent = color; hexEl.style.color = color; }
    const inputNativo = document.getElementById('custom-color');
    if (inputNativo) inputNativo.value = color;
    document.querySelectorAll('.swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === color);
    });
  }
}

// ─────────────────────────────────────────────
// MAPA (Leaflet)
// ─────────────────────────────────────────────
const mapaState = {
  instancia:  null,
  marcadores: [],
  idCounter:  0,
};

function cargarLeaflet(cb) {
  if (window.L) { cb(); return; }
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(css);
  const script = document.createElement('script');
  script.src   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = cb;
  document.head.appendChild(script);
}

function inicializarMapa() {
  const loading = document.getElementById('map-loading');
  cargarLeaflet(() => {
    if (mapaState.instancia) { loading?.classList.add('hidden'); return; }
    const map = L.map('main-map', { center: [19.4,-99.1], zoom: 4 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>', maxZoom: 19,
    }).addTo(map);
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      const nombre = await geocodificarInverso(lat, lng);
      agregarPuntoAlMapa(nombre, lat, lng);
    });
    mapaState.instancia = map;
    loading?.classList.add('hidden');
  });
}

async function geocodificarInverso(lat, lng) {
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: {'Accept-Language':'es'} });
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.display_name?.split(',')[0] || `${lat.toFixed(3)},${lng.toFixed(3)}`;
  } catch { return `${lat.toFixed(3)},${lng.toFixed(3)}`; }
}

async function buscarUbicacion() {
  const input = document.getElementById('map-search-input');
  const query = input?.value?.trim();
  if (!query) { mostrarToast('⚠ Escribe una ciudad o lugar'); return; }
  mostrarToast('🔍 Buscando...');
  try {
    const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, { headers: {'Accept-Language':'es'} });
    const data = await res.json();
    if (!data.length) { mostrarToast('⚠ Ubicación no encontrada'); return; }
    const { lat, lon, display_name } = data[0];
    agregarPuntoAlMapa(display_name.split(',')[0], parseFloat(lat), parseFloat(lon));
    if (input) input.value = '';
  } catch { mostrarToast('⚠ Error al buscar.'); }
}

function crearIconoMarcador() {
  const c = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ff99';
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:${c};border:2.5px solid #fff;border-radius:50%;box-shadow:0 0 0 2px ${c},0 2px 8px rgba(0,0,0,.4)"></div>`,
    iconSize: [14,14], iconAnchor: [7,7], popupAnchor: [0,-12],
  });
}

function agregarPuntoAlMapa(nombre, lat, lng) {
  if (!mapaState.instancia) { inicializarMapa(); return; }
  const id     = ++mapaState.idCounter;
  const marker = L.marker([lat,lng], { icon: crearIconoMarcador() }).addTo(mapaState.instancia);
  marker.bindPopup(`<div class="map-popup">
    <div class="map-popup-name">${nombre}</div>
    <div class="map-popup-coords">${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
    <button class="map-popup-remove" onclick="eliminarPunto(${id})">✕ Eliminar punto</button>
  </div>`, { maxWidth: 220, closeButton: false });
  marker.on('click', () => marker.openPopup());
  mapaState.marcadores.push({ id, nombre, lat, lng, marker });
  mapaState.instancia.flyTo([lat,lng], Math.max(mapaState.instancia.getZoom(), 7), { duration: 0.8 });
  actualizarSelectCiudades();
  renderizarTagsCiudades();
  mostrarToast(`📍 ${nombre} agregada`);
}

function eliminarPunto(id) {
  const idx = mapaState.marcadores.findIndex(m => m.id === id);
  if (idx === -1) return;
  const { marker, nombre } = mapaState.marcadores[idx];
  mapaState.instancia.removeLayer(marker);
  mapaState.marcadores.splice(idx, 1);
  actualizarSelectCiudades();
  renderizarTagsCiudades();
  mostrarToast(`🗑 ${nombre} eliminada`);
}

function limpiarMapa() {
  mapaState.marcadores.forEach(({ marker }) => mapaState.instancia?.removeLayer(marker));
  mapaState.marcadores = [];
  actualizarSelectCiudades();
  renderizarTagsCiudades();
  mostrarToast('🗺 Mapa limpio');
}

function actualizarSelectCiudades() {
  const sel = document.getElementById('map-filter-ciudad');
  const cnt = document.getElementById('map-point-count');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="todas">Todas</option>';
  mapaState.marcadores.forEach(({ id, nombre }) => {
    const opt = document.createElement('option');
    opt.value = id; opt.textContent = nombre;
    sel.appendChild(opt);
  });
  const still = mapaState.marcadores.find(m => String(m.id) === prev);
  sel.value = still ? prev : 'todas';
  if (cnt) cnt.textContent = `${mapaState.marcadores.length} punto${mapaState.marcadores.length!==1?'s':''}`;
}

function filtrarMapaCiudad() {
  const val = document.getElementById('map-filter-ciudad')?.value;
  mapaState.marcadores.forEach(({ id, marker, lat, lng }) => {
    if (val === 'todas' || String(id) === val) {
      if (!mapaState.instancia.hasLayer(marker)) marker.addTo(mapaState.instancia);
      if (String(id) === val) { mapaState.instancia.flyTo([lat,lng], 10, {duration:.8}); marker.openPopup(); }
    } else {
      if (mapaState.instancia.hasLayer(marker)) mapaState.instancia.removeLayer(marker);
    }
  });
}

function renderizarTagsCiudades() {
  const list = document.getElementById('map-points-list');
  if (!list) return;
  list.innerHTML = '';
  mapaState.marcadores.forEach(({ id, nombre, lat, lng }) => {
    const tag = document.createElement('div');
    tag.className = 'map-point-tag';
    tag.title = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    tag.innerHTML = `<span class="map-point-dot"></span><span>${nombre}</span>
      <button class="map-point-remove" onclick="event.stopPropagation();eliminarPunto(${id})" title="Eliminar">✕</button>`;
    tag.addEventListener('click', () => {
      mapaState.instancia?.flyTo([lat,lng], 10, {duration:.8});
      mapaState.marcadores.find(x=>x.id===id)?.marker.openPopup();
    });
    list.appendChild(tag);
  });
}

// ─────────────────────────────────────────────
// ACTIVITY FEED
// ─────────────────────────────────────────────
const eventosDemo = [
  { tipo:'success', titulo:'Venta registrada',        desc:'RTX 5090 • $48,900 MXN' },
  { tipo:'info',    titulo:'Nuevo cliente agregado',   desc:'Empresa: NovaTech Solutions' },
  { tipo:'warning', titulo:'Meta diaria alcanzada',    desc:'Objetivo superado en +12%' },
  { tipo:'danger',  titulo:'Producto agotado',         desc:'Mouse Logitech G Pro X' },
  { tipo:'success', titulo:'Pago procesado',           desc:'Transferencia aprobada' },
  { tipo:'info',    titulo:'Nueva sucursal conectada', desc:'Región: Monterrey' },
  { tipo:'warning', titulo:'Inventario bajo',          desc:'Sillas gamer restantes: 4' },
  { tipo:'success', titulo:'Orden completada',         desc:'Entrega enviada correctamente' },
];

const iconosSVG = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="10" x2="12" y2="16"/><circle cx="12" cy="7" r="1"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3L2 20h20L12 3z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17" r="1"/></svg>`,
  danger:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>`,
};

function obtenerHoraActual() {
  return new Date().toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
}

function generarActividad() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  const evento = eventosDemo[Math.floor(Math.random() * eventosDemo.length)];
  const item   = document.createElement('div');
  item.className = `activity-item ${evento.tipo} activity-new`;
  item.innerHTML = `
    <div class="activity-icon">${iconosSVG[evento.tipo]}</div>
    <div class="activity-time">${obtenerHoraActual()}</div>
    <div class="activity-content">
      <span class="activity-title">${evento.titulo}</span>
      <span class="activity-desc">${evento.desc}</span>
    </div>
    <div class="activity-status"></div>`;
  feed.prepend(item);
  setTimeout(() => item.classList.remove('activity-new'), 900);
  while (feed.children.length > 4) feed.removeChild(feed.lastElementChild);
}

setInterval(generarActividad, 4000);

// ─────────────────────────────────────────────
// USER DROPDOWN
// ─────────────────────────────────────────────
function toggleUserMenu() {
  document.getElementById('user-dropdown')?.classList.toggle('active');
}

// ─────────────────────────────────────────────
// AI INSIGHTS
// ─────────────────────────────────────────────
const aiInsights = [
  { title:'Ventas aceleradas',    text:'Las ventas de hardware crecieron 23% durante los últimos 7 días.' },
  { title:'Categoría dominante',  text:'Periféricos lidera ingresos con un 38% del total generado.' },
  { title:'Tendencia positiva',   text:'El rendimiento diario supera la media histórica en 14%.' },
  { title:'Demanda detectada',    text:'Monterrey muestra incremento sostenido de compras empresariales.' },
  { title:'Alerta preventiva',    text:'Inventario crítico proyectado en productos premium en 48h.' },
  { title:'Predicción favorable', text:'La IA proyecta crecimiento semanal del 17%.' },
];

function actualizarInsightAI() {
  const insight = aiInsights[Math.floor(Math.random() * aiInsights.length)];
  const titleEl = document.getElementById('ai-title');
  const textEl  = document.getElementById('ai-text');
  if (titleEl) titleEl.textContent = insight.title;
  if (textEl)  textEl.textContent  = insight.text;
}

setInterval(actualizarInsightAI, 6000);

// ─────────────────────────────────────────────
// CERRAR PANELES AL CLICK AFUERA
// ─────────────────────────────────────────────
document.addEventListener('click', (e) => {
  // Color panel
  const colorPanel = document.getElementById('color-panel');
  const btnColor   = document.getElementById('btn-color');
  if (colorPanel && !colorPanel.contains(e.target) && !btnColor?.contains(e.target)) {
    colorPanel.classList.remove('open');
  }
  // User dropdown
  const userPanel = document.querySelector('.user-panel');
  if (userPanel && !userPanel.contains(e.target)) {
    document.getElementById('user-dropdown')?.classList.remove('active');
  }
});

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
(function init() {
  aplicarTemaGuardado();
  aplicarColorGuardado();
  actualizarInsightAI();

  // Inicializar mapa solo si el elemento existe en esta página
  if (document.getElementById('main-map')) {
    inicializarMapa();
  }

  // Cambio dinámico de intervalo de auto-refresco
  document.getElementById('select-intervalo')?.addEventListener('change', () => {
    if (estado.autoActivo) {
      clearInterval(estado.autoTimer);
      const ms = parseInt(document.getElementById('select-intervalo').value);
      estado.autoTimer = setInterval(generarDatos, ms);
      const statusText = document.getElementById('status-text');
      if (statusText) statusText.textContent = `Auto ${ms/1000}s`;
      mostrarToast(`⚡ Intervalo: ${ms/1000}s`);
    }
  });

  // Generar datos iniciales
  generarDatos();
})();