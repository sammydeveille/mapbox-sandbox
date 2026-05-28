/**
 * Seed script: Knowledge Model Demo Data
 *
 * Populates the knowledge model tables with compelling real-world examples:
 *   - Wikipedia as a registered source
 *   - Sample source documents (Wikipedia article summaries)
 *   - Knowledge items of varied types (article, event, statistic, concept, place)
 *   - Temporal bindings (item_time) for time-relevant items
 *   - Spatial bindings (item_place) with real-world coordinates
 *   - Evidence links (item_evidence) connecting items to source documents
 *
 * Usage:
 *   cd src/back && tsx script/seed-knowledge.ts
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const dir = dirname(fileURLToPath(import.meta.url));
config({ path: join(dir, '../../../.env') });

async function main() {
  const client = new pg.Client({
    host: process.env.POSTGRES_HOST_LOCAL,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  await client.connect();
  console.log('Connected to database.\n');

  try {
    // ─── 1. Register Wikipedia as a source ─────────────────────────────────────
    console.log('Registering Wikipedia source...');
    const sourceRes = await client.query(
      `INSERT INTO source (id, name, base_url, source_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO UPDATE SET base_url = EXCLUDED.base_url
       RETURNING id`,
      [
        'c0000000-0000-0000-0000-000000000001',
        'Wikipedia',
        'https://en.wikipedia.org',
        'website',
      ]
    );
    const sourceId = sourceRes.rows[0].id;
    console.log(`  Source registered: ${sourceId}\n`);

    // ─── 2. Create source documents (Wikipedia article summaries) ──────────────
    console.log('Creating source documents...');

    const documents = [
      {
        id: 'c1000000-0000-0000-0000-000000000001',
        externalId: '/wiki/Moon_landing',
        rawContent: {
          title: 'Moon landing',
          extract: 'A Moon landing or lunar landing is the arrival of a spacecraft on the surface of the Moon, including both crewed and robotic missions. The first human-made object to touch the Moon was Luna 2 in 1959. Apollo 11 was the first crewed mission to land on the Moon on 20 July 1969.',
          pageid: 20092,
          lastRevision: '2024-01-15',
        },
        contentHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      },
      {
        id: 'c1000000-0000-0000-0000-000000000002',
        externalId: '/wiki/Great_Wall_of_China',
        rawContent: {
          title: 'Great Wall of China',
          extract: 'The Great Wall of China is a series of fortifications that were built across the historical northern borders of ancient Chinese states and Imperial China as protection against various nomadic groups. Several walls were built from as early as the 7th century BC, with selective stretches later joined by Qin Shi Huang.',
          pageid: 5094570,
          lastRevision: '2024-02-10',
        },
        contentHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
      },
      {
        id: 'c1000000-0000-0000-0000-000000000003',
        externalId: '/wiki/Theory_of_relativity',
        rawContent: {
          title: 'Theory of relativity',
          extract: 'The theory of relativity usually encompasses two interrelated physics theories by Albert Einstein: special relativity and general relativity, proposed and published in 1905 and 1915 respectively. Special relativity applies to all physical phenomena in the absence of gravity. General relativity explains the law of gravitation and its relation to the forces of nature.',
          pageid: 26447,
          lastRevision: '2024-03-05',
        },
        contentHash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
      },
      {
        id: 'c1000000-0000-0000-0000-000000000004',
        externalId: '/wiki/Amazon_rainforest',
        rawContent: {
          title: 'Amazon rainforest',
          extract: 'The Amazon rainforest, also called Amazon jungle, is a moist broadleaf tropical rainforest in the Amazon biome that covers most of the Amazon basin of South America. This basin encompasses 7,000,000 km2, of which 5,500,000 km2 are covered by the rainforest. This region includes territory belonging to nine nations and 3,344 formally acknowledged indigenous territories.',
          pageid: 2386,
          lastRevision: '2024-01-28',
        },
        contentHash: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
      },
      {
        id: 'c1000000-0000-0000-0000-000000000005',
        externalId: '/wiki/World_population',
        rawContent: {
          title: 'World population',
          extract: 'In demographics, the world population is the total number of humans currently living. It was estimated to have exceeded eight billion in mid-November 2022. It took over 200,000 years of human history for the world population to reach 1 billion, and only 219 years more to reach 8 billion.',
          pageid: 37501,
          lastRevision: '2024-02-20',
        },
        contentHash: 'e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
      },
      {
        id: 'c1000000-0000-0000-0000-000000000006',
        externalId: '/wiki/Pompeii',
        rawContent: {
          title: 'Pompeii',
          extract: 'Pompeii was an ancient city located in what is now the comune of Pompei near Naples in the Campania region of Italy. Pompeii, along with Herculaneum and many villas in the surrounding area, was buried under 4 to 6 m of volcanic ash and pumice in the eruption of Mount Vesuvius in AD 79.',
          pageid: 24574,
          lastRevision: '2024-03-12',
        },
        contentHash: 'f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
      },
      {
        id: 'c1000000-0000-0000-0000-000000000007',
        externalId: '/wiki/Machu_Picchu',
        rawContent: {
          title: 'Machu Picchu',
          extract: 'Machu Picchu is a 15th-century Inca citadel located in the Eastern Cordillera of southern Peru on a 2,430-metre mountain ridge. Often referred to as the "Lost City of the Incas", it is the most familiar icon of Inca civilization. It was built in the classical Inca style, with polished dry-stone walls.',
          pageid: 20082,
          lastRevision: '2024-02-05',
        },
        contentHash: 'a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8',
      },
      {
        id: 'c1000000-0000-0000-0000-000000000008',
        externalId: '/wiki/Climate_change',
        rawContent: {
          title: 'Climate change',
          extract: 'In common usage, climate change describes global warming—the ongoing increase in global average temperature—and its effects on Earth\'s climate system. Climate change in a broader sense also includes previous long-term changes to Earth\'s climate. The current rise in global average temperature is more rapid than previous changes.',
          pageid: 5765,
          lastRevision: '2024-03-18',
        },
        contentHash: 'b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9d0e1f2a7b8c9',
      },
    ];

    for (const doc of documents) {
      await client.query(
        `INSERT INTO source_document (id, source_id, external_id, raw_content, content_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_id, external_id) DO UPDATE SET raw_content = EXCLUDED.raw_content`,
        [doc.id, sourceId, doc.externalId, JSON.stringify(doc.rawContent), doc.contentHash]
      );
    }
    console.log(`  Created ${documents.length} source documents.\n`);

    // ─── 3. Create knowledge items ─────────────────────────────────────────────
    console.log('Creating knowledge items...');

    const knowledgeItems = [
      {
        id: 'c2000000-0000-0000-0000-000000000001',
        title: 'Apollo 11 Moon Landing',
        summary: 'The first crewed mission to land on the Moon, with astronauts Neil Armstrong and Buzz Aldrin walking on the lunar surface on July 20, 1969.',
        itemType: 'event',
        content: 'Apollo 11 was the American spaceflight that first landed humans on the Moon. Commander Neil Armstrong and lunar module pilot Buzz Aldrin landed the Apollo Lunar Module Eagle on July 20, 1969. Armstrong became the first person to step onto the lunar surface six hours and 39 minutes later, and Aldrin joined him 19 minutes after that.',
      },
      {
        id: 'c2000000-0000-0000-0000-000000000002',
        title: 'Great Wall of China',
        summary: 'A series of ancient fortifications stretching over 21,000 km across northern China, built over many centuries to protect against nomadic invasions.',
        itemType: 'place',
        content: 'The Great Wall of China is a series of fortifications that were built across the historical northern borders of ancient Chinese states and Imperial China. The total length of all sections ever built is over 21,196 km. The best-known sections were built by the Ming dynasty (1368–1644).',
      },
      {
        id: 'c2000000-0000-0000-0000-000000000003',
        title: 'Theory of Relativity',
        summary: 'Einstein\'s revolutionary physics theories that redefined understanding of space, time, gravity, and the universe.',
        itemType: 'concept',
        content: 'The theory of relativity encompasses two interrelated physics theories by Albert Einstein: special relativity (1905) and general relativity (1915). Special relativity introduced the famous equation E=mc² and showed that the laws of physics are the same for all non-accelerating observers. General relativity provided a new description of gravity as a geometric property of space and time.',
      },
      {
        id: 'c2000000-0000-0000-0000-000000000004',
        title: 'Amazon Rainforest',
        summary: 'The world\'s largest tropical rainforest, covering 5.5 million km² across nine South American nations, home to extraordinary biodiversity.',
        itemType: 'place',
        content: 'The Amazon rainforest represents over half of the planet\'s remaining rainforests and comprises the largest and most biodiverse tract of tropical rainforest in the world. It is home to an estimated 390 billion individual trees divided into 16,000 species, and about 10% of all species on Earth.',
      },
      {
        id: 'c2000000-0000-0000-0000-000000000005',
        title: 'World Population Reaches 8 Billion',
        summary: 'The global human population surpassed 8 billion people in November 2022, a milestone in demographic history.',
        itemType: 'statistic',
        content: 'The world population reached 8 billion on November 15, 2022, according to the United Nations. It took approximately 12 years to grow from 7 to 8 billion. The global growth rate has been declining since the 1960s, and the UN projects the population will peak at around 10.4 billion in the 2080s.',
      },
      {
        id: 'c2000000-0000-0000-0000-000000000006',
        title: 'Destruction of Pompeii',
        summary: 'The catastrophic eruption of Mount Vesuvius in AD 79 buried the Roman city of Pompeii under meters of volcanic ash, preserving it for millennia.',
        itemType: 'event',
        content: 'In AD 79, Mount Vesuvius erupted in one of the most catastrophic volcanic events in European history. The eruption buried the Roman cities of Pompeii and Herculaneum under 4-6 meters of volcanic ash and pumice. The city remained lost for nearly 1,700 years until its rediscovery in 1748, providing an extraordinary snapshot of Roman life.',
      },
      {
        id: 'c2000000-0000-0000-0000-000000000007',
        title: 'Machu Picchu',
        summary: 'A 15th-century Inca citadel perched at 2,430 meters in the Peruvian Andes, one of the most iconic archaeological sites in the world.',
        itemType: 'place',
        content: 'Machu Picchu was built around 1450 AD as an estate for the Inca emperor Pachacuti. It was abandoned a century later during the Spanish Conquest. Although known locally, it was not known to the outside world until American historian Hiram Bingham brought it to international attention in 1911.',
      },
      {
        id: 'c2000000-0000-0000-0000-000000000008',
        title: 'Global Temperature Rise',
        summary: 'Earth\'s average surface temperature has risen approximately 1.1°C since the pre-industrial era, primarily due to human activities.',
        itemType: 'article',
        content: 'According to the IPCC, human activities have caused approximately 1.1°C of global warming above pre-industrial levels. The rate of warming has accelerated, with the last decade (2011-2020) being the warmest on record. The Paris Agreement aims to limit warming to 1.5°C above pre-industrial levels.',
      },
    ];

    for (const item of knowledgeItems) {
      await client.query(
        `INSERT INTO knowledge_item (id, title, summary, item_type, content)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary`,
        [item.id, item.title, item.summary, item.itemType, item.content]
      );
    }
    console.log(`  Created ${knowledgeItems.length} knowledge items.\n`);

    // ─── 4. Add temporal bindings ──────────────────────────────────────────────
    console.log('Adding temporal bindings...');

    const temporalBindings = [
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000001', // Apollo 11
        startTime: '1969-07-20T20:17:00Z',
        endTime: '1969-07-21T17:54:00Z',
        precision: 'hour',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000002', // Great Wall
        startTime: '0700-01-01T00:00:00Z',
        endTime: '1644-12-31T23:59:59Z',
        precision: 'year',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000003', // Relativity
        startTime: '1905-06-30T00:00:00Z',
        endTime: '1915-11-25T00:00:00Z',
        precision: 'year',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000005', // World Population 8B
        startTime: '2022-11-15T00:00:00Z',
        endTime: null,
        precision: 'day',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000006', // Pompeii
        startTime: '0079-08-24T00:00:00Z',
        endTime: '0079-08-25T23:59:59Z',
        precision: 'day',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000007', // Machu Picchu
        startTime: '1450-01-01T00:00:00Z',
        endTime: '1572-12-31T23:59:59Z',
        precision: 'year',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000008', // Climate change
        startTime: '1850-01-01T00:00:00Z',
        endTime: null,
        precision: 'year',
      },
    ];

    for (const binding of temporalBindings) {
      await client.query(
        `INSERT INTO item_time (knowledge_item_id, start_time, end_time, precision)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [binding.knowledgeItemId, binding.startTime, binding.endTime, binding.precision]
      );
    }
    console.log(`  Added ${temporalBindings.length} temporal bindings.\n`);

    // ─── 5. Add spatial bindings ───────────────────────────────────────────────
    console.log('Adding spatial bindings...');

    const spatialBindings = [
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000001', // Apollo 11 - Sea of Tranquility
        lng: 23.4729,
        lat: 0.6875,
        placeName: 'Sea of Tranquility, Moon',
        precision: 'approximate',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000001', // Apollo 11 - Kennedy Space Center
        lng: -80.6041,
        lat: 28.5721,
        placeName: 'Kennedy Space Center, Florida',
        precision: 'exact',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000002', // Great Wall - Badaling
        lng: 116.0046,
        lat: 40.3588,
        placeName: 'Badaling, Beijing, China',
        precision: 'approximate',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000003', // Relativity - Bern
        lng: 7.4474,
        lat: 46.9480,
        placeName: 'Bern, Switzerland',
        precision: 'exact',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000004', // Amazon Rainforest
        lng: -60.0217,
        lat: -3.4653,
        placeName: 'Amazon Basin, Brazil',
        precision: 'region',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000006', // Pompeii
        lng: 14.4850,
        lat: 40.7509,
        placeName: 'Pompeii, Italy',
        precision: 'exact',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000007', // Machu Picchu
        lng: -72.5450,
        lat: -13.1631,
        placeName: 'Machu Picchu, Peru',
        precision: 'exact',
      },
    ];

    for (const binding of spatialBindings) {
      await client.query(
        `INSERT INTO item_place (knowledge_item_id, geometry, place_name, precision)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5)`,
        [binding.knowledgeItemId, binding.lng, binding.lat, binding.placeName, binding.precision]
      );
    }
    console.log(`  Added ${spatialBindings.length} spatial bindings.\n`);

    // ─── 6. Link evidence ──────────────────────────────────────────────────────
    console.log('Linking evidence...');

    const evidenceLinks = [
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000001', // Apollo 11
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000001', // Moon landing article
        relevance: 'primary',
        excerpt: 'Apollo 11 was the first crewed mission to land on the Moon on 20 July 1969.',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000002', // Great Wall
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000002', // Great Wall article
        relevance: 'primary',
        excerpt: 'The Great Wall of China is a series of fortifications built across the historical northern borders of ancient Chinese states.',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000003', // Relativity
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000003', // Relativity article
        relevance: 'primary',
        excerpt: 'Two interrelated physics theories by Albert Einstein: special relativity and general relativity, proposed in 1905 and 1915.',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000004', // Amazon
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000004', // Amazon article
        relevance: 'primary',
        excerpt: 'The Amazon rainforest covers most of the Amazon basin of South America, encompassing 7,000,000 km².',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000005', // World Population
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000005', // Population article
        relevance: 'primary',
        excerpt: 'The world population was estimated to have exceeded eight billion in mid-November 2022.',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000006', // Pompeii
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000006', // Pompeii article
        relevance: 'primary',
        excerpt: 'Pompeii was buried under 4 to 6 m of volcanic ash and pumice in the eruption of Mount Vesuvius in AD 79.',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000007', // Machu Picchu
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000007', // Machu Picchu article
        relevance: 'primary',
        excerpt: 'A 15th-century Inca citadel located in the Eastern Cordillera of southern Peru on a 2,430-metre mountain ridge.',
      },
      {
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000008', // Climate change
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000008', // Climate change article
        relevance: 'primary',
        excerpt: 'Climate change describes global warming—the ongoing increase in global average temperature—and its effects on Earth\'s climate system.',
      },
      {
        // Cross-reference: Climate change article also supports World Population item
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000005', // World Population
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000008', // Climate change article
        relevance: 'contextual',
        excerpt: 'Population growth is a key driver of increased greenhouse gas emissions.',
      },
      {
        // Cross-reference: Amazon article supports Climate change item
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000008', // Climate change
        sourceDocumentId: 'c1000000-0000-0000-0000-000000000004', // Amazon article
        relevance: 'supporting',
        excerpt: 'Deforestation of the Amazon rainforest contributes significantly to global carbon emissions.',
      },
    ];

    for (const link of evidenceLinks) {
      await client.query(
        `INSERT INTO item_evidence (knowledge_item_id, source_document_id, relevance, excerpt)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [link.knowledgeItemId, link.sourceDocumentId, link.relevance, link.excerpt]
      );
    }
    console.log(`  Linked ${evidenceLinks.length} evidence records.\n`);

    // ─── 7. Create sample presentation ───────────────────────────────────────
    console.log('Creating sample presentation...');

    // Ensure a user profile exists for the presentation owner
    const presentationOwnerId = 'c3000000-0000-0000-0000-000000000001';
    await client.query(
      `INSERT INTO user_profile (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [presentationOwnerId]
    );

    // Create a collection for the knowledge presentation
    const presentationCollectionId = 'c4000000-0000-0000-0000-000000000001';
    await client.query(
      `INSERT INTO collection (id, owner_id, name, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [
        presentationCollectionId,
        presentationOwnerId,
        'World History Knowledge',
        'A collection of knowledge items spanning ancient wonders to modern challenges',
      ]
    );

    // Create the presentation
    const presentationId = 'c5000000-0000-0000-0000-000000000001';
    await client.query(
      `INSERT INTO presentation (id, collection_id, owner_id, title, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
      [
        presentationId,
        presentationCollectionId,
        presentationOwnerId,
        'Journey Through Time',
        'A narrative presentation exploring humanity\'s greatest achievements and challenges across time and space.',
      ]
    );
    console.log(`  Presentation created: ${presentationId}\n`);

    // ─── 8. Create presentation slides ─────────────────────────────────────────
    console.log('Creating presentation slides...');

    const slides = [
      {
        id: 'c6000000-0000-0000-0000-000000000001',
        position: 1,
        title: 'Ancient Wonders',
        narratorNote: 'We begin our journey in the ancient world, exploring the Mediterranean and East Asia where early civilizations left their mark.',
        viewState: {
          center: [25.0, 38.0],
          zoom: 3.5,
          bearing: 0,
          pitch: 30,
          temporalStart: '0001-01-01T00:00:00Z',
          temporalEnd: '1500-12-31T23:59:59Z',
        },
      },
      {
        id: 'c6000000-0000-0000-0000-000000000002',
        position: 2,
        title: 'Age of Discovery',
        narratorNote: 'Moving to South America, we explore the Inca civilization and the vast Amazon rainforest that has shaped the continent.',
        viewState: {
          center: [-65.0, -10.0],
          zoom: 4.0,
          bearing: 0,
          pitch: 20,
          temporalStart: '1400-01-01T00:00:00Z',
          temporalEnd: '1600-12-31T23:59:59Z',
        },
      },
      {
        id: 'c6000000-0000-0000-0000-000000000003',
        position: 3,
        title: 'Modern Milestones',
        narratorNote: 'In North America, the 20th century brought unprecedented achievements — from space exploration to population growth milestones.',
        viewState: {
          center: [-85.0, 35.0],
          zoom: 3.5,
          bearing: 0,
          pitch: 15,
          temporalStart: '1960-01-01T00:00:00Z',
          temporalEnd: '2023-12-31T23:59:59Z',
        },
      },
      {
        id: 'c6000000-0000-0000-0000-000000000004',
        position: 4,
        title: 'Global Challenges',
        narratorNote: 'Zooming out to a global view, we confront the defining challenge of our era: climate change and its worldwide impact.',
        viewState: {
          center: [0.0, 20.0],
          zoom: 1.5,
          bearing: 0,
          pitch: 0,
          temporalStart: '1850-01-01T00:00:00Z',
          temporalEnd: null,
        },
      },
    ];

    for (const slide of slides) {
      await client.query(
        `INSERT INTO presentation_slide (id, presentation_id, position, title, narrator_note, view_state)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET view_state = EXCLUDED.view_state`,
        [
          slide.id,
          presentationId,
          slide.position,
          slide.title,
          slide.narratorNote,
          JSON.stringify(slide.viewState),
        ]
      );
    }
    console.log(`  Created ${slides.length} presentation slides.\n`);

    // ─── 9. Link knowledge items to slides ─────────────────────────────────────
    console.log('Linking knowledge items to slides...');

    const slideItems = [
      // Slide 1: Ancient Wonders — Pompeii and Great Wall
      {
        slideId: 'c6000000-0000-0000-0000-000000000001',
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000006', // Destruction of Pompeii
        position: 1,
        annotation: 'The eruption of Vesuvius in AD 79 preserved a snapshot of Roman life.',
      },
      {
        slideId: 'c6000000-0000-0000-0000-000000000001',
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000002', // Great Wall of China
        position: 2,
        annotation: 'Construction spanning centuries, from the 7th century BC to the Ming dynasty.',
      },
      // Slide 2: Age of Discovery — Machu Picchu and Amazon
      {
        slideId: 'c6000000-0000-0000-0000-000000000002',
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000007', // Machu Picchu
        position: 1,
        annotation: 'Built around 1450 AD as an estate for the Inca emperor Pachacuti.',
      },
      {
        slideId: 'c6000000-0000-0000-0000-000000000002',
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000004', // Amazon Rainforest
        position: 2,
        annotation: 'The world\'s largest tropical rainforest, home to 10% of all species on Earth.',
      },
      // Slide 3: Modern Milestones — Apollo 11 and World Population
      {
        slideId: 'c6000000-0000-0000-0000-000000000003',
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000001', // Apollo 11
        position: 1,
        annotation: 'One small step for man, one giant leap for mankind — July 20, 1969.',
      },
      {
        slideId: 'c6000000-0000-0000-0000-000000000003',
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000005', // World Population 8B
        position: 2,
        annotation: 'From 1 billion to 8 billion in just over 200 years.',
      },
      // Slide 4: Global Challenges — Climate Change
      {
        slideId: 'c6000000-0000-0000-0000-000000000004',
        knowledgeItemId: 'c2000000-0000-0000-0000-000000000008', // Global Temperature Rise
        position: 1,
        annotation: 'Earth\'s temperature has risen 1.1°C since pre-industrial times, with accelerating effects.',
      },
    ];

    for (const item of slideItems) {
      await client.query(
        `INSERT INTO slide_item (slide_id, knowledge_item_id, position, annotation)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [item.slideId, item.knowledgeItemId, item.position, item.annotation]
      );
    }
    console.log(`  Linked ${slideItems.length} knowledge items to slides.\n`);

    console.log('✅ Knowledge model seed data created successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  • 1 source (Wikipedia)`);
    console.log(`  • ${documents.length} source documents`);
    console.log(`  • ${knowledgeItems.length} knowledge items`);
    console.log(`  • ${temporalBindings.length} temporal bindings`);
    console.log(`  • ${spatialBindings.length} spatial bindings`);
    console.log(`  • ${evidenceLinks.length} evidence links`);
    console.log(`  • 1 presentation with ${slides.length} slides`);
    console.log(`  • ${slideItems.length} slide items`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
