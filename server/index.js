import 'dotenv/config';
import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT) || 3001;
const stages = [
  'seeded',
  'germination',
  'vegetative',
  'flowering',
  'fruit_development',
  'ready_for_harvest',
  'harvested'
];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

app.use(express.json({ limit: '1mb' }));

function requiredText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw Object.assign(new Error(`${label} is required.`), { status: 400 });
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function validDate(value, label, optional = false) {
  if ((value === '' || value == null) && optional) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error(`${label} must be a valid date.`), { status: 400 });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw Object.assign(new Error(`${label} must be a valid date.`), { status: 400 });
  }
  return value;
}

function validId(value, label) {
  if (!uuidPattern.test(value)) {
    throw Object.assign(new Error(`${label} is invalid.`), { status: 400 });
  }
  return value;
}

function requireDatabase(_request, response, next) {
  if (!pool) {
    response.status(503).json({
      error: 'Database is not configured. Set DATABASE_URL in your .env file.'
    });
    return;
  }
  next();
}

app.get('/api/health', requireDatabase, async (_request, response, next) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    next(error);
  }
});

app.get('/api/farms', requireDatabase, async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, owner_name, province, district, area_hectares,
              farm_type, soil_type, irrigation_method, created_at, updated_at
       FROM farms
       ORDER BY created_at DESC`
    );
    response.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/farms', requireDatabase, async (request, response, next) => {
  try {
    const name = requiredText(request.body.name, 'Farm name');
    const ownerName = requiredText(request.body.ownerName, 'Farm owner');
    const province = requiredText(request.body.province, 'Province');
    const district = requiredText(request.body.district, 'District');
    const areaHectares = Number(request.body.areaHectares);
    const farmType = request.body.farmType || 'crop';

    if (!Number.isFinite(areaHectares) || areaHectares <= 0) {
      throw Object.assign(new Error('Farm size must be greater than zero.'), { status: 400 });
    }
    if (!['crop', 'mixed'].includes(farmType)) {
      throw Object.assign(new Error('Farm type is invalid.'), { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO farms
        (name, owner_name, province, district, area_hectares, farm_type, soil_type, irrigation_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, owner_name, province, district, area_hectares,
                 farm_type, soil_type, irrigation_method, created_at, updated_at`,
      [
        name,
        ownerName,
        province,
        district,
        areaHectares,
        farmType,
        optionalText(request.body.soilType),
        optionalText(request.body.irrigationMethod)
      ]
    );
    response.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/farms/:farmId/crop-cycles', requireDatabase, async (request, response, next) => {
  try {
    const farmId = validId(request.params.farmId, 'Farm ID');
    const result = await pool.query(
      `SELECT id, farm_id, crop_name, variety, field_name, planting_date,
              expected_harvest_date, seed_type, seed_supplier, fertilizer_used,
              irrigation_method, current_stage, notes, created_at, updated_at
       FROM crop_cycles
       WHERE farm_id = $1
       ORDER BY planting_date DESC, created_at DESC`,
      [farmId]
    );
    response.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/farms/:farmId/crop-cycles', requireDatabase, async (request, response, next) => {
  const client = await pool?.connect();
  if (!client) {
    response.status(503).json({
      error: 'Database is not configured. Set DATABASE_URL in your .env file.'
    });
    return;
  }

  try {
    const farmId = validId(request.params.farmId, 'Farm ID');
    const cropName = requiredText(request.body.cropName, 'Crop name');
    const variety = requiredText(request.body.variety, 'Variety');
    const plantingDate = validDate(request.body.plantingDate, 'Planting date');
    const expectedHarvestDate = validDate(
      request.body.expectedHarvestDate,
      'Expected harvest date',
      true
    );
    const stage = request.body.currentStage || 'seeded';

    if (!stages.includes(stage)) {
      throw Object.assign(new Error('Growth stage is invalid.'), { status: 400 });
    }
    if (expectedHarvestDate && expectedHarvestDate < plantingDate) {
      throw Object.assign(
        new Error('Expected harvest date cannot be before planting date.'),
        { status: 400 }
      );
    }

    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO crop_cycles
        (farm_id, crop_name, variety, field_name, planting_date, expected_harvest_date,
         seed_type, seed_supplier, fertilizer_used, irrigation_method, current_stage, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, farm_id, crop_name, variety, field_name, planting_date,
                 expected_harvest_date, seed_type, seed_supplier, fertilizer_used,
                 irrigation_method, current_stage, notes, created_at, updated_at`,
      [
        farmId,
        cropName,
        variety,
        optionalText(request.body.fieldName),
        plantingDate,
        expectedHarvestDate,
        optionalText(request.body.seedType),
        optionalText(request.body.seedSupplier),
        optionalText(request.body.fertilizerUsed),
        optionalText(request.body.irrigationMethod),
        stage,
        optionalText(request.body.notes)
      ]
    );
    await client.query(
      `INSERT INTO crop_events (crop_cycle_id, event_type, occurred_on, growth_stage, notes)
       VALUES ($1, 'cycle_created', CURRENT_DATE, $2, $3)`,
      [result.rows[0].id, stage, 'Crop cycle created']
    );
    await client.query('COMMIT');
    response.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

app.patch('/api/crop-cycles/:cropCycleId/stage', requireDatabase, async (request, response, next) => {
  const client = await pool?.connect();
  if (!client) {
    response.status(503).json({
      error: 'Database is not configured. Set DATABASE_URL in your .env file.'
    });
    return;
  }

  try {
    const cropCycleId = validId(request.params.cropCycleId, 'Crop cycle ID');
    const stage = requiredText(request.body.currentStage, 'Growth stage');
    const notes = optionalText(request.body.notes);
    if (!stages.includes(stage)) {
      throw Object.assign(new Error('Growth stage is invalid.'), { status: 400 });
    }

    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE crop_cycles
       SET current_stage = $2, updated_at = now()
       WHERE id = $1
       RETURNING id, farm_id, crop_name, variety, field_name, planting_date,
                 expected_harvest_date, seed_type, seed_supplier, fertilizer_used,
                 irrigation_method, current_stage, notes, created_at, updated_at`,
      [cropCycleId, stage]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      response.status(404).json({ error: 'Crop cycle not found.' });
      return;
    }

    await client.query(
      `INSERT INTO crop_events (crop_cycle_id, event_type, occurred_on, growth_stage, notes)
       VALUES ($1, 'stage_updated', CURRENT_DATE, $2, $3)`,
      [cropCycleId, stage, notes]
    );
    await client.query('COMMIT');
    response.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    error: error.status ? error.message : 'An unexpected server error occurred.'
  });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`AgriConnect API listening on http://127.0.0.1:${port}`);
});
