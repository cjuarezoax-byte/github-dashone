// DashOne — widget-weekly.js
(function(){
  const $ = (s, p=document)=>p.querySelector(s);
  const storage = { get:(k,d)=>{ try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } } };
  const todoKey = 'dashone.todo';
  const listEl = $('#weeklyList');
  const canvas = $('#weeklyChart');
  const ctx = canvas.getContext('2d');

  function getWeekData(){
    const items = storage.get(todoKey, []);
    const now = new Date();
    const data = [];
    for(let i=6; i>=0; i--){
      const day = new Date(now); day.setDate(now.getDate()-i);
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0,0,0).getTime();
      const end   = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23,59,59).getTime();
      const added = items.filter(t=> t.ts>=start && t.ts<=end).length;
      const done  = items.filter(t=> t.done && t.ts<=end && (!t.doneTs || (t.doneTs>=start && t.doneTs<=end))).length; // best effort
      data.push({ day, added, done });
    }
    return data;
  }

  function renderList(data){
    listEl.innerHTML = '';
    const fmt = new Intl.DateTimeFormat(undefined, { weekday:'long', month:'short', day:'numeric' });
    data.forEach(d=>{
      const li = document.createElement('li');
      li.innerHTML = `<strong style="min-width:120px">${fmt.format(d.day)}</strong> <span class="tag ok">${d.done} hechas</span> <span class="tag">${d.added} nuevas</span>`;
      listEl.appendChild(li);
    });
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

    // added line
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#22d3ee';
    ctx.beginPath(); data.forEach((d,i)=> i?ctx.lineTo(30+i*xStep, y(d.added)):ctx.moveTo(30, y(d.added))); ctx.stroke();

    // done line
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#3b82f6';
    ctx.beginPath(); data.forEach((d,i)=> i?ctx.lineTo(30+i*xStep, y(d.done)):ctx.moveTo(30, y(d.done))); ctx.stroke();

    // labels
    ctx.fillStyle = '#888'; ctx.font = '12px system-ui';
    data.forEach((d,i)=>{ const label = new Intl.DateTimeFormat(undefined,{weekday:'short'}).format(d.day); ctx.fillText(label, 24+i*xStep, h-6); });
  }

  function init(){
    const data = getWeekData();
    renderList(data);
    renderChart(data);
  }

  window.addEventListener('storage', init);
  document.addEventListener('DOMContentLoaded', init);
})();