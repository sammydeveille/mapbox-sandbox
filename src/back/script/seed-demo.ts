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

  // Ensure user profile exists
  await client.query(
    `INSERT INTO user_profile (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
    [OWNER_ID]
  );

  // Create demo collection
  const collRes = await client.query(
    `INSERT INTO collection (id, owner_id, name, description, temporal_start, temporal_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [
      'a0000000-0000-0000-0000-000000000001',
      OWNER_ID,
      'London Demo Collection',
      'Showcases all render types and temporal features across London',
      '2024-01-01T00:00:00Z',
      '2024-12-31T23:59:59Z',
    ]
  );
  const collectionId = 'a0000000-0000-0000-0000-000000000001';
  console.log('Collection created:', collectionId);

  // --- Layer 1: Points (temperature sensors) ---
  const pointLayerId = 'b0000000-0000-0000-0000-000000000001';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'globe') ON CONFLICT (id) DO NOTHING`,
    [pointLayerId, collectionId, 'Temperature Sensors', 'point']
  );

  const pointData = [
    { lng: -0.1278, lat: 51.5074, ts: '2024-01-15T08:00:00Z', val: 5.2, meta: { station: 'Westminster' } },
    { lng: -0.0762, lat: 51.5080, ts: '2024-02-15T08:00:00Z', val: 6.8, meta: { station: 'Tower Bridge' } },
    { lng: -0.1426, lat: 51.5014, ts: '2024-03-15T08:00:00Z', val: 9.1, meta: { station: 'Victoria' } },
    { lng: -0.1180, lat: 51.5136, ts: '2024-04-15T08:00:00Z', val: 12.4, meta: { station: 'Holborn' } },
    { lng: -0.0886, lat: 51.5133, ts: '2024-05-15T08:00:00Z', val: 16.7, meta: { station: 'Whitechapel' } },
    { lng: -0.1534, lat: 51.5194, ts: '2024-06-15T08:00:00Z', val: 21.3, meta: { station: 'Regent Park' } },
    { lng: -0.1965, lat: 51.5052, ts: '2024-07-15T08:00:00Z', val: 25.1, meta: { station: 'Kensington' } },
    { lng: -0.1015, lat: 51.5176, ts: '2024-08-15T08:00:00Z', val: 24.8, meta: { station: 'Clerkenwell' } },
    { lng: -0.0641, lat: 51.5048, ts: '2024-09-15T08:00:00Z', val: 19.2, meta: { station: 'Canary Wharf' } },
    { lng: -0.1337, lat: 51.5246, ts: '2024-10-15T08:00:00Z', val: 13.5, meta: { station: 'Camden' } },
    { lng: -0.1750, lat: 51.4993, ts: '2024-11-15T08:00:00Z', val: 8.3, meta: { station: 'South Kensington' } },
    { lng: -0.1100, lat: 51.4950, ts: '2024-12-15T08:00:00Z', val: 4.9, meta: { station: 'Elephant & Castle' } },
  ];

  for (const p of pointData) {
    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value, metadata)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)`,
      [pointLayerId, p.lng, p.lat, p.ts, 'month', p.val, JSON.stringify(p.meta)]
    );
  }
  console.log(`Layer "Temperature Sensors" (point): ${pointData.length} points`);

  // --- Layer 2: Heatmap (air quality readings) ---
  const heatmapLayerId = 'b0000000-0000-0000-0000-000000000002';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'globe') ON CONFLICT (id) DO NOTHING`,
    [heatmapLayerId, collectionId, 'Air Quality Index', 'heatmap']
  );

  // Generate a grid of AQ readings across London
  const heatmapPoints = [];
  for (let i = 0; i < 50; i++) {
    const lng = -0.2 + Math.random() * 0.25;
    const lat = 51.47 + Math.random() * 0.08;
    const month = Math.floor(Math.random() * 12) + 1;
    const ts = `2024-${String(month).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}T${String(Math.floor(Math.random() * 24)).padStart(2, '0')}:00:00Z`;
    const val = 20 + Math.random() * 80; // AQI 20-100
    heatmapPoints.push({ lng, lat, ts, val });
  }

  for (const p of heatmapPoints) {
    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6)`,
      [heatmapLayerId, p.lng, p.lat, p.ts, 'day', p.val]
    );
  }
  console.log(`Layer "Air Quality Index" (heatmap): ${heatmapPoints.length} points`);

  // --- Layer 3: Route (delivery truck path) ---
  const routeLayerId = 'b0000000-0000-0000-0000-000000000003';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'globe') ON CONFLICT (id) DO NOTHING`,
    [routeLayerId, collectionId, 'Delivery Route', 'route']
  );

  const routePoints = [
    { lng: -0.1278, lat: 51.5074, ts: '2024-06-15T06:00:00Z', val: 0 },
    { lng: -0.1180, lat: 51.5136, ts: '2024-06-15T06:15:00Z', val: 1.2 },
    { lng: -0.1015, lat: 51.5176, ts: '2024-06-15T06:30:00Z', val: 2.5 },
    { lng: -0.0886, lat: 51.5133, ts: '2024-06-15T06:45:00Z', val: 3.8 },
    { lng: -0.0762, lat: 51.5080, ts: '2024-06-15T07:00:00Z', val: 5.1 },
    { lng: -0.0641, lat: 51.5048, ts: '2024-06-15T07:15:00Z', val: 6.4 },
    { lng: -0.0520, lat: 51.5065, ts: '2024-06-15T07:30:00Z', val: 7.7 },
    { lng: -0.0400, lat: 51.5090, ts: '2024-06-15T07:45:00Z', val: 9.0 },
    { lng: -0.0280, lat: 51.5070, ts: '2024-06-15T08:00:00Z', val: 10.3 },
    { lng: -0.0150, lat: 51.5050, ts: '2024-06-15T08:15:00Z', val: 11.6 },
  ];

  for (const p of routePoints) {
    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6)`,
      [routeLayerId, p.lng, p.lat, p.ts, 'instant', p.val]
    );
  }
  console.log(`Layer "Delivery Route" (route): ${routePoints.length} points`);

  // --- Layer 4: Clusters (bike docking stations) ---
  const clusterLayerId = 'b0000000-0000-0000-0000-000000000004';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'globe') ON CONFLICT (id) DO NOTHING`,
    [clusterLayerId, collectionId, 'Bike Stations', 'cluster']
  );

  const clusterPoints = [];
  for (let i = 0; i < 80; i++) {
    const lng = -0.2 + Math.random() * 0.25;
    const lat = 51.47 + Math.random() * 0.08;
    const hour = Math.floor(Math.random() * 24);
    const ts = `2024-06-15T${String(hour).padStart(2, '0')}:00:00Z`;
    const val = Math.floor(Math.random() * 30) + 1; // bikes available
    clusterPoints.push({ lng, lat, ts, val });
  }

  for (const p of clusterPoints) {
    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6)`,
      [clusterLayerId, p.lng, p.lat, p.ts, 'hour', p.val]
    );
  }
  console.log(`Layer "Bike Stations" (cluster): ${clusterPoints.length} points`);

  // --- Layer 5: Choropleth (borough noise levels) ---
  const choroplethLayerId = 'b0000000-0000-0000-0000-000000000005';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection)
     VALUES ($1, $2, $3, $4, 'globe') ON CONFLICT (id) DO NOTHING`,
    [choroplethLayerId, collectionId, 'Noise Levels', 'choropleth']
  );

  // Simple polygon areas representing boroughs
  const boroughs = [
    {
      name: 'Westminster',
      polygon: [[-0.17, 51.49], [-0.12, 51.49], [-0.12, 51.52], [-0.17, 51.52], [-0.17, 51.49]],
      values: [65, 70, 72, 68, 63, 75, 78, 74, 69, 64, 62, 66],
    },
    {
      name: 'Camden',
      polygon: [[-0.17, 51.52], [-0.12, 51.52], [-0.12, 51.55], [-0.17, 51.55], [-0.17, 51.52]],
      values: [55, 58, 60, 57, 54, 62, 65, 63, 58, 53, 52, 56],
    },
    {
      name: 'Tower Hamlets',
      polygon: [[-0.08, 51.49], [-0.03, 51.49], [-0.03, 51.52], [-0.08, 51.52], [-0.08, 51.49]],
      values: [60, 63, 65, 62, 59, 68, 72, 70, 64, 58, 57, 61],
    },
  ];

  for (const borough of boroughs) {
    for (let month = 0; month < 12; month++) {
      const ts = `2024-${String(month + 1).padStart(2, '0')}-01T00:00:00Z`;
      const coords = borough.polygon.map(([lng, lat]) => `${lng} ${lat}`).join(',');
      await client.query(
        `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value, metadata)
         VALUES ($1, ST_SetSRID(ST_GeomFromText('POLYGON((${coords}))'), 4326), $2, $3, $4, $5)`,
        [choroplethLayerId, ts, 'month', borough.values[month], JSON.stringify({ borough: borough.name })]
      );
    }
  }
  console.log(`Layer "Noise Levels" (choropleth): ${boroughs.length * 12} polygons`);

  console.log('\n✅ Demo collection seeded successfully!');
  console.log('Open /collections, select "London Demo Collection", then click each layer to see different render types.');
  console.log('Use the time range picker to filter by date and see temporal changes.');

  await client.end();
}

main().catch(console.error);
