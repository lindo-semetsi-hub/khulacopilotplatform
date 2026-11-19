import { useEffect, useState } from 'react';
import AuthPage from './AuthPage.jsx';
import { apiRequest } from './api.js';

const growthStages = [
  { value: 'seeded', label: 'Seeded' },
  { value: 'germination', label: 'Germination' },
  { value: 'vegetative', label: 'Vegetative' },
  { value: 'flowering', label: 'Flowering' },
  { value: 'fruit_development', label: 'Fruit development' },
  { value: 'ready_for_harvest', label: 'Ready for harvest' },
  { value: 'harvested', label: 'Harvested' }
];

const navigation = [
  { id: 'overview', label: 'Overview', symbol: 'O' },
  { id: 'farm-profile', label: 'Farm profile', symbol: 'F' },
  { id: 'crop-records', label: 'Crop records', symbol: 'C' },
  { id: 'bundles', label: 'MTN Data Bundles', symbol: 'D' },
  { id: 'learning', label: 'Learning hub', symbol: 'L', premium: true },
  { id: 'weather', label: 'Weather intelligence', symbol: 'W' },
  { id: 'marketplace', label: 'Marketplace', symbol: 'M', premium: true },
  { id: 'assistant', label: 'AI assistant', symbol: 'AI' },
  { id: 'profile', label: 'My profile', symbol: 'U' }
];

const pageTitles = {
  overview: 'Overview',
  'farm-profile': 'Farm profile',
  'crop-records': 'Crop records',
  bundles: 'MTN Data Bundles',
  learning: 'Learning hub',
  weather: 'Weather intelligence',
  marketplace: 'Marketplace',
  assistant: 'AI assistant',
  profile: 'My profile',
  subscription: 'Plans and access'
};

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

const stageLabel = (value) =>
  growthStages.find((stage) => stage.value === value)?.label || value;

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString();
};

