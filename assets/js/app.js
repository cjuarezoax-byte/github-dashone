// DashOne — app.js (v1.0 RANGE + STATUS FILTER)
// Tareas con #etiquetas, colores, fecha visible, orden, filtro por fecha exacta o RANGO y filtro por estado

// ===== Helpers =====
const $ = (s, p=document)=>p.querySelector(s);
const storage = {
  get:(k,d)=>{ try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } },
  set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
};

// ===== Clock =====
function tickClock(){
  const el = $('#clock');
  if (el) el.textContent = new Date().toLocaleString(undefined,{dateStyle:'medium', timeStyle:'short'});
}
setInterval(tickClock, 1000); tickClock();

// ===== Theme =====
const themePref = storage.get('theme', (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
document.documentElement.setAttribute('data-theme', themePref);
$('#themeToggle')?.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  storage.set('theme', next);
  renderTodos(); // recolorea chips según tema
  pushActivity('Tema cambiado a ' + next);
});

// ===== Quick Links =====
const linksKey = 'dashone.links';
function renderLinks(){
  const links = storage.get(linksKey, [
    {label:'Gmail', url:'https://mail.google.com'},
    {label:'Calendar', url:'https://calendar.google.com'},
    {label:'GitHub', url:'https://github.com'}
  ]);
  const ul = $('#links'); if(!ul) return;
  ul.innerHTML = '';
  for(const link of links){
    const li = document.createElement('li');
    const a = document.createElement('a'); a.href = link.url; a.target = '_blank'; a.textContent = link.label;
    const rm = document.createElement('button'); rm.className = 'btn ghost'; rm.textContent = '✖'; rm.title = 'Eliminar';
    rm.addEventListener('click', () => {
      storage.set(linksKey, storage.get(linksKey, []).filter(x => x.url !== link.url));
      renderLinks(); pushActivity('Eliminaste acceso: ' + link.label);
    });
    li.append(a, rm); ul.append(li);
  }
  storage.set(linksKey, links);
}
$('#addLink')?.addEventListener('click', () => {
  const label = prompt('Nombre del acceso'); if(!label) return;
  const url = prompt('URL completa (https://...)'); if(!url) return;
  const links = storage.get(linksKey, []); links.push({label, url}); storage.set(linksKey, links);
  renderLinks(); pushActivity('Agregaste acceso: ' + label);
});

// ===== Tasks =====
const todoKey   = 'dashone.todo';
let taskFilter  = 'ALL';      // etiqueta
let taskSort    = 'desc';     // 'desc' | 'asc'
let filterDate  = '';         // fecha exacta YYYY-MM-DD (si está, ignora rango)
let rangeFrom   = '';         // YYYY-MM-DD
let rangeTo     = '';         // YYYY-MM-DD
let statusFilter= 'all';      // 'all' | 'open' | 'done'

// --- parsing de etiquetas ---
function parseTags(text){
  const re = /#([\p{L}\p{N}_-]+)/giu;
  const tags = [];
  const clean = text.replace(re, (_,t)=>{ tags.push(t.toLowerCase()); return ''; }).replace(/\s{2,}/g,' ').trim();
  return { tags: Array.from(new Set(tags)), cleanText: clean };
}

// --- colores persistentes por hash ---
function tagHue(tag){ let h=0; for (const ch of tag.toLowerCase()) h=(h*31+ch.charCodeAt(0))%360; return h; }
function tagStyle(tag){
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const h = tagHue(tag);
  const bg = dark ? `hsl(${h} 70% 18% / .45)` : `hsl(${h} 95% 90% / 1)`;
  const bd = dark ? `hsl(${h} 80% 45% / .7)`  : `hsl(${h} 80% 55% / .7)`;
  const fg = dark ? `hsl(${h} 85% 88% / 1)`  : `hsl(${h} 50% 22% / 1)`;
  return { backgroundColor: bg, borderColor: bd, color: fg };
}

