// DashOne — widget-weather.js
(function(){
  const nowEl = document.getElementById('weatherNow');
  const dailyEl = document.getElementById('weatherDaily');
  const locateBtn = document.getElementById('locate');

  const fallback = { lat: 25.6866, lon: -100.3161, name: 'Monterrey' }; // Fallback si no hay geolocalización

  async function fetchWeather(lat, lon){
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('No se pudo obtener el clima');
    return await res.json();
  }

  function codeToEmoji(code){
    // Mapeo simple de códigos a emojis (resumen)
    if([0].includes(code)) return '☀️ Despejado';
    if([1,2,3].includes(code)) return '⛅ Parcial';
    if([45,48].includes(code)) return '🌫️ Niebla';
    if([51,53,55,56,57].includes(code)) return '🌦️ Llovizna';
    if([61,63,65,66,67,80,81,82].includes(code)) return '🌧️ Lluvia';
    if([71,73,75,77,85,86].includes(code)) return '❄️ Nieve';
    if([95,96,99].includes(code)) return '⛈️ Tormenta';
    return '🌡️';
  }

  function renderNow(data, place){
    const t = Math.round(data.current.temperature_2m);
    const desc = codeToEmoji(data.current.weather_code);
    nowEl.querySelector('.w-temp').textContent = `${t}°`;
    nowEl.querySelector('.w-desc').textContent = `${desc} — ${place}`;
  }

  function renderDaily(data){
    const days = data.daily.time.map((d,i)=> ({
      date: new Date(d),
      tmax: Math.round(data.daily.temperature_2m_max[i]),
      tmin: Math.round(data.daily.temperature_2m_min[i]),
      code: data.daily.weather_code[i]
    }));
    dailyEl.innerHTML = '';
    const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
    days.slice(0,7).forEach(d => {
      const div = document.createElement('div');
      div.className = 'w-day';
      div.innerHTML = `<small>${fmt.format(d.date)}</small><strong>${d.tmax}°</strong><small class="muted">${d.tmin}° · ${codeToEmoji(d.code).split(' ')[0]}</small>`;
      dailyEl.appendChild(div);
    });
  }

  async function initWeather(){
    try{
      const data = await fetchWeather(fallback.lat, fallback.lon);
      renderNow(data, fallback.name);
      renderDaily(data);
    }catch(e){
      console.error(e);
      nowEl.querySelector('.w-desc').textContent = 'No fue posible obtener el clima.';
    }
  }

  locateBtn?.addEventListener('click', async ()=>{
    if(!('geolocation' in navigator)) return alert('Geolocalización no soportada');
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      try{
        const data = await fetchWeather(lat, lon);
        renderNow(data, `(${lat}, ${lon})`);
        renderDaily(data);
      }catch(e){ alert('No se pudo obtener el clima de tu ubicación'); }
    }, ()=> alert('No se pudo obtener tu ubicación'));
  });

  initWeather();
})();