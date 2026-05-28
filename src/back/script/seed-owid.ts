/**
 * Seed script: Our World in Data
 *
 * Fetches real datasets from OWID's GitHub repositories and loads them
 * into the spatiotemporal schema to showcase different render types:
 *
 *   1. CO₂ Emissions by Country (choropleth, year) — polygon per country
 *   2. COVID-19 Cases (heatmap, day) — point per country centroid
 *   3. Renewable Energy Share (cluster, year) — point per country centroid
 *
 * Data sources (CC-BY licensed):
 *   - https://github.com/owid/co2-data
 *   - https://github.com/owid/covid-19-data
 *   - https://github.com/owid/energy-data
 *
 * Usage:
 *   npm run script script/seed-owid.ts
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(dir, '../../../.env') });

const OWNER_ID = 'd2767a51-58a5-43aa-b0c6-4e303755f776';
const COLLECTION_ID = 'e0000000-0000-0000-0000-000000000001';

// Country centroids (lat, lng) for mapping country-level data to points
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'United States': [-95.7, 37.1],
  'China': [104.2, 35.9],
  'India': [78.9, 20.6],
  'Russia': [105.3, 61.5],
  'Japan': [138.3, 36.2],
  'Germany': [10.5, 51.2],
  'United Kingdom': [-3.4, 55.4],
  'Brazil': [-51.9, -14.2],
  'France': [2.2, 46.2],
  'Canada': [-106.3, 56.1],
  'South Korea': [128.0, 35.9],
  'Italy': [12.6, 41.9],
  'Australia': [133.8, -25.3],
  'Mexico': [-102.6, 23.6],
  'Indonesia': [113.9, -0.8],
  'Saudi Arabia': [45.1, 23.9],
  'South Africa': [22.9, -30.6],
  'Turkey': [35.2, 38.9],
  'Poland': [19.1, 51.9],
  'Argentina': [-63.6, -38.4],
  'Nigeria': [8.7, 9.1],
  'Egypt': [30.8, 26.8],
  'Thailand': [100.5, 15.9],
  'Spain': [-3.7, 40.5],
  'Vietnam': [108.3, 14.1],
  'Pakistan': [69.3, 30.4],
  'Bangladesh': [90.4, 23.7],
  'Colombia': [-74.3, 4.6],
  'Iran': [53.7, 32.4],
  'Ukraine': [31.2, 48.4],
  'Netherlands': [5.3, 52.1],
  'Sweden': [18.6, 60.1],
  'Norway': [8.5, 60.5],
  'Kenya': [37.9, -0.0],
  'Chile': [-71.5, -35.7],
  'Peru': [-75.0, -9.2],
  'Ethiopia': [40.5, 9.1],
  'Philippines': [122.0, 12.9],
  'Malaysia': [101.7, 4.2],
  'Israel': [34.9, 31.0],
};

// --- CSV Parsing ---

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function fetchCSV(url: string): Promise<Record<string, string>[]> {
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

// --- Main ---

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

  // Create collection
  await client.query(
    `INSERT INTO collection (id, owner_id, name, description, temporal_start, temporal_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [
      COLLECTION_ID,
      OWNER_ID,
      'Our World in Data',
      'Real-world datasets from OWID: CO₂ emissions, COVID-19 cases, and renewable energy adoption',
      '2000-01-01T00:00:00Z',
      '2024-12-31T23:59:59Z',
    ]
  );
  console.log('Collection: Our World in Data\n');

  // ─── Layer 1: CO₂ Emissions (choropleth, year) ───────────────────────────────
  await seedCO2(client);

  // ─── Layer 2: COVID-19 New Cases (heatmap, day) ──────────────────────────────
  await seedCovid(client);

  // ─── Layer 3: Renewable Energy Share (cluster, year) ─────────────────────────
  await seedEnergy(client);

  console.log('\n✅ Our World in Data collection seeded!');
  console.log('Layers:');
  console.log('  • CO₂ Emissions per Capita (choropleth) — scrub 2000–2022');
  console.log('  • COVID-19 Daily Cases (heatmap) — scrub Jan–Dec 2021');
  console.log('  • Renewable Energy Share (cluster) — scrub 2000–2022');

  await client.end();
}

// ─── CO₂ Emissions ─────────────────────────────────────────────────────────────

async function seedCO2(client: pg.Client) {
  const layerId = 'e0000000-0000-0000-0000-000000000010';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection, schema_hint)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
    [layerId, COLLECTION_ID, 'CO₂ Emissions per Capita', 'choropleth',
      'mercator', JSON.stringify({ unit: 'tonnes per person', source: 'OWID/co2-data' })]
  );

  console.log('Layer: CO₂ Emissions per Capita (choropleth)');
  const rows = await fetchCSV(
    'https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv'
  );

  // Filter: countries we have coords for, years 2000-2022, with co2_per_capita
  const validCountries = new Set(Object.keys(COUNTRY_COORDS));
  let count = 0;

  for (const row of rows) {
    const country = row['country'];
    const year = parseInt(row['year']);
    const co2pc = parseFloat(row['co2_per_capita']);

    if (!validCountries.has(country)) continue;
    if (isNaN(year) || year < 2000 || year > 2022) continue;
    if (isNaN(co2pc) || co2pc <= 0) continue;

    const [lng, lat] = COUNTRY_COORDS[country];
    const ts = `${year}-01-01T00:00:00Z`;

    // Create a small polygon around the centroid to represent the country area
    const size = 3; // degrees
    const polygon = [
      [lng - size, lat - size],
      [lng + size, lat - size],
      [lng + size, lat + size],
      [lng - size, lat + size],
      [lng - size, lat - size],
    ];
    const wkt = polygon.map(([x, y]) => `${x} ${y}`).join(',');

    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value, metadata)
       VALUES ($1, ST_SetSRID(ST_GeomFromText('POLYGON((${wkt}))'), 4326), $2, $3, $4, $5)`,
      [layerId, ts, 'year', co2pc, JSON.stringify({ country, year })]
    );
    count++;
  }
  console.log(`  Inserted ${count} data points\n`);
}

// ─── COVID-19 Cases ────────────────────────────────────────────────────────────

async function seedCovid(client: pg.Client) {
  const layerId = 'e0000000-0000-0000-0000-000000000020';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection, schema_hint)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
    [layerId, COLLECTION_ID, 'COVID-19 Daily New Cases', 'heatmap',
      'mercator', JSON.stringify({ unit: 'new cases per million', source: 'OWID/covid-19-data' })]
  );

  console.log('Layer: COVID-19 Daily New Cases (heatmap)');
  const rows = await fetchCSV(
    'https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/owid-covid-data.csv'
  );

  // Filter: countries we have coords for, year 2021 (peak wave), sample weekly
  const validCountries = new Set(Object.keys(COUNTRY_COORDS));
  let count = 0;

  for (const row of rows) {
    const country = row['location'];
    const date = row['date']; // YYYY-MM-DD
    const newCasesPerMillion = parseFloat(row['new_cases_per_million']);

    if (!validCountries.has(country)) continue;
    if (!date || !date.startsWith('2021')) continue;
    if (isNaN(newCasesPerMillion) || newCasesPerMillion <= 0) continue;

    // Sample: only take every 7th day to keep data manageable
    const day = parseInt(date.split('-')[2]);
    if (day !== 1 && day !== 8 && day !== 15 && day !== 22) continue;

    const [lng, lat] = COUNTRY_COORDS[country];
    const ts = `${date}T00:00:00Z`;

    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value, metadata)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)`,
      [layerId, lng, lat, ts, 'day', newCasesPerMillion,
        JSON.stringify({ country, date })]
    );
    count++;
  }
  console.log(`  Inserted ${count} data points\n`);
}

// ─── Renewable Energy ──────────────────────────────────────────────────────────

async function seedEnergy(client: pg.Client) {
  const layerId = 'e0000000-0000-0000-0000-000000000030';
  await client.query(
    `INSERT INTO data_layer (id, collection_id, name, render_type, projection, schema_hint)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
    [layerId, COLLECTION_ID, 'Renewable Energy Share', 'cluster',
      'mercator', JSON.stringify({ unit: '% of primary energy', source: 'OWID/energy-data' })]
  );

  console.log('Layer: Renewable Energy Share (cluster)');
  const rows = await fetchCSV(
    'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv'
  );

  // Filter: countries we have coords for, years 2000-2022, with renewables_share_energy
  const validCountries = new Set(Object.keys(COUNTRY_COORDS));
  let count = 0;

  for (const row of rows) {
    const country = row['country'];
    const year = parseInt(row['year']);
    const renewShare = parseFloat(row['renewables_share_energy']);

    if (!validCountries.has(country)) continue;
    if (isNaN(year) || year < 2000 || year > 2022) continue;
    if (isNaN(renewShare)) continue;

    const [lng, lat] = COUNTRY_COORDS[country];
    const ts = `${year}-01-01T00:00:00Z`;

    await client.query(
      `INSERT INTO data_point (layer_id, geometry, timestamp, temporal_precision, value, metadata)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7)`,
      [layerId, lng, lat, ts, 'year', renewShare,
        JSON.stringify({ country, year })]
    );
    count++;
  }
  console.log(`  Inserted ${count} data points\n`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
