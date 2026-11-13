CREATE TABLE IF NOT EXISTS farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  owner_name TEXT NOT NULL CHECK (length(trim(owner_name)) > 0),
  province TEXT NOT NULL CHECK (length(trim(province)) > 0),
  district TEXT NOT NULL CHECK (length(trim(district)) > 0),
  area_hectares NUMERIC(10, 2) NOT NULL CHECK (area_hectares > 0),
  farm_type TEXT NOT NULL DEFAULT 'crop'
    CHECK (farm_type IN ('crop', 'mixed')),
  soil_type TEXT,
  irrigation_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crop_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL CHECK (length(trim(crop_name)) > 0),
  variety TEXT NOT NULL CHECK (length(trim(variety)) > 0),
  field_name TEXT,
  planting_date DATE NOT NULL,
  expected_harvest_date DATE,
  seed_type TEXT,
  seed_supplier TEXT,
  fertilizer_used TEXT,
  irrigation_method TEXT,
  current_stage TEXT NOT NULL DEFAULT 'seeded'
    CHECK (current_stage IN (
      'seeded',
      'germination',
      'vegetative',
      'flowering',
      'fruit_development',
      'ready_for_harvest',
      'harvested'
    )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    expected_harvest_date IS NULL OR expected_harvest_date >= planting_date
  )
);

CREATE INDEX IF NOT EXISTS crop_cycles_farm_id_idx
  ON crop_cycles (farm_id);

CREATE TABLE IF NOT EXISTS crop_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_cycle_id UUID NOT NULL REFERENCES crop_cycles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (length(trim(event_type)) > 0),
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  growth_stage TEXT
    CHECK (
      growth_stage IS NULL OR growth_stage IN (
        'seeded',
        'germination',
        'vegetative',
        'flowering',
        'fruit_development',
        'ready_for_harvest',
        'harvested'
      )
    ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crop_events_cycle_date_idx
  ON crop_events (crop_cycle_id, occurred_on DESC);
