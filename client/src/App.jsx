import { useEffect, useState } from 'react';

const growthStages = [
  { value: 'seeded', label: 'Seeded' },
  { value: 'germination', label: 'Germination' },
  { value: 'vegetative', label: 'Vegetative' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'fruit_development', label: 'Fruit development' },
  { value: 'ready_for_harvest', label: 'Ready for harvest' },
  { value: 'harvested', label: 'Harvested' }
];

const initialFarmForm = {
  name: '',
  ownerName: '',
  province: '',
  district: '',
  areaHectares: '',
  farmType: 'crop',
  soilType: '',
  irrigationMethod: ''
};

const initialCropForm = {
  cropName: '',
  variety: '',
  fieldName: '',
  plantingDate: '',
  expectedHarvestDate: '',
  seedType: '',
  seedSupplier: '',
  fertilizerUsed: '',
  irrigationMethod: '',
  currentStage: 'seeded',
  notes: ''
};

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

function App() {
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [cropCycles, setCropCycles] = useState([]);
  const [farmForm, setFarmForm] = useState(initialFarmForm);
  const [cropForm, setCropForm] = useState(initialCropForm);
  const [pageLoading, setPageLoading] = useState(true);
  const [cropLoading, setCropLoading] = useState(false);
  const [savingFarm, setSavingFarm] = useState(false);
  const [savingCrop, setSavingCrop] = useState(false);
  const [updatingCycleId, setUpdatingCycleId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    request('/api/farms')
      .then((rows) => {
        setFarms(rows);
        if (rows.length) setSelectedFarmId(rows[0].id);
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedFarmId) {
      setCropCycles([]);
      return;
    }

    setCropLoading(true);
    request(`/api/farms/${selectedFarmId}/crop-cycles`)
      .then(setCropCycles)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setCropLoading(false));
  }, [selectedFarmId]);

  async function handleFarmSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingFarm(true);
    try {
      const farm = await request('/api/farms', {
        method: 'POST',
        body: JSON.stringify(farmForm)
      });
      setFarms((existing) => [farm, ...existing]);
      setSelectedFarmId(farm.id);
      setFarmForm(initialFarmForm);
      setNotice('Farm profile saved.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingFarm(false);
    }
  }

  async function handleCropSubmit(event) {
    event.preventDefault();
    if (!selectedFarmId) return;
    setError('');
    setNotice('');
    setSavingCrop(true);
    try {
      const crop = await request(`/api/farms/${selectedFarmId}/crop-cycles`, {
        method: 'POST',
        body: JSON.stringify(cropForm)
      });
      setCropCycles((existing) => [crop, ...existing]);
      setCropForm(initialCropForm);
      setNotice('Crop cycle saved.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingCrop(false);
    }
  }

  async function handleStageChange(cropCycleId, currentStage) {
    setError('');
    setNotice('');
    setUpdatingCycleId(cropCycleId);
    try {
      const updated = await request(`/api/crop-cycles/${cropCycleId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ currentStage })
      });
      setCropCycles((existing) =>
        existing.map((cycle) => cycle.id === updated.id ? updated : cycle)
      );
      setNotice('Growth stage updated and added to the crop history.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdatingCycleId('');
    }
  }

  function updateFarmForm(event) {
    const { name, value } = event.target;
    setFarmForm((current) => ({ ...current, [name]: value }));
  }

  function updateCropForm(event) {
    const { name, value } = event.target;
    setCropForm((current) => ({ ...current, [name]: value }));
  }

  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId);

  if (pageLoading) {
    return <main className="loading">Connecting to AgriConnect...</main>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="AgriConnect home">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>AgriConnect</span>
        </a>
        <span className="topbar-label">Crop lifecycle workspace</span>
      </header>

      <section className="hero">
        <p className="eyebrow">YOUR FARM, SEASON BY SEASON</p>
        <h1>Keep every crop’s story in one place.</h1>
        <p className="hero-copy">
          Start with a farm profile, then record plantings and follow each crop
          through its growth stages.
        </p>
      </section>

      {(error || notice) && (
        <div className={`feedback ${error ? 'feedback-error' : 'feedback-success'}`} role="status">
          {error || notice}
        </div>
      )}

      <section className="workspace-grid">
        <div className="main-column">
          <section className="panel farm-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">FARM PROFILE</p>
                <h2>Your farms</h2>
              </div>
              {farms.length > 0 && (
                <label className="farm-picker">
                  <span className="sr-only">Select a farm</span>
                  <select
                    value={selectedFarmId}
                    onChange={(event) => setSelectedFarmId(event.target.value)}
                  >
                    {farms.map((farm) => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {selectedFarm ? (
              <div className="farm-summary">
                <div className="farm-avatar" aria-hidden="true">
                  {selectedFarm.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3>{selectedFarm.name}</h3>
                  <p>{selectedFarm.district}, {selectedFarm.province}</p>
                </div>
                <div className="farm-size">
                  <strong>{Number(selectedFarm.area_hectares).toLocaleString()}</strong>
                  <span>hectares</span>
                </div>
              </div>
            ) : (
              <p className="empty-note">Add your farm details to get started.</p>
            )}

            <details className="form-disclosure" open={farms.length === 0}>
              <summary>{farms.length ? 'Add another farm' : 'Add your first farm'}</summary>
              <form className="form-grid" onSubmit={handleFarmSubmit}>
                <label>
                  Farm name
                  <input name="name" value={farmForm.name} onChange={updateFarmForm} required />
                </label>
                <label>
                  Farm owner
                  <input name="ownerName" value={farmForm.ownerName} onChange={updateFarmForm} required />
                </label>
                <label>
                  Province
                  <input name="province" value={farmForm.province} onChange={updateFarmForm} required />
                </label>
                <label>
                  District
                  <input name="district" value={farmForm.district} onChange={updateFarmForm} required />
                </label>
                <label>
                  Farm size (hectares)
                  <input
                    name="areaHectares"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={farmForm.areaHectares}
                    onChange={updateFarmForm}
                    required
                  />
                </label>
                <label>
                  Farm type
                  <select name="farmType" value={farmForm.farmType} onChange={updateFarmForm}>
                    <option value="crop">Crop farming</option>
                    <option value="mixed">Mixed farming</option>
                  </select>
                </label>
                <label>
                  Soil type <span className="optional">(optional)</span>
                  <input name="soilType" value={farmForm.soilType} onChange={updateFarmForm} />
                </label>
                <label>
                  Irrigation method <span className="optional">(optional)</span>
                  <input
                    name="irrigationMethod"
                    value={farmForm.irrigationMethod}
                    onChange={updateFarmForm}
                  />
                </label>
                <button className="button-primary form-action" disabled={savingFarm}>
                  {savingFarm ? 'Saving farm...' : 'Save farm profile'}
                </button>
              </form>
            </details>
          </section>

          <section className="panel crop-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">GROWING SEASON</p>
                <h2>Crop cycles</h2>
              </div>
              <span className="count-badge">{cropCycles.length} records</span>
            </div>

            {!selectedFarmId ? (
              <p className="empty-note">Save a farm profile before adding crop cycles.</p>
            ) : cropLoading ? (
              <p className="empty-note">Loading crop cycles...</p>
            ) : cropCycles.length === 0 ? (
              <p className="empty-note">No crop cycles yet. Add a planting to begin tracking its progress.</p>
            ) : (
              <div className="crop-list">
                {cropCycles.map((cycle) => (
                  <article className="crop-card" key={cycle.id}>
                    <div className="crop-card-top">
                      <div>
                        <h3>{cycle.crop_name}</h3>
                        <p>{cycle.variety}{cycle.field_name ? ` · ${cycle.field_name}` : ''}</p>
                      </div>
                      <label className="stage-control">
                        <span className="sr-only">Growth stage for {cycle.crop_name}</span>
                        <select
                          value={cycle.current_stage}
                          disabled={updatingCycleId === cycle.id}
                          onChange={(event) => handleStageChange(cycle.id, event.target.value)}
                        >
                          {growthStages.map((stage) => (
                            <option key={stage.value} value={stage.value}>{stage.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="crop-dates">
                      <span>Planted <strong>{cycle.planting_date.slice(0, 10)}</strong></span>
                      {cycle.expected_harvest_date && (
                        <span>Expected harvest <strong>{cycle.expected_harvest_date.slice(0, 10)}</strong></span>
                      )}
                    </div>
                    {cycle.notes && <p className="crop-notes">{cycle.notes}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="panel crop-form-panel">
          <p className="eyebrow">NEW RECORD</p>
          <h2>Start a crop cycle</h2>
          <p className="panel-intro">Record a planting to begin its lifecycle timeline.</p>
          <form onSubmit={handleCropSubmit}>
            <label>
              Crop
              <input name="cropName" value={cropForm.cropName} onChange={updateCropForm} required disabled={!selectedFarmId} />
            </label>
            <label>
              Variety
              <input name="variety" value={cropForm.variety} onChange={updateCropForm} required disabled={!selectedFarmId} />
            </label>
            <label>
              Field or plot <span className="optional">(optional)</span>
              <input name="fieldName" value={cropForm.fieldName} onChange={updateCropForm} disabled={!selectedFarmId} />
            </label>
            <div className="form-grid">
              <label>
                Planting date
                <input
                  name="plantingDate"
                  type="date"
                  value={cropForm.plantingDate}
                  onChange={updateCropForm}
                  required
                  disabled={!selectedFarmId}
                />
              </label>
              <label>
                Expected harvest <span className="optional">(optional)</span>
                <input
                  name="expectedHarvestDate"
                  type="date"
                  value={cropForm.expectedHarvestDate}
                  onChange={updateCropForm}
                  disabled={!selectedFarmId}
                />
              </label>
            </div>
            <label>
              Growth stage
              <select
                name="currentStage"
                value={cropForm.currentStage}
                onChange={updateCropForm}
                disabled={!selectedFarmId}
              >
                {growthStages.map((stage) => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
            </label>
            <details className="optional-details">
              <summary>More planting details</summary>
              <label>
                Seed type
                <input name="seedType" value={cropForm.seedType} onChange={updateCropForm} disabled={!selectedFarmId} />
              </label>
              <label>
                Seed supplier
                <input name="seedSupplier" value={cropForm.seedSupplier} onChange={updateCropForm} disabled={!selectedFarmId} />
              </label>
              <label>
                Fertilizer used
                <input name="fertilizerUsed" value={cropForm.fertilizerUsed} onChange={updateCropForm} disabled={!selectedFarmId} />
              </label>
              <label>
                Irrigation method
                <input
                  name="irrigationMethod"
                  value={cropForm.irrigationMethod}
                  onChange={updateCropForm}
                  disabled={!selectedFarmId}
                />
              </label>
            </details>
            <label>
              Notes <span className="optional">(optional)</span>
              <textarea name="notes" value={cropForm.notes} onChange={updateCropForm} disabled={!selectedFarmId} />
            </label>
            <button className="button-primary" disabled={!selectedFarmId || savingCrop}>
              {savingCrop ? 'Saving crop...' : 'Save crop cycle'}
            </button>
          </form>
        </aside>
      </section>
      <footer className="footer">
        <span>AgriConnect · Crop lifecycle workspace</span>
        <span>Weather, marketplace, and plan features can be added as the product grows.</span>
      </footer>
    </main>
  );
}

export default App;
