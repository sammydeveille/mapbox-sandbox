export const fetchAirQuality = (lat: number, lng: number) =>
  fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5,european_aqi`)
    .then(r => r.json());