// --- formato de fecha corto ---
function formatDate(ts){
  const d = new Date(ts);
  const dd = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  const hh = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${dd} · ${hh}`;
}

// --- helpers de fecha ---
function dayBounds(ymd){ const [y,m,d]=ymd.split('-').map(Number); return [ new Date(y,m-1,d,0,0,0).getTime(), new Date(y,m-1,d,23,59,59,999).getTime() ]; }
function rangeBounds(from,to){
  const [s] = dayBounds(from);
  const [,e] = dayBounds(to);
  return [s,e];
}

// ===== UI =====
function ensureTaskControls(){
  const h2 = $('#tareas h2');

  // etiqueta
  let sel = $('#taskFilter');
  if(!sel){
    sel = document.createElement('select');
    sel.id='taskFilter'; sel.className='input'; sel.style.margin='8px 8px 12px 0';
    h2?.after(sel);
    sel.addEventListener('change', ()=>{ taskFilter = sel.value; renderTodos(); });
  }
  const items = storage.get(todoKey, []);
  const tags = Array.from(new Set(items.flatMap(t => (t.tags||[])))).sort();
  const cur = sel.value || 'ALL';
  sel.innerHTML = '<option value="ALL">Todas las etiquetas</option>'+tags.map(t=>`<option value="${t}">#${t}</option>`).join('');
  sel.value = tags.includes(cur) ? cur : 'ALL'; taskFilter = sel.value;

  // estado
  let stat = $('#taskStatus');
  if(!stat){
    stat = document.createElement('select');
    stat.id='taskStatus'; stat.className='input'; stat.style.margin='8px 8px 12px 0';
    sel.after(stat);
    stat.addEventListener('change', ()=>{ statusFilter = stat.value; renderTodos(); });
  }
  stat.innerHTML = `
    <option value="all">Todas</option>
    <option value="open">Abiertas</option>
    <option value="done">Completadas</option>
  `;
  stat.value = statusFilter;

  // orden
  let sortSel = $('#taskSort');
  if(!sortSel){
    sortSel = document.createElement('select');
    sortSel.id='taskSort'; sortSel.className='input'; sortSel.style.margin='8px 8px 12px 0';
    stat.after(sortSel);
    sortSel.addEventListener('change', ()=>{ taskSort = sortSel.value; renderTodos(); });
  }
  sortSel.innerHTML = `<option value="desc">Más nuevas arriba</option><option value="asc">Más antiguas arriba</option>`;
  sortSel.value = taskSort;

  // fecha exacta
  let dateInp = $('#taskDate');
  if(!dateInp){
    dateInp = document.createElement('input'); dateInp.type='date'; dateInp.id='taskDate'; dateInp.className='input'; dateInp.style.margin='8px 8px 12px 0';
    sortSel.after(dateInp);
    const clr = document.createElement('button'); clr.id='taskDateClear'; clr.className='btn ghost'; clr.textContent='✖ fecha'; clr.style.margin='8px 8px 12px 0';
    dateInp.after(clr);
    dateInp.addEventListener('change', ()=>{ filterDate = dateInp.value || ''; if(filterDate){ rangeFrom=''; rangeTo=''; $('#rangeFrom').value=''; $('#rangeTo').value=''; } renderTodos(); });
    clr.addEventListener('click', ()=>{ filterDate=''; dateInp.value=''; renderTodos(); });
  }
  dateInp.value = filterDate;

  // rango
  let rf = $('#rangeFrom');
  if(!rf){
    rf = document.createElement('input'); rf.type='date'; rf.id='rangeFrom'; rf.className='input'; rf.style.margin='8px 8px 12px 0';
    dateInp.nextSibling.after(rf);
    const rt = document.createElement('input'); rt.type='date'; rt.id='rangeTo'; rt.className='input'; rt.style.margin='8px 8px 12px 0';
    rf.after(rt);
    const rclr = document.createElement('button'); rclr.id='rangeClear'; rclr.className='btn ghost'; rclr.textContent='✖ rango'; rclr.style.margin='8px 8px 12px 0';
    rt.after(rclr);

    rf.addEventListener('change', ()=>{ rangeFrom = rf.value; if(rangeFrom){ filterDate=''; $('#taskDate').value=''; } renderTodos(); });
    rt.addEventListener('change', ()=>{ rangeTo   = rt.value; if(rangeTo){ filterDate=''; $('#taskDate').value=''; } renderTodos(); });
    rclr.addEventListener('click', ()=>{ rangeFrom=''; rangeTo=''; rf.value=''; rt.value=''; renderTodos(); });
  }
  rf.value = rangeFrom; $('#rangeTo').value = rangeTo;
}

