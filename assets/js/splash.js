
// DashOne — splash.js
(function(){ function hideSplash(){ const s=document.getElementById('splash'); if(s){ s.classList.add('fade-out'); setTimeout(()=>s.remove(),450);} } window.addEventListener('load',hideSplash); setTimeout(hideSplash,2200); })();
