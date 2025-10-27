// DashOne — widget-weekly.js (v0.5 TAGS)
// Métricas por etiqueta/proyecto usando #hashtags en las tareas

(function(){
  const $ = (s, p=document)=>p.querySelector(s);
  const storage = { get:(k,d)=>{ try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } } };
  const todoKey = 'dashone.todo';

  const listEl = $('#weeklyList');
  const canvas = $('#weeklyChart');
  const ctx = canvas.getContext('2d');

  // UI: selector de etiqueta dinámico
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

  function renderList(data){
    listEl.innerHTML = '';
    const fmt = new Intl.DateTimeFormat(undefined, { weekday:'long', month:'short', day:'numeric' });
    data.forEach(d=>{
      const li = document.createElement('li');
      li.innerHTML = `<strong style="min-width:140px">${fmt.format(d.day)}</strong> <span class="tag ok">${d.done} hechas</span> <span class="tag">${d.added} nuevas</span>`;
      listEl.appendChild(li);
    });

    // Totales por etiqueta (Top 5)
    const totals = getTotalsByTag().slice(0,5);
    const li = document.createElement('li');
    li.innerHTML = `<strong style="min-width:140px">Top etiquetas</strong> ` +
      (totals.length ? totals.map(([t,c])=>`<span class="tag">#${t}: ${c}</span>`).join(' ') : `<span class="muted">No hay etiquetas aún</span>`);
    listEl.prepend(li);
  }

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

    // legend
    ctx.fillStyle = '#22d3ee'; ctx.fillRect(w-160, 14, 10, 10); ctx.fillStyle = '#fff'; ctx.fillText('Nuevas', w-145, 23);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(w-160, 32, 10, 10); ctx.fillStyle = '#fff'; ctx.fillText('Hechas', w-145, 41);
    if (filter !== 'ALL'){ ctx.fillStyle = '#fff'; ctx.fillText(`#${filter}`, w-160, 59); }
  }

  function render(){
    ensureFilterUI();
    const data = getWeekData();
    renderList(data);
    renderChart(data);
  }

  window.addEventListener('storage', render);
  document.addEventListener('DOMContentLoaded', render);
})();
