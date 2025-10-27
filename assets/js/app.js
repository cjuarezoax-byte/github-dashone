// DashOne — app.js (v0.5 TAGS)

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

// ===== Tasks (con #tags) =====
const todoKey = 'dashone.todo';

function parseTags(text){
  // Extrae #hashtags del texto, devuelve [tags, cleanText]
  const re = /#([\p{L}\p{N}_-]+)/giu;
  const tags = [];
  const clean = text.replace(re, (_,t)=>{ tags.push(t.toLowerCase()); return ''; }).replace(/\s{2,}/g,' ').trim();
  return { tags: Array.from(new Set(tags)), cleanText: clean };
}

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

    // chips de tag
    const chips = document.createElement('div');
    (t.tags||[]).forEach(tag => {
      const chip = document.createElement('span'); chip.className='tag'; chip.textContent = '#'+tag;
      chip.style.marginLeft = '8px'; left.append(chip);
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
  list.push({ text, tags, done:false, ts: Date.now(), doneTs: null });
  storage.set(todoKey, list);
  renderTodos();
  const tagStr = tags?.length ? ` (${tags.map(t=>'#'+t).join(' ')})` : '';
  pushActivity('Nueva tarea: ' + text + tagStr);
  window.dispatchEvent(new Event('storage')); // notifica a widgets
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