// ===== Render =====
function renderTodos(){
  ensureTaskControls();
  const list = storage.get(todoKey, []);

  // etiqueta
  const inTag = (t)=> taskFilter==='ALL' ? true : (t.tags||[]).includes(taskFilter);
  // estado
  const inStatus = (t)=> statusFilter==='all' ? true : statusFilter==='open' ? !t.done : !!t.done;
  // fecha exacta o rango
  let inDate = ()=>true;
  if (filterDate){
    const [start, end] = dayBounds(filterDate);
    inDate = (t)=> t.ts>=start && t.ts<=end;
  } else if (rangeFrom && rangeTo){
    const [start, end] = rangeBounds(rangeFrom, rangeTo);
    inDate = (t)=> t.ts>=start && t.ts<=end;
  } else if (rangeFrom && !rangeTo){
    const [start, ] = dayBounds(rangeFrom);
    inDate = (t)=> t.ts>=start;
  } else if (!rangeFrom && rangeTo){
    const [, end] = dayBounds(rangeTo);
    inDate = (t)=> t.ts<=end;
  }

  // ordenar
  const sorted = list.slice().sort((a,b)=> taskSort==='desc' ? (b.ts - a.ts) : (a.ts - b.ts));

  const ul = $('#todoList'); if(!ul) return;
  ul.innerHTML = '';

  sorted.forEach((t, i) => {
    if (!inTag(t) || !inStatus(t) || !inDate(t)) return;
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.style.alignItems = 'center';

    // Fecha de creación (badge a la izquierda)
    const date = document.createElement('span');
    date.className = 'badge-date';
    date.textContent = formatDate(t.ts ?? Date.now());

    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.done;
    cb.addEventListener('change', () => toggleTodo(i));

    const txt = document.createElement('span'); txt.textContent = t.text; if(t.done) txt.style.textDecoration='line-through';

    left.append(date, cb, txt);

    (t.tags||[]).forEach(tag => {
      const chip = document.createElement('button');
      chip.className='tag'; chip.textContent = '#'+tag; chip.style.marginLeft='8px'; chip.style.cursor='pointer';
      Object.assign(chip.style, tagStyle(tag));
      chip.title = `Filtrar por #${tag}`;
      chip.addEventListener('click', (e)=>{
        e.preventDefault();
        const sel = $('#taskFilter'); if(sel){ sel.value = tag; sel.dispatchEvent(new Event('change')); }
      });
      left.append(chip);
    });

    const rm = document.createElement('button'); rm.className='btn ghost'; rm.textContent='✖'; rm.addEventListener('click', () => removeTodo(i));
    li.append(left, rm); ul.append(li);
  });

  updateKpiTasks();
  storage.set(todoKey, list);
}

// ===== CRUD =====
function addTodo(input){
  const list = storage.get(todoKey, []);
  const { tags, cleanText } = parseTags(input);
  const text = cleanText || input;
  const now = Date.now();
  list.push({ text, tags, done:false, ts: now, doneTs: null });
  storage.set(todoKey, list);
  renderTodos();
  const tagStr = tags?.length ? ` (${tags.map(t=>'#'+t).join(' ')})` : '';
  pushActivity('Nueva tarea: ' + text + tagStr);
  window.dispatchEvent(new Event('storage'));
}
function removeTodo(i){
  const list = storage.get(todoKey, []);
  const [x] = list.splice(i,1);
  storage.set(todoKey, list);
  renderTodos();
  pushActivity('Tarea eliminada: ' + (x?.text ?? i));
  window.dispatchEvent(new Event('storage'));
}
function toggleTodo(i){
  const list = storage.get(todoKey, []);
  list[i].done = !list[i].done;
  list[i].doneTs = list[i].done ? Date.now() : null;
  storage.set(todoKey, list);
  renderTodos();
  pushActivity('Tarea ' + (list[i].done ? 'completada' : 'reactivada') + ': ' + list[i].text);
  window.dispatchEvent(new Event('storage'));
}

// ===== KPI =====
function updateKpiTasks(){
  const list = storage.get(todoKey, []);
  const open = list.filter(t=>!t.done).length;
  const k = document.querySelector('#kpiTasks');
  const d = document.querySelector('#kpiTasksDetail');
  if (k) k.textContent = open;
  if (d) d.textContent = `${list.length} total, ${open} abiertas`;
}

// ===== Inputs =====
$('#addTodo')?.addEventListener('click', () => {
  const val = $('#todoInput').value.trim(); if(!val) return; addTodo(val); $('#todoInput').value='';
});
$('#todoInput')?.addEventListener('keydown', e => { if(e.key==='Enter') $('#addTodo').click(); });

// ===== Notes =====
const notesKey = 'dashone.notes';
const notes = $('#notes');
if (notes){
  notes.value = storage.get(notesKey, 'Escribe aquí tus ideas…');
  notes.addEventListener('input', e => storage.set(notesKey, e.target.value));
}

// ===== Global Search =====
document.addEventListener('keydown', e => { if(e.ctrlKey && e.key === '/'){ e.preventDefault(); $('#globalSearch')?.focus(); }});
$('#globalSearch')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const hits = [];
  storage.get(todoKey, []).forEach(t => {
    const hay = (t.text.toLowerCase().includes(q) || (t.tags||[]).some(tag => ('#'+tag).includes(q)));
    if(hay) hits.push('Tarea: ' + t.text);
  });
  const hasNotes = storage.get('dashone.notes', '').toLowerCase().includes(q);
  if (hasNotes) hits.push('Notas: coincidencia');
  if (q.length > 1) pushActivity(`Búsqueda: "${q}" → ${hits.length} resultado(s)`);
});

// ===== Activity Feed =====
function pushActivity(text){
  const ul = $('#activity'); if(!ul) return;
  const li = document.createElement('li');
  const left = document.createElement('div'); left.textContent = text;
  const time = document.createElement('small'); time.className='muted'; time.textContent = new Date().toLocaleTimeString();
  li.append(left, time);
  ul.prepend(li);
}

// ===== Init =====
function init(){
  renderLinks(); renderTodos();
  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();
  pushActivity('Bienvenido a DashOne ✨');
}
document.addEventListener('DOMContentLoaded', init);