function App() {
  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [initialAuthError, setInitialAuthError] = useState('');
  const [activePage, setActivePage] = useState('overview');
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [cropCycles, setCropCycles] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [cropLoading, setCropLoading] = useState(false);
  const [farmForm, setFarmForm] = useState(initialFarmForm);
  const [cropForm, setCropForm] = useState(initialCropForm);
  const [savingFarm, setSavingFarm] = useState(false);
  const [savingCrop, setSavingCrop] = useState(false);
  const [updatingCycleId, setUpdatingCycleId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      const verificationToken = new URLSearchParams(window.location.hash.slice(1)).get('verify');
      try {
        if (verificationToken) {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
          const verifiedUser = await apiRequest('/api/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ token: verificationToken })
          });
          if (active) {
            setUser(verifiedUser);
            setNotice('Email verified. You are now signed in.');
          }
        } else {
          const authenticatedUser = await apiRequest('/api/auth/me');
          if (active) setUser(authenticatedUser);
        }
      } catch (requestError) {
        if (active) setInitialAuthError(requestError.message);
      } finally {
        if (active) setPageLoading(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setFarms([]);
      setSelectedFarmId('');
      setCropCycles([]);
      return;
    }

    let active = true;
    setDataLoading(true);
    setError('');
    apiRequest('/api/farms')
      .then((rows) => {
        if (!active) return;
        setFarms(rows);
        setSelectedFarmId((current) =>
          rows.some((farm) => farm.id === current) ? current : rows[0]?.id || ''
        );
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedFarmId) {
      setCropCycles([]);
      return;
    }
    let active = true;
    setCropLoading(true);
    apiRequest(`/api/farms/${selectedFarmId}/crop-cycles`)
      .then((rows) => {
        if (active) setCropCycles(rows);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setCropLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedFarmId]);

  async function handleFarmSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSavingFarm(true);
    try {
      const farm = await apiRequest('/api/farms', {
        method: 'POST',
        body: JSON.stringify(farmForm)
      });
      setFarms((existing) => [farm, ...existing]);
      setSelectedFarmId(farm.id);
      setFarmForm(initialFarmForm);
      setActivePage('farm-profile');
      setNotice('Farm profile saved to your account.');
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
      const crop = await apiRequest(`/api/farms/${selectedFarmId}/crop-cycles`, {
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
      const updated = await apiRequest(`/api/crop-cycles/${cropCycleId}/stage`, {
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

  async function handleLogout() {
    setError('');
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setActivePage('overview');
      setNotice('');
    } catch (requestError) {
      setError(requestError.message);
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

  if (pageLoading) {
    return <main className="loading">Connecting to Khula AI...</main>;
  }

  if (!user) {
    return (
      <AuthPage
        initialError={error || initialAuthError}
        onAuthenticated={(authenticatedUser) => {
          setInitialAuthError('');
          setError('');
          setUser(authenticatedUser);
        }}
      />
    );
  }

  const selectedFarm = farms.find((farm) => farm.id === selectedFarmId);
  const isPremium = user.subscription === 'premium';
  const hasFarm = farms.length > 0;
  const activeCrops = cropCycles.filter((cycle) => cycle.current_stage !== 'harvested');
  const isLockedPage = !isPremium && ['learning', 'marketplace'].includes(activePage);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="/" aria-label="Khula AI home">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span>Khula AI</span>
        </a>
        <p className="sidebar-caption">CROP LIFECYCLE</p>

        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => {
            const locked = item.premium && !isPremium;
            return (
              <button
                className={`nav-link ${activePage === item.id ? 'active' : ''} ${locked ? 'nav-locked' : ''}`}
                key={item.id}
                onClick={() => {
                  setActivePage(item.id);
                  setError('');
                  setNotice('');
                }}
                aria-current={activePage === item.id ? 'page' : undefined}
              >
                <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>
                <span className="nav-text">{item.label}</span>
                {locked && <span className="nav-lock">Premium</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-link plan-link ${activePage === 'subscription' ? 'active' : ''}`}
            onClick={() => {
              setActivePage('subscription');
              setError('');
              setNotice('');
            }}
          >
            <span className="nav-symbol" aria-hidden="true">↗</span>
            <span className="nav-text">Plans and access</span>
          </button>
          <div className="account-card">
            <div className="account-avatar" aria-hidden="true">
              {user.email.slice(0, 1).toUpperCase()}
            </div>
            <div className="account-details">
              <strong>{user.email}</strong>
              <span>{user.subscription === 'premium' ? 'Premium plan' : 'Basic plan'}</span>
            </div>
            <button className="logout-button" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">KHULA AI WORKSPACE</p>
            <h1>{pageTitles[activePage] || 'Overview'}</h1>
          </div>
          <span className="plan-badge">{isPremium ? 'Premium' : 'Basic'} plan</span>
        </header>

        <main className="page-content">
          {(error || notice) && (
            <div className={`feedback ${error ? 'feedback-error' : 'feedback-success'}`} role="status">
              {error || notice}
            </div>
          )}

          {isLockedPage ? (
            <PremiumGate
              feature={activePage === 'learning' ? 'Learning hub' : 'Marketplace'}
              onViewPlans={() => setActivePage('subscription')}
            />
          ) : activePage === 'overview' ? (
            <OverviewPage
              user={user}
              farms={farms}
              selectedFarm={selectedFarm}
              cropCycles={cropCycles}
              activeCrops={activeCrops}
              dataLoading={dataLoading || cropLoading}
              onGoTo={setActivePage}
            />
          ) : activePage === 'farm-profile' ? (
            <FarmProfilePage
              farms={farms}
              selectedFarmId={selectedFarmId}
              onSelectFarm={setSelectedFarmId}
              form={farmForm}
              onChange={updateFarmForm}
              onSubmit={handleFarmSubmit}
              saving={savingFarm}
              hasFarm={hasFarm}
            />
          ) : activePage === 'crop-records' ? (
            <CropRecordsPage
              farms={farms}
              selectedFarmId={selectedFarmId}
              onSelectFarm={setSelectedFarmId}
              cycles={cropCycles}
              loading={cropLoading}
              form={cropForm}
              onChange={updateCropForm}
              onSubmit={handleCropSubmit}
              onStageChange={handleStageChange}
              saving={savingCrop}
              updatingCycleId={updatingCycleId}
            />
          ) : activePage === 'bundles' ? (
            <BundlesPage subscription={user.subscription} onViewPlans={() => setActivePage('subscription')} />
          ) : activePage === 'learning' ? (
            <LearningPage />
          ) : activePage === 'weather' ? (
            <WeatherPage farm={selectedFarm} />
          ) : activePage === 'marketplace' ? (
            <MarketplacePage />
          ) : activePage === 'assistant' ? (
            <AssistantPage farm={selectedFarm} cycles={cropCycles} />
          ) : activePage === 'profile' ? (
            <ProfilePage user={user} />
          ) : (
            <SubscriptionPage subscription={user.subscription} />
          )}
        </main>
      </div>
    </div>
  );
}

function OverviewPage({ user, farms, selectedFarm, cropCycles, activeCrops, dataLoading, onGoTo }) {
  return (
    <div className="content-stack">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">YOUR FARM, SEASON BY SEASON</p>
          <h2>Welcome to your growing season.</h2>
          <p>
            Signed in as {user.email}. Your farm records are private to your account.
          </p>
        </div>
        <button className="button-primary welcome-action" onClick={() => onGoTo('crop-records')}>
          Record crop activity
        </button>
      </section>

      <section className="stats-grid" aria-label="Farm overview">
        <StatCard label="Your farms" value={farms.length} note="In your account" />
        <StatCard label="Active crop cycles" value={activeCrops.length} note="For selected farm" />
        <StatCard
          label="Harvested"
          value={cropCycles.filter((cycle) => cycle.current_stage === 'harvested').length}
          note="For selected farm"
        />
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURRENT ACTIVITIES</p>
            <h2>{selectedFarm ? selectedFarm.name : 'Get your farm started'}</h2>
          </div>
          {farms.length > 1 && (
            <span className="small-note">{farms.length} farms in your account</span>
          )}
        </div>
        {!farms.length ? (
          <div className="empty-state">
            <h3>No farm profile yet</h3>
            <p>Add your farm details, then start recording crop cycles.</p>
            <button className="button-primary compact-button" onClick={() => onGoTo('farm-profile')}>
              Add farm profile
            </button>
          </div>
        ) : dataLoading ? (
          <p className="empty-note">Loading activities...</p>
        ) : cropCycles.length === 0 ? (
          <div className="empty-state">
            <h3>No crop cycles recorded</h3>
            <p>Once you add plantings, their current growth stage will appear here.</p>
            <button className="button-primary compact-button" onClick={() => onGoTo('crop-records')}>
              Add crop record
            </button>
          </div>
        ) : (
          <div className="activity-list">
            {cropCycles.slice(0, 5).map((cycle) => (
              <article className="activity-row" key={cycle.id}>
                <span className={`activity-dot ${cycle.current_stage === 'harvested' ? 'done' : ''}`} />
                <div className="activity-main">
                  <strong>{cycle.crop_name} · {cycle.variety}</strong>
                  <span>{cycle.field_name || selectedFarm?.name || 'Farm'} · planted {formatDate(cycle.planting_date)}</span>
                </div>
                <span className="stage-pill">{stageLabel(cycle.current_stage)}</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="quick-links">
        <button className="quick-link-card" onClick={() => onGoTo('assistant')}>
          <span className="quick-link-icon">AI</span>
          <span><strong>AI assistant</strong><small>Explore crop record support</small></span>
          <span aria-hidden="true">→</span>
        </button>
        <button className="quick-link-card" onClick={() => onGoTo('weather')}>
          <span className="quick-link-icon">W</span>
          <span><strong>Weather intelligence</strong><small>Forecast connection is pending</small></span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
}

function StatCard({ label, value, note }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function FarmProfilePage({ farms, selectedFarmId, onSelectFarm, form, onChange, onSubmit, saving, hasFarm }) {
  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">FARM SETUP</p>
        <h2>Farm profiles</h2>
        <p>Keep location and growing conditions available alongside your crop records.</p>
      </section>
      {farms.length > 0 && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">SAVED FARMS</p>
              <h2>Your farms</h2>
            </div>
            <label className="farm-picker">
              <span className="sr-only">Select a farm</span>
              <select value={selectedFarmId} onChange={(event) => onSelectFarm(event.target.value)}>
                {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
              </select>
            </label>
          </div>
          <div className="farm-summary">
            <div className="farm-avatar" aria-hidden="true">
              {farms.find((farm) => farm.id === selectedFarmId)?.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3>{farms.find((farm) => farm.id === selectedFarmId)?.name}</h3>
              <p>
                {farms.find((farm) => farm.id === selectedFarmId)?.district},
                {' '}{farms.find((farm) => farm.id === selectedFarmId)?.province}
              </p>
            </div>
            <div className="farm-size">
              <strong>{Number(farms.find((farm) => farm.id === selectedFarmId)?.area_hectares).toLocaleString()}</strong>
              <span>hectares</span>
            </div>
          </div>
        </section>
      )}
      <section className="panel form-panel">
        <p className="eyebrow">NEW FARM</p>
        <h2>{hasFarm ? 'Add another farm' : 'Add your first farm'}</h2>
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            Farm name
            <input name="name" value={form.name} onChange={onChange} required />
          </label>
          <label>
            Farm owner or manager
            <input name="ownerName" value={form.ownerName} onChange={onChange} required />
          </label>
          <label>
            Province
            <input name="province" value={form.province} onChange={onChange} required />
          </label>
          <label>
            District
            <input name="district" value={form.district} onChange={onChange} required />
          </label>
          <label>
            Farm size (hectares)
            <input
              name="areaHectares"
              type="number"
              min="0.01"
              step="0.01"
              value={form.areaHectares}
              onChange={onChange}
              required
            />
          </label>
          <label>
            Farm type
            <select name="farmType" value={form.farmType} onChange={onChange}>
              <option value="crop">Crop farming</option>
              <option value="mixed">Mixed farming</option>
            </select>
          </label>
          <label>
            Soil type <span className="optional">(optional)</span>
            <input name="soilType" value={form.soilType} onChange={onChange} />
          </label>
          <label>
            Irrigation method <span className="optional">(optional)</span>
            <input name="irrigationMethod" value={form.irrigationMethod} onChange={onChange} />
          </label>
          <button className="button-primary form-action" disabled={saving}>
            {saving ? 'Saving farm...' : 'Save farm profile'}
          </button>
        </form>
      </section>
    </div>
  );
}

function CropRecordsPage({
  farms, selectedFarmId, onSelectFarm, cycles, loading, form, onChange, onSubmit,
  onStageChange, saving, updatingCycleId
}) {
  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">GROWING SEASON</p>
        <h2>Crop lifecycle records</h2>
        <p>Record plantings and update their growth stage as the season progresses.</p>
      </section>
      {!farms.length ? (
        <section className="panel empty-state">
          <h3>Add a farm before recording crops</h3>
          <p>Crop cycles belong to a farm profile in your account.</p>
        </section>
      ) : (
        <div className="records-layout">
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SAVED CYCLES</p>
                <h2>Crop records</h2>
              </div>
              <label className="farm-picker">
                <span className="sr-only">Select farm for crop records</span>
                <select value={selectedFarmId} onChange={(event) => onSelectFarm(event.target.value)}>
                  {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
                </select>
              </label>
            </div>
            {loading ? (
              <p className="empty-note">Loading crop cycles...</p>
            ) : cycles.length === 0 ? (
              <p className="empty-note">No crop cycles for this farm yet.</p>
            ) : (
              <div className="crop-list">
                {cycles.map((cycle) => (
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
                          onChange={(event) => onStageChange(cycle.id, event.target.value)}
                        >
                          {growthStages.map((stage) => (
                            <option key={stage.value} value={stage.value}>{stage.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="crop-dates">
                      <span>Planted<strong>{formatDate(cycle.planting_date)}</strong></span>
                      <span>Expected harvest<strong>{formatDate(cycle.expected_harvest_date)}</strong></span>
                    </div>
                    {cycle.notes && <p className="crop-notes">{cycle.notes}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel form-panel">
            <p className="eyebrow">NEW RECORD</p>
            <h2>Start a crop cycle</h2>
            <form onSubmit={onSubmit}>
              <label>
                Crop
                <input name="cropName" value={form.cropName} onChange={onChange} required />
              </label>
              <label>
                Variety
                <input name="variety" value={form.variety} onChange={onChange} required />
              </label>
              <label>
                Field or plot <span className="optional">(optional)</span>
                <input name="fieldName" value={form.fieldName} onChange={onChange} />
              </label>
              <div className="form-grid">
                <label>
                  Planting date
                  <input name="plantingDate" type="date" value={form.plantingDate} onChange={onChange} required />
                </label>
                <label>
                  Expected harvest <span className="optional">(optional)</span>
                  <input
                    name="expectedHarvestDate"
                    type="date"
                    value={form.expectedHarvestDate}
                    onChange={onChange}
                  />
                </label>
              </div>
              <label>
                Growth stage
                <select name="currentStage" value={form.currentStage} onChange={onChange}>
                  {growthStages.map((stage) => (
                    <option key={stage.value} value={stage.value}>{stage.label}</option>
                  ))}
                </select>
              </label>
              <details className="optional-details">
                <summary>More planting details</summary>
                <label>
                  Seed type
                  <input name="seedType" value={form.seedType} onChange={onChange} />
                </label>
                <label>
                  Seed supplier
                  <input name="seedSupplier" value={form.seedSupplier} onChange={onChange} />
                </label>
                <label>
                  Fertilizer used
                  <input name="fertilizerUsed" value={form.fertilizerUsed} onChange={onChange} />
                </label>
                <label>
                  Irrigation method
                  <input name="irrigationMethod" value={form.irrigationMethod} onChange={onChange} />
                </label>
              </details>
              <label>
                Notes <span className="optional">(optional)</span>
                <textarea name="notes" value={form.notes} onChange={onChange} />
              </label>
              <button className="button-primary" disabled={saving}>
                {saving ? 'Saving crop...' : 'Save crop cycle'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function BundlesPage({ subscription, onViewPlans }) {
  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">CONNECTIVITY</p>
        <h2>MTN Data Bundles</h2>
        <p>Bundle availability will be matched to the subscription on your account.</p>
      </section>
      <section className="panel feature-notice">
        <span className="feature-mark">MTN</span>
        <div>
          <p className="eyebrow">BUNDLE CATALOGUE PREVIEW</p>
          <h3>{subscription === 'premium' ? 'Premium bundle options' : 'Basic bundle options'}</h3>
          <p>MTN bundle sizes, prices, and eligibility have not been configured yet.</p>
          <p className="small-note">
            No purchases are processed here. A payment provider and MTN bundle catalogue
            must be configured before checkout can be enabled.
          </p>
        </div>
      </section>
      <div className="two-card-grid">
        <section className="panel mini-feature">
          <p className="eyebrow">CURRENT SUBSCRIPTION</p>
          <h3>{subscription === 'premium' ? 'Premium' : 'Basic'}</h3>
          <p>Bundle offers will be displayed here once the plan-specific catalogue is agreed.</p>
          <button className="button-secondary" onClick={onViewPlans}>View plan access</button>
        </section>
        <section className="panel mini-feature">
          <p className="eyebrow">PURCHASE STATUS</p>
          <h3>Checkout not connected</h3>
          <p>There is no payment gateway, authorization, or charge in this prototype.</p>
          <button className="button-disabled" disabled>Purchases unavailable</button>
        </section>
      </div>
    </div>
  );
}

function LearningPage() {
  const lessons = [
    {
      title: 'Build healthier soil',
      description: 'Learn the basics of soil testing, organic matter, and matching amendments to a field.'
    },
    {
      title: 'Use water more efficiently',
      description: 'Explore irrigation scheduling, soil moisture checks, and ways to reduce avoidable water loss.'
    },
    {
      title: 'Integrated pest management',
      description: 'A preview of monitoring, prevention, and safe decision-making before treatment.'
    }
  ];
  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">PREMIUM LEARNING</p>
        <h2>Learning hub</h2>
        <p>Short, practical lessons for modern crop farming. This is a content preview.</p>
      </section>
      <div className="lesson-grid">
        {lessons.map((lesson, index) => (
          <article className="panel lesson-card" key={lesson.title}>
            <span className="lesson-number">0{index + 1}</span>
            <p className="eyebrow">CROP FARMING · PREVIEW</p>
            <h3>{lesson.title}</h3>
            <p>{lesson.description}</p>
            <span className="lesson-status">Lesson content coming later</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function WeatherPage({ farm }) {
  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">BASIC AND PREMIUM</p>
        <h2>Weather intelligence</h2>
        <p>Farm-specific forecasts and crop-aware alerts belong here.</p>
      </section>
      <section className="panel feature-notice">
        <span className="feature-mark">W</span>
        <div>
          <p className="eyebrow">{farm ? `FARM LOCATION · ${farm.district}, ${farm.province}` : 'FARM LOCATION'}</p>
          <h3>Live forecast is not connected</h3>
          <p>
            No forecast or weather-based recommendations are generated yet. A weather
            provider must be connected before Khula AI can make timely suggestions.
          </p>
        </div>
      </section>
    </div>
  );
}

function MarketplacePage() {
  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">PREMIUM MARKETPLACE</p>
        <h2>Marketplace</h2>
        <p>Connect crop producers with buyers and agricultural suppliers.</p>
      </section>
      <section className="panel empty-state">
        <h3>Marketplace preview</h3>
        <p>There are no live listings yet. Listings and contact details will appear when marketplace services are connected.</p>
      </section>
    </div>
  );
}

function AssistantPage({ farm, cycles }) {
  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">BASIC AND PREMIUM</p>
        <h2>AI assistant</h2>
        <p>Designed to use your crop records as context, not guess from generic advice.</p>
      </section>
      <section className="panel assistant-preview">
        <div className="assistant-heading">
          <span className="assistant-avatar">AI</span>
          <div>
            <h3>Khula AI Copilot</h3>
            <p>Crop lifecycle support · Preview</p>
          </div>
          <span className="status-chip">Not connected</span>
        </div>
        <div className="assistant-context">
          <strong>Available account context</strong>
          <span>{farm ? `${farm.name} · ${cycles.length} crop records` : 'Add a farm and crop records to build your farm history'}</span>
        </div>
        <div className="assistant-capabilities">
          <article>
            <span>01</span>
            <strong>Record-based answers</strong>
            <p>Planned to reference your farm and crop lifecycle history.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Image disease support</strong>
            <p>Not active. Any future image assessment must state uncertainty and recommend expert review.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Weather-aware suggestions</strong>
            <p>Requires a live forecast source before timely advice can be generated.</p>
          </article>
        </div>
        <p className="small-note">
          This preview does not diagnose crop disease or generate AI recommendations.
        </p>
      </section>
    </div>
  );
}

function PremiumGate({ feature, onViewPlans }) {
  return (
    <section className="panel premium-gate">
      <span className="feature-mark">P</span>
      <p className="eyebrow">PREMIUM FEATURE</p>
      <h2>{feature} is included with Premium</h2>
      <p>Your current Basic plan includes Overview, farm and crop records, MTN Data Bundles, Weather Intelligence, and AI Assistant.</p>
      <button className="button-primary compact-button" onClick={onViewPlans}>Compare plans</button>
    </section>
  );
}

function SubscriptionPage({ subscription }) {
  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">SUBSCRIPTIONS</p>
        <h2>Plans and access</h2>
        <p>Basic is available now. Premium access is shown as a preview until billing is configured.</p>
      </section>
      <div className="plan-grid">
        <section className={`panel plan-card ${subscription === 'basic' ? 'selected-plan' : ''}`}>
          <p className="eyebrow">CURRENT PLAN</p>
          <h3>Basic</h3>
          <p>Core crop tracking plus the features selected for Basic.</p>
          <ul>
            <li>Overview, farm profiles, and crop records</li>
            <li>AI assistant preview</li>
            <li>MTN Data Bundles catalogue</li>
            <li>Weather intelligence</li>
          </ul>
          {subscription === 'basic' && <span className="lesson-status">Your current plan</span>}
        </section>
        <section className={`panel plan-card ${subscription === 'premium' ? 'selected-plan' : ''}`}>
          <p className="eyebrow">FULL FEATURE SET</p>
          <h3>Premium</h3>
          <p>Everything in Basic, plus premium learning and marketplace features.</p>
          <ul>
            <li>Everything in Basic</li>
            <li>Learning hub</li>
            <li>Marketplace</li>
          </ul>
          {subscription === 'premium' ? (
            <span className="lesson-status">Your current plan</span>
          ) : (
            <p className="small-note">Upgrade is unavailable until a payment provider and pricing are selected. No payment is taken.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function ProfilePage({ user }) {
  const createdDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : 'Not available';
  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h2>My profile</h2>
        <p>Contact details and current access for your Khula AI account.</p>
      </section>
      <section className="panel profile-card">
        <div className="profile-header">
          <div className="profile-avatar-large" aria-hidden="true">
            {user.email.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">KHULA AI ACCOUNT</p>
            <h3>{user.email}</h3>
          </div>
        </div>
        <dl className="profile-details">
          <div>
            <dt>Email address</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Mobile number</dt>
            <dd>{user.mobileNumber}</dd>
          </div>
          <div>
            <dt>Subscription</dt>
            <dd>{user.subscription === 'premium' ? 'Premium' : 'Basic'}</dd>
          </div>
          <div>
            <dt>Account created</dt>
            <dd>{createdDate}</dd>
          </div>
          <div>
            <dt>Email verification</dt>
            <dd>{user.emailVerified ? 'Verified' : 'Not verified'}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export default App;
