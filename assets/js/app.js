// DashOne — app.js (v0.8 TAG COLORS + CREATED DATE)
// Tareas con #etiquetas, filtro, colores por hash y FECHA de creación visible

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

// ===== Tasks (con #tags + FILTRO + COLORES + FECHA) =====
const todoKey = 'dashone.todo';
let taskFilter = 'ALL'; // etiqueta activa para el listado

function parseTags(text){
  // Extrae #hashtags del texto, devuelve [tags, cleanText]
  const re = /#([\p{L}\p{N}_-]+)/giu;
  const tags = [];
  const clean = text.replace(re, (_,t)=>{ tags.push(t.toLowerCase()); return ''; }).replace(/\s{2,}/g,' ').trim();
  return { tags: Array.from(new Set(tags)), cleanText: clean };
}

// Color persistente por hash de etiqueta
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
  return { backgroundColor: bg, borderColor: bd, color: fg };
}

// Formato de fecha corto
function formatDate(ts){
  const d = new Date(ts);
  // Ej: 27 Oct, 14:05
  const dd = d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  const hh = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${dd} · ${hh}`;
}

// Inserta UI de filtro debajo del H2 de Tareas
function ensureTaskFilterUI(){
  let sel = $('#taskFilter');
  if (!sel){
    sel = document.createElement('select');
    sel.id = 'taskFilter';
    sel.className = 'input';
    sel.style.margin = '8px 0 12px';
    const h2 = $('#tareas h2');
    h2?.after(sel);
    sel.addEventListener('change', ()=>{
      taskFilter = sel.value;
      renderTodos();
      pushActivity(taskFilter==='ALL' ? 'Filtro de tareas: todas' : `Filtro de tareas: #${taskFilter}`);
    });
  }
  const items = storage.get(todoKey, []);
  const tags = Array.from(new Set(items.flatMap(t => (t.tags||[])))).sort();
  const cur = sel.value || 'ALL';
  sel.innerHTML = '<option value="ALL">Todas las etiquetas</option>' + tags.map(t=>`<option value="${t}">#${t}</option>`).join('');
  sel.value = tags.includes(cur) ? cur : 'ALL';
  taskFilter = sel.value;
}

function renderTodos(){
  ensureTaskFilterUI();
  const list = storage.get(todoKey, []);
  const inFilter = (t)=> taskFilter==='ALL' ? true : (t.tags||[]).includes(taskFilter);

  const ul = $('#todoList'); if(!ul) return;
  ul.innerHTML = '';

  list.forEach((t, i) => {
    if (!inFilter(t)) return;
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.style.alignItems = 'center';

    // Fecha de creación (badge a la izquierda)
    const date = document.createElement('span');
    date.className = 'badge-date';
    date.textContent = formatDate(t.ts ?? Date.now());

    // Checkbox
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.done;
    cb.addEventListener('change', () => toggleTodo(i));

    // Texto
    const txt = document.createElement('span'); txt.textContent = t.text; if(t.done) txt.style.textDecoration='line-through';

    left.append(date, cb, txt);

    // chips de tag clicables (con color)
    (t.tags||[]).forEach(tag => {
      const chip = document.createElement('button');
      chip.className='tag'; chip.textContent = '#'+tag; chip.style.marginLeft='8px'; chip.style.cursor='pointer';
      const s = tagStyle(tag); Object.assign(chip.style, s);
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
  window.dispatchEvent(new Event('storage')); // notifica a widgets (weekly)
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

function updateKpiTasks(){
  const list = storage.get(todoKey, []);
  const open = list.filter(t=>!t.done).length;
  const k = document.querySelector('#kpiTasks');
  const d = document.querySelector('#kpiTasksDetail');
  if (k) k.textContent = open;
  if (d) d.textContent = `${list.length} total, ${open} abiertas`;
}

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

// ===== Global Search (demo) =====
document.addEventListener('keydown', e => { if(e.ctrlKey && e.key === '/'){ e.preventDefault(); $('#globalSearch')?.focus(); }});
$('#globalSearch')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const hits = [];
  storage.get(todoKey, []).forEach(t => {
    const hay = (t.text.toLowerCase().includes(q) || (t.tags||[]).some(tag => ('#'+tag).includes(q)));
    if(hay) hits.push('Tarea: ' + t.text);
  });
  const hasNotes = storage.get(notesKey, '').toLowerCase().includes(q);
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
