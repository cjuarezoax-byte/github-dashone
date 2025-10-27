// DashOne — widget-weekly.js (v0.7 TAG COLORS)
// Métricas por etiqueta/proyecto con filtro + chips coloreados y leyenda

(function(){
  const $ = (s, p=document)=>p.querySelector(s);
  const storage = { get:(k,d)=>{ try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } } };
  const todoKey = 'dashone.todo';

  const listEl = $('#weeklyList');
  const canvas = $('#weeklyChart');
  const ctx = canvas.getContext('2d');

  // ---------- Color util: mismo algoritmo que app.js ----------
  function tagHue(tag){
    let h = 0;
    for (const ch of tag.toLowerCase()) h = (h*31 + ch.charCodeAt(0)) % 360;
    return h;
  }
  function tagStyle(tag){
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const h = tagHue(tag);
    const bg = dark ? `hsl(${h} 70% 18% / .45)` : `hsl(${h} 95% 90% / 1)`;
    const bd = dark ? `hsl(${h} 80% 45% / .7)`  : `hsl(${h} 80% 55% / .7)`;
    const fg = dark ? `hsl(${h} 85% 88% / 1)`  : `hsl(${h} 50% 22% / 1)`;
    return { bg, bd, fg };
  }

  // ---------- UI: selector de etiqueta dinámico ----------
  let filter = 'ALL';
  function ensureFilterUI(){
    let sel = document.getElementById('weeklyFilter');
    if (!sel){
      sel = document.createElement('select');
      sel.id = 'weeklyFilter';
      sel.className = 'input';
      sel.style.margin = '8px 0 12px';
      const h2 = document.querySelector('#resumen h2');
      h2?.after(sel);
      sel.addEventListener('change', ()=>{ filter = sel.value; render(); });
    }
    const items = storage.get(todoKey, []);
    const tags = Array.from(new Set(items.flatMap(t => (t.tags||[])))).sort();
    const cur = sel.value || 'ALL';
    sel.innerHTML = '<option value="ALL">Todas las etiquetas</option>' + tags.map(t=>`<option value="${t}">#${t}</option>`).join('');
    sel.value = tags.includes(cur) ? cur : 'ALL';
    filter = sel.value;
  }

  // ---------- Datos ----------
  function getWeekData(){
    const items = storage.get(todoKey, []);
    const now = new Date();
    const data = [];
    for(let i=6; i>=0; i--){
      const day = new Date(now); day.setDate(now.getDate()-i);
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0,0,0).getTime();
      const end   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23,59,59).getTime();
      const inFilter = (t)=> filter==='ALL' ? true : (t.tags||[]).includes(filter);

      const added = items.filter(t=> t.ts>=start && t.ts<=end && inFilter(t)).length;
      const done  = items.filter(t=> t.done && t.doneTs && t.doneTs>=start && t.doneTs<=end && inFilter(t)).length;
      data.push({ day, added, done });
    }
    return data;
  }

  function getTotalsByTag(){
    const items = storage.get(todoKey, []);
    const map = new Map();
    items.forEach(t=> (t.tags||[]).forEach(tag => map.set(tag, (map.get(tag)||0) + 1)));
    return Array.from(map.entries()).sort((a,b)=> b[1]-a[1]); // [tag, count]
  }

  // ---------- Render: lista + top etiquetas (coloreadas) ----------
  function renderList(data){
    listEl.innerHTML = '';
    const fmt = new Intl.DateTimeFormat(undefined, { weekday:'long', month:'short', day:'numeric' });
    data.forEach(d=>{
      const li = document.createElement('li');
      li.innerHTML = `<strong style="min-width:140px">${fmt.format(d.day)}</strong> <span class="tag ok">${d.done} hechas</span> <span class="tag">${d.added} nuevas</span>`;
      listEl.appendChild(li);
    });

    // Totales por etiqueta (Top 6) con chips coloreados
    const totals = getTotalsByTag().slice(0,6);
    const li = document.createElement('li');
    li.style.display = 'flex'; li.style.flexWrap = 'wrap'; li.style.gap = '8px'; li.style.alignItems = 'center';

    const title = document.createElement('strong'); title.style.minWidth = '140px'; title.textContent = 'Top etiquetas';
    li.appendChild(title);

    if (totals.length){
      totals.forEach(([t,c])=>{
        const chip = document.createElement('span');
        chip.className = 'tag';
        chip.textContent = `#${t}: ${c}`;
        const { bg, bd, fg } = tagStyle(t);
        chip.style.background = bg;
        chip.style.borderColor = bd;
        chip.style.color = fg;
        chip.style.cursor = 'pointer';
        chip.title = `Filtrar por #${t}`;
        chip.addEventListener('click', ()=>{
          const sel = document.getElementById('weeklyFilter');
          if (sel){ sel.value = t; sel.dispatchEvent(new Event('change')); }
        });
        li.appendChild(chip);
      });
    } else {
      const none = document.createElement('span');
      none.className = 'muted';
      none.textContent = 'No hay etiquetas aún';
      li.appendChild(none);
    }
    listEl.prepend(li);
  }

  // ---------- Render: gráfico + leyenda de colores ----------
  function renderChart(data){
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    // axes
    ctx.globalAlpha = .3; ctx.strokeStyle = '#888';
    ctx.beginPath(); ctx.moveTo(30, h-20); ctx.lineTo(w-10, h-20); ctx.stroke(); ctx.globalAlpha = 1;

    const maxVal = Math.max(1, ...data.map(d=>Math.max(d.added, d.done)));
    const xStep = (w-50)/ (data.length-1);
    function y(v){ return h-20 - (v/maxVal)*(h-50); }

    // added line (cian)
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#22d3ee';
    ctx.beginPath(); data.forEach((d,i)=> i?ctx.lineTo(30+i*xStep, y(d.added)):ctx.moveTo(30, y(d.added))); ctx.stroke();

    // done line (azul)
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#3b82f6';
    ctx.beginPath(); data.forEach((d,i)=> i?ctx.lineTo(30+i*xStep, y(d.done)):ctx.moveTo(30, y(d.done))); ctx.stroke();

    // labels
    ctx.fillStyle = '#888'; ctx.font = '12px system-ui';
    data.forEach((d,i)=>{ const label = new Intl.DateTimeFormat(undefined,{weekday:'short'}).format(d.day); ctx.fillText(label, 24+i*xStep, h-6); });

    // leyenda DOM (debajo del canvas)
    let legend = document.getElementById('weeklyLegend');
    if (!legend){
      legend = document.createElement('div');
      legend.id = 'weeklyLegend';
      legend.style.display = 'flex';
      legend.style.flexWrap = 'wrap';
      legend.style.alignItems = 'center';
      legend.style.gap = '10px';
      legend.style.marginTop = '8px';
      canvas.after(legend);
    }
    legend.innerHTML = '';

    // Líneas del gráfico
    const makePill = (label, color) => {
      const pill = document.createElement('span');
      pill.className = 'tag';
      pill.textContent = label;
      pill.style.borderColor = color;
      pill.style.color = color;
      pill.style.background = 'transparent';
      return pill;
    };
    legend.append(makePill('Nuevas', '#22d3ee'));
    legend.append(makePill('Hechas', '#3b82f6'));

    // Etiquetas más usadas (Top 6) con su color
    const totals = getTotalsByTag().slice(0,6);
    if (totals.length){
      const sep = document.createElement('span'); sep.className = 'muted'; sep.textContent = '·';
      legend.append(sep);
      totals.forEach(([t])=>{
        const swatch = document.createElement('span');
        swatch.className = 'tag';
        swatch.textContent = '#'+t;
        const { bg, bd, fg } = tagStyle(t);
        swatch.style.background = bg;
        swatch.style.borderColor = bd;
        swatch.style.color = fg;
        swatch.style.cursor = 'pointer';
        swatch.title = `Filtrar por #${t}`;
        swatch.addEventListener('click', ()=>{
          const sel = document.getElementById('weeklyFilter');
          if (sel){ sel.value = t; sel.dispatchEvent(new Event('change')); }
        });
        legend.append(swatch);
      });
    }
  }

  function render(){
    ensureFilterUI();
    const data = getWeekData();
    renderList(data);
    renderChart(data);
  }

  window.addEventListener('storage', render);
  document.addEventListener('DOMContentLoaded', render);
  // recolorea si cambia tema
  const obs = new MutationObserver(render);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
