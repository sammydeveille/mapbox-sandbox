import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(dir, '../../../.env') });

const OWNER_ID = 'd2767a51-58a5-43aa-b0c6-4e303755f776';

async function main() {
  const client = new pg.Client({
    host: process.env.POSTGRES_HOST_LOCAL,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });
  await client.connect();

  await client.query(
    `INSERT INTO user_profile (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
    [OWNER_ID]
  );

  const collectionId = 'a0000000-0000-0000-0000-000000000002';
  await client.query(
    `INSERT INTO collection (id, owner_id, name, description, temporal_start, temporal_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [
      collectionId,
      OWNER_ID,
      'Global Phenomena 2024',
      'Worldwide events: earthquakes, volcanic eruptions, ocean temperatures, and flight routes',
      '2024-01-01T00:00:00Z',
      '2024-12-31T23:59:59Z',
    ]
  );
  console.log('Collection: Global Phenomena 2024');

  // --- Layer 1: Earthquakes (point) - magnitude as value ---
  const quakeLayerId = 'c0000000-0000-0000-0000-000000000001';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'mercator') ON CONFLICT (id) DO NOTHING`,
    [quakeLayerId, collectionId, 'Earthquakes M5+', 'point']
  );

  const earthquakes = [
    { lng: 141.0, lat: 37.5, ts: '2024-01-01T06:10:00Z', val: 7.5, meta: { region: 'Japan, Noto Peninsula' } },
    { lng: -70.6, lat: -33.4, ts: '2024-01-22T12:30:00Z', val: 6.2, meta: { region: 'Chile, Santiago' } },
    { lng: 121.5, lat: 23.8, ts: '2024-04-03T07:58:00Z', val: 7.4, meta: { region: 'Taiwan, Hualien' } },
    { lng: 46.3, lat: 38.4, ts: '2024-01-28T05:09:00Z', val: 5.9, meta: { region: 'Iran, Tabriz' } },
    { lng: 95.9, lat: 3.5, ts: '2024-02-15T14:22:00Z', val: 6.0, meta: { region: 'Indonesia, Sumatra' } },
    { lng: -155.3, lat: 19.4, ts: '2024-03-10T09:45:00Z', val: 5.7, meta: { region: 'Hawaii, Big Island' } },
    { lng: 28.9, lat: 40.7, ts: '2024-05-20T03:12:00Z', val: 5.5, meta: { region: 'Turkey, Marmara' } },
    { lng: 139.0, lat: -6.2, ts: '2024-06-08T18:30:00Z', val: 6.8, meta: { region: 'Papua New Guinea' } },
    { lng: -117.2, lat: 34.1, ts: '2024-07-15T11:00:00Z', val: 5.2, meta: { region: 'California, USA' } },
    { lng: 73.0, lat: 36.5, ts: '2024-08-22T02:45:00Z', val: 6.3, meta: { region: 'Afghanistan, Hindu Kush' } },
    { lng: -104.0, lat: 17.5, ts: '2024-09-19T13:14:00Z', val: 6.1, meta: { region: 'Mexico, Guerrero' } },
    { lng: 131.1, lat: -3.7, ts: '2024-10-05T08:20:00Z', val: 5.8, meta: { region: 'Indonesia, Maluku' } },
    { lng: 44.4, lat: 33.3, ts: '2024-11-12T16:55:00Z', val: 5.4, meta: { region: 'Iraq, Baghdad' } },
    { lng: 172.5, lat: -43.5, ts: '2024-12-01T22:10:00Z', val: 6.5, meta: { region: 'New Zealand, Canterbury' } },
  ];

  for (const p of earthquakes) {
    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value, metadata)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)`,
      [quakeLayerId, p.lng, p.lat, p.ts, 'instant', p.val, JSON.stringify(p.meta)]
    );
  }
  console.log(`  Earthquakes M5+: ${earthquakes.length} events`);

  // --- Layer 2: Ocean Surface Temperature (heatmap) ---
  const oceanLayerId = 'c0000000-0000-0000-0000-000000000002';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'mercator') ON CONFLICT (id) DO NOTHING`,
    [oceanLayerId, collectionId, 'Ocean Surface Temp', 'heatmap']
  );

  const oceanPoints = [];
  // Generate ocean temperature readings across major oceans
  const oceanRegions = [
    { name: 'Pacific Equatorial', lngRange: [-180, -80], latRange: [-10, 10], baseTemp: 28 },
    { name: 'Atlantic Gulf Stream', lngRange: [-80, -10], latRange: [25, 45], baseTemp: 22 },
    { name: 'Indian Ocean', lngRange: [50, 100], latRange: [-20, 10], baseTemp: 27 },
    { name: 'North Atlantic', lngRange: [-60, 0], latRange: [45, 65], baseTemp: 12 },
    { name: 'South Pacific', lngRange: [150, 180], latRange: [-40, -20], baseTemp: 16 },
  ];

  for (const region of oceanRegions) {
    for (let month = 1; month <= 12; month++) {
      for (let i = 0; i < 8; i++) {
        const lng = region.lngRange[0] + Math.random() * (region.lngRange[1] - region.lngRange[0]);
        const lat = region.latRange[0] + Math.random() * (region.latRange[1] - region.latRange[0]);
        // Temperature varies by season (northern hemisphere summer = warmer)
        const seasonalOffset = Math.sin((month - 1) / 12 * Math.PI * 2) * 4;
        const val = region.baseTemp + seasonalOffset + (Math.random() - 0.5) * 3;
        const ts = `2024-${String(month).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}T12:00:00Z`;
        oceanPoints.push({ lng, lat, ts, val });
      }
    }
  }

  for (const p of oceanPoints) {
    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6)`,
      [oceanLayerId, p.lng, p.lat, p.ts, 'month', p.val]
    );
  }
  console.log(`  Ocean Surface Temp: ${oceanPoints.length} readings`);

  // --- Layer 3: International Flight Route (route) ---
  const flightLayerId = 'c0000000-0000-0000-0000-000000000003';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'mercator') ON CONFLICT (id) DO NOTHING`,
    [flightLayerId, collectionId, 'Round-the-World Flight', 'route']
  );

  // A round-the-world flight route with waypoints
  const flightRoute = [
    { lng: -0.46, lat: 51.47, ts: '2024-06-01T08:00:00Z', val: 0, meta: { city: 'London Heathrow' } },
    { lng: 12.35, lat: 41.80, ts: '2024-06-01T11:30:00Z', val: 2000, meta: { city: 'Rome' } },
    { lng: 32.01, lat: 46.97, ts: '2024-06-01T14:00:00Z', val: 4500, meta: { city: 'Over Black Sea' } },
    { lng: 51.38, lat: 35.69, ts: '2024-06-01T17:00:00Z', val: 6200, meta: { city: 'Tehran' } },
    { lng: 72.88, lat: 19.09, ts: '2024-06-01T21:00:00Z', val: 8500, meta: { city: 'Mumbai' } },
    { lng: 100.75, lat: 13.69, ts: '2024-06-02T02:00:00Z', val: 11000, meta: { city: 'Bangkok' } },
    { lng: 113.91, lat: 22.31, ts: '2024-06-02T05:00:00Z', val: 12500, meta: { city: 'Hong Kong' } },
    { lng: 139.69, lat: 35.69, ts: '2024-06-02T09:00:00Z', val: 14800, meta: { city: 'Tokyo' } },
    { lng: -157.86, lat: 21.31, ts: '2024-06-02T18:00:00Z', val: 20000, meta: { city: 'Honolulu' } },
    { lng: -122.38, lat: 37.62, ts: '2024-06-03T02:00:00Z', val: 24000, meta: { city: 'San Francisco' } },
    { lng: -87.63, lat: 41.88, ts: '2024-06-03T07:00:00Z', val: 27000, meta: { city: 'Chicago' } },
    { lng: -73.94, lat: 40.67, ts: '2024-06-03T10:00:00Z', val: 29000, meta: { city: 'New York' } },
    { lng: -0.46, lat: 51.47, ts: '2024-06-03T18:00:00Z', val: 35000, meta: { city: 'London Heathrow' } },
  ];

  for (const p of flightRoute) {
    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value, metadata)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)`,
      [flightLayerId, p.lng, p.lat, p.ts, 'instant', p.val, JSON.stringify(p.meta)]
    );
  }
  console.log(`  Round-the-World Flight: ${flightRoute.length} waypoints`);

  // --- Layer 4: Volcanic Activity (cluster) ---
  const volcanoLayerId = 'c0000000-0000-0000-0000-000000000004';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'mercator') ON CONFLICT (id) DO NOTHING`,
    [volcanoLayerId, collectionId, 'Active Volcanoes', 'cluster']
  );

  // Ring of Fire + other active volcanic regions
  const volcanoes = [
    // Pacific Ring of Fire
    { lng: 141.0, lat: 31.9, meta: { name: 'Mount Fuji area' } },
    { lng: 130.7, lat: 31.6, meta: { name: 'Sakurajima' } },
    { lng: 127.9, lat: -3.6, meta: { name: 'Banda Api' } },
    { lng: 110.4, lat: -7.5, meta: { name: 'Merapi' } },
    { lng: 121.0, lat: 14.5, meta: { name: 'Taal' } },
    { lng: 155.3, lat: -6.1, meta: { name: 'Rabaul' } },
    { lng: 168.1, lat: -16.3, meta: { name: 'Ambrym' } },
    { lng: 176.0, lat: -38.3, meta: { name: 'White Island' } },
    { lng: -175.5, lat: -20.5, meta: { name: 'Hunga Tonga' } },
    { lng: -155.3, lat: 19.4, meta: { name: 'Kilauea' } },
    { lng: -122.2, lat: 46.2, meta: { name: 'Mount St. Helens' } },
    { lng: -152.1, lat: 60.5, meta: { name: 'Redoubt' } },
    { lng: 166.9, lat: 52.8, meta: { name: 'Cleveland' } },
    { lng: 160.3, lat: 56.1, meta: { name: 'Klyuchevskoy' } },
    // Iceland
    { lng: -19.6, lat: 63.6, meta: { name: 'Eyjafjallajökull' } },
    { lng: -22.3, lat: 63.9, meta: { name: 'Fagradalsfjall' } },
    // Italy
    { lng: 14.4, lat: 40.8, meta: { name: 'Vesuvius' } },
    { lng: 15.0, lat: 37.7, meta: { name: 'Etna' } },
    { lng: 15.2, lat: 38.8, meta: { name: 'Stromboli' } },
    // East Africa
    { lng: 36.3, lat: -2.8, meta: { name: 'Ol Doinyo Lengai' } },
    { lng: 29.2, lat: -1.5, meta: { name: 'Nyiragongo' } },
    // South America
    { lng: -71.6, lat: -39.4, meta: { name: 'Villarrica' } },
    { lng: -78.4, lat: -0.7, meta: { name: 'Cotopaxi' } },
    { lng: -67.7, lat: -22.3, meta: { name: 'Lascar' } },
  ];

  for (const v of volcanoes) {
    // Each volcano has multiple activity readings throughout the year
    const numReadings = 3 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numReadings; i++) {
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      const ts = `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:00:00Z`;
      const val = Math.random() * 100; // activity index
      // Add slight position jitter for clustering
      const lng = v.lng + (Math.random() - 0.5) * 0.5;
      const lat = v.lat + (Math.random() - 0.5) * 0.5;
      await client.query(
        `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value, metadata)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)`,
        [volcanoLayerId, lng, lat, ts, 'day', val, JSON.stringify(v.meta)]
      );
    }
  }
  console.log(`  Active Volcanoes: ~${volcanoes.length * 5} readings`);

  // --- Layer 5: Climate Zones (choropleth) ---
  const climateLayerId = 'c0000000-0000-0000-0000-000000000005';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'mercator') ON CONFLICT (id) DO NOTHING`,
    [climateLayerId, collectionId, 'CO₂ by Region', 'choropleth']
  );

  // Simplified continental regions with CO2 emission indices
  const regions = [
    { name: 'North America', polygon: [[-130, 25], [-60, 25], [-60, 55], [-130, 55], [-130, 25]], baseVal: 85 },
    { name: 'Europe', polygon: [[-10, 35], [40, 35], [40, 60], [-10, 60], [-10, 35]], baseVal: 72 },
    { name: 'East Asia', polygon: [100, 20, 145, 20, 145, 50, 100, 50, 100, 20], baseVal: 90 },
    { name: 'South America', polygon: [[-80, -55], [-35, -55], [-35, 10], [-80, 10], [-80, -55]], baseVal: 35 },
    { name: 'Africa', polygon: [[-20, -35], [50, -35], [50, 35], [-20, 35], [-20, -35]], baseVal: 25 },
    { name: 'Oceania', polygon: [[110, -45], [180, -45], [180, -10], [110, -10], [110, -45]], baseVal: 55 },
  ];

  for (const region of regions) {
    for (let month = 1; month <= 12; month++) {
      const ts = `2024-${String(month).padStart(2, '0')}-01T00:00:00Z`;
      // Slight seasonal variation
      const seasonalOffset = Math.sin((month - 1) / 12 * Math.PI * 2) * 5;
      const val = region.baseVal + seasonalOffset;
      
      let coords: number[][];
      if (Array.isArray(region.polygon[0])) {
        coords = region.polygon as number[][];
      } else {
        // Flat array format [lng1, lat1, lng2, lat2, ...]
        const flat = region.polygon as number[];
        coords = [];
        for (let i = 0; i < flat.length; i += 2) {
          coords.push([flat[i], flat[i + 1]]);
        }
      }
      
      const wkt = coords.map(([lng, lat]) => `${lng} ${lat}`).join(',');
      await client.query(
        `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value, metadata)
         VALUES ($1, ST_SetSRID(ST_GeomFromText('POLYGON((${wkt}))'), 4326), $2, $3, $4, $5)`,
        [climateLayerId, ts, 'month', val, JSON.stringify({ region: region.name })]
      );
    }
  }
  console.log(`  CO₂ by Region: ${regions.length * 12} polygons`);

  console.log('\n✅ Global Phenomena 2024 collection seeded!');
  console.log('Layers: Earthquakes (point), Ocean Temp (heatmap), Flight Route (route), Volcanoes (cluster), CO₂ (choropleth)');

  await client.end();
}

main().catch(console.error);
