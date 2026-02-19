export const fetchWeather = (lat: number, lng: number) =>
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`)
    .then(r => r.json());
