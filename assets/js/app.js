// DashOne — app.js (v0.2)

// ===== Utilidades =====
const $ = (sel, par=document) => par.querySelector(sel);
const $$ = (sel, par=document) => [...par.querySelectorAll(sel)];
const storage = {
  get: (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def } catch { return def } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

// ===== Reloj =====
function tickClock(){
  const now = new Date();
  const el = $('#clock');
  if (el) el.textContent = now.toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' });
}
setInterval(tickClock, 1000); tickClock();

// ===== Tema =====
const themePref = storage.get('theme', (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
document.documentElement.setAttribute('data-theme', themePref);
const themeToggle = $('#themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    storage.set('theme', next);
    pushActivity(`Tema cambiado a ${next}`);
  });
}

// ===== Enlaces rápidos =====
const linksStoreKey = 'dashone.links';
function renderLinks(){
  const links = storage.get(linksStoreKey, [
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
    rm.addEventListener('click', () => { removeLink(link); });
    li.append(a, rm); ul.append(li);
  }
  storage.set(linksStoreKey, links);
}
function removeLink(l){
  const links = storage.get(linksStoreKey, []);
  storage.set(linksStoreKey, links.filter(x => x.url !== l.url));
  renderLinks();
  pushActivity(`Eliminaste acceso: ${l.label}`);
}
const addLinkBtn = $('#addLink');
if (addLinkBtn){
  addLinkBtn.addEventListener('click', () => {
    const label = prompt('Nombre del acceso'); if(!label) return;
    const url = prompt('URL completa (https://...)'); if(!url) return;
    const links = storage.get(linksStoreKey, []); links.push({label, url}); storage.set(linksStoreKey, links);
    renderLinks(); pushActivity(`Agregaste acceso: ${label}`);
  });
}

// ===== Tareas =====
const todoKey = 'dashone.todo';
function renderTodos(){
  const list = storage.get(todoKey, []);
  const ul = $('#todoList'); if(!ul) return;
  ul.innerHTML = '';
  list.forEach((t, i) => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.done; cb.addEventListener('change', () => toggleTodo(i));
    const txt = document.createElement('span'); txt.textContent = t.text; if(t.done) txt.style.textDecoration='line-through';
    left.append(cb, txt);
    const rm = document.createElement('button'); rm.className='btn ghost'; rm.textContent='✖'; rm.addEventListener('click', () => removeTodo(i));
    li.append(left, rm); ul.append(li);
  });
  updateKpiTasks();
  storage.set(todoKey, list);
}
function addTodo(text){
  const list = storage.get(todoKey, []); list.push({ text, done:false, ts: Date.now() }); storage.set(todoKey, list);
  renderTodos(); pushActivity(`Nueva tarea: ${text}`);
}
function removeTodo(i){
  const list = storage.get(todoKey, []); const [x] = list.splice(i,1); storage.set(todoKey, list); renderTodos();
  pushActivity(`Tarea eliminada: ${x?.text ?? i}`);
}
function toggleTodo(i){
  const list = storage.get(todoKey, []); list[i].done = !list[i].done; storage.set(todoKey, list); renderTodos();
  pushActivity(`Tarea ${list[i].done?'completada':'reactivada'}: ${list[i].text}`);
}
function updateKpiTasks(){
  const list = storage.get(todoKey, []);
  const open = list.filter(t=>!t.done).length;
  const kpi = $('#kpiTasks'); const det = $('#kpiTasksDetail');
  if (kpi) kpi.textContent = open;
  if (det) det.textContent = `${list.length} total, ${open} abiertas`;
}
const addTodoBtn = $('#addTodo'); const todoInput = $('#todoInput');
if (addTodoBtn && todoInput){
  addTodoBtn.addEventListener('click', () => {
    const val = todoInput.value.trim(); if(!val) return; addTodo(val); todoInput.value='';
  });
  todoInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ addTodoBtn.click(); }});
}

// ===== Notas =====
const notesKey = 'dashone.notes';
const notesArea = $('#notes');
if (notesArea){
  notesArea.value = storage.get(notesKey, 'Escribe aquí tus ideas…');
  notesArea.addEventListener('input', (e)=> storage.set(notesKey, e.target.value));
}

// ===== Búsqueda global (demo) =====
document.addEventListener('keydown', (e)=>{ if(e.ctrlKey && e.key === '/'){ e.preventDefault(); $('#globalSearch')?.focus(); }});
const globalSearch = $('#globalSearch');
if (globalSearch){
  globalSearch.addEventListener('input', (e)=>{
    const q = e.target.value.toLowerCase();
    const hits = [];
    storage.get(todoKey, []).forEach(t=>{ if(t.text.toLowerCase().includes(q)) hits.push('Tarea: '+t.text); });
    const notes = storage.get(notesKey, ''); if(notes.toLowerCase().includes(q)) hits.push('Notas: coincidencia');
    if(q.length>1) pushActivity(`Búsqueda: "${q}" → ${hits.length} resultado(s)`);
  });
}

// ===== Actividad =====
function pushActivity(text){
  const ul = $('#activity'); if(!ul) return;
  const li = document.createElement('li');
  const left = document.createElement('div');
  left.textContent = text;
  const time = document.createElement('small'); time.className='muted'; time.textContent = new Date().toLocaleTimeString();
  li.append(left, time);
  ul.prepend(li);
}

// ===== Sparkline demo en canvas (placeholder) =====
function drawSpark(){
  const c = $('#spark'); if(!c) return;
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height; ctx.clearRect(0,0,w,h);
  // eje base
  ctx.globalAlpha = .3; ctx.strokeStyle = '#888'; ctx.beginPath(); ctx.moveTo(20, h-20); ctx.lineTo(w-20, h-20); ctx.stroke(); ctx.globalAlpha = 1;
  // datos aleatorios (demo)
  const points = Array.from({length: 24}, (_,i)=> ({ x: 20 + i*((w-40)/23), y: 20 + Math.random()*(h-60) }));
  ctx.lineWidth = 2.5; const grad = ctx.createLinearGradient(0,0,w,0); grad.addColorStop(0,'#3b82f6'); grad.addColorStop(1,'#22d3ee'); ctx.strokeStyle = grad;
  ctx.beginPath(); points.forEach((p,i)=>{ i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y); }); ctx.stroke();
  // sombra ligera
  ctx.globalAlpha = .15; ctx.lineWidth = 10; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 2.5;
}

// ===== Init =====
function init(){
  renderLinks(); renderTodos(); drawSpark();
  const year = $('#year'); if (year) year.textContent = new Date().getFullYear();
  pushActivity('Bienvenido a DashOne ✨');
}
document.addEventListener('DOMContentLoaded', init);