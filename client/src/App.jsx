import { useEffect, useRef, useState } from 'react';
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

const bundleGroups = [
  {
    id: 'once-off',
    eyebrow: 'ONCE-OFF',
    title: 'One-time bundles',
    description: 'Pay once. These bundles do not renew.',
    offers: [
      { id: 'once_1_5gb', name: '1.5GB Anytime Data', price: 'R34.99' },
      { id: 'once_5gb_40min', name: '5GB Anytime Data', detail: '40 minutes voice', price: 'R105' },
      { id: 'once_7gb_50min', name: '7GB Anytime Data', detail: '50 minutes voice', price: 'R149.99' }
    ]
  },
  {
    id: 'monthly',
    eyebrow: 'RECURRING · MONTHLY',
    title: 'Monthly bundles',
    description: 'Recurring monthly bundle and voice allowance.',
    offers: [
      { id: 'monthly_10gb_80min', name: '10GB Anytime Data', detail: '80 minutes voice', price: 'R199.99' },
      { id: 'monthly_15gb_100min', name: '15GB Anytime Data', detail: '100 minutes voice', price: 'R239.99' },
      { id: 'monthly_20gb_100min', name: '20GB Anytime Data', detail: '100 minutes voice', price: 'R309.99' }
    ]
  }
];

const initialFarmForm = {
  name: '',
  ownerName: '',
  province: '',
  district: '',
  nearestTown: '',
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

const weatherDescription = (code) => ({
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
}[code] || 'Conditions unavailable');

function App() {
  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [initialAuthError, setInitialAuthError] = useState('');
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [assistantAvailable, setAssistantAvailable] = useState(false);
  const [payfastConfigured, setPayfastConfigured] = useState(false);
  const [payfastCheckoutAvailable, setPayfastCheckoutAvailable] = useState(false);
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
        const serverStatus = await apiRequest('/api/health');
        if (active) {
          setEmailVerificationRequired(serverStatus.emailVerificationRequired);
          setAssistantAvailable(serverStatus.assistantConfigured);
          setPayfastConfigured(serverStatus.payfastConfigured);
          setPayfastCheckoutAvailable(serverStatus.payfastCheckoutAvailable);
        }
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
          if (active) {
            setUser(authenticatedUser);
            if (new URLSearchParams(window.location.search).has('bundle_order')) {
              setActivePage('bundles');
            }
          }
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

  async function handleWeatherLocationSave(nearestTown) {
    const updated = await apiRequest(`/api/farms/${selectedFarmId}/weather-location`, {
      method: 'PATCH',
      body: JSON.stringify({ nearestTown })
    });
    setFarms((existing) =>
      existing.map((farm) =>
        farm.id === selectedFarmId ? { ...farm, ...updated } : farm
      )
    );
    return updated;
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

  function handleSessionExpired() {
    setUser(null);
    setActivePage('overview');
    setError('');
    setNotice('');
    setInitialAuthError('Your session expired. Sign in again to continue.');
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
        emailVerificationRequired={emailVerificationRequired}
        onAuthenticated={(authenticatedUser) => {
          setInitialAuthError('');
          setError('');
          setUser(authenticatedUser);
          if (new URLSearchParams(window.location.search).has('bundle_order')) {
            setActivePage('bundles');
          }
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
            <BundlesPage
              subscription={user.subscription}
              userMobile={user.mobileNumber}
              isBundleAdmin={user.isBundleAdmin}
              payfastConfigured={payfastConfigured}
              payfastCheckoutAvailable={payfastCheckoutAvailable}
              onViewPlans={() => setActivePage('subscription')}
            />
          ) : activePage === 'learning' ? (
            <LearningPage />
          ) : activePage === 'weather' ? (
            <WeatherPage
              farm={selectedFarm}
              onSaveNearestTown={handleWeatherLocationSave}
              onSessionExpired={handleSessionExpired}
            />
          ) : activePage === 'marketplace' ? (
            <MarketplacePage />
          ) : activePage === 'assistant' ? (
            <AssistantPage farm={selectedFarm} cycles={cropCycles} assistantAvailable={assistantAvailable} />
          ) : activePage === 'profile' ? (
            <ProfilePage user={user} emailVerificationRequired={emailVerificationRequired} />
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
          <span><strong>Weather intelligence</strong><small>Seven-day forecast for your nearest town</small></span>
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
              <p>Forecast location: {farms.find((farm) => farm.id === selectedFarmId)?.nearest_town || 'Not set'}</p>
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
            Nearest town for weather
            <input name="nearestTown" value={form.nearestTown} onChange={onChange} required maxLength="100" />
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

function BundlesPage({
  subscription,
  userMobile,
  isBundleAdmin,
  payfastConfigured,
  payfastCheckoutAvailable,
  onViewPlans
}) {
  const [orders, setOrders] = useState([]);
  const [fulfillmentQueue, setFulfillmentQueue] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [checkoutBundleId, setCheckoutBundleId] = useState('');
  const [fulfillmentUpdatingId, setFulfillmentUpdatingId] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [returnNotice, setReturnNotice] = useState('');
  const [recipientMobile, setRecipientMobile] = useState(userMobile || '');
  const returnedOrderId = new URLSearchParams(window.location.search).get('bundle_order');
  const paymentReturn = new URLSearchParams(window.location.search).get('payment_return');
  const returnedOrderIsPaid = orders.some(
    (order) => order.id === returnedOrderId && order.paymentStatus === 'paid'
  );
  const feedbackClass = checkoutError || paymentReturn === 'cancelled'
    ? 'feedback-error'
    : returnedOrderIsPaid
      ? 'feedback-success'
      : 'feedback-warning';

  useEffect(() => {
    let active = true;
    setOrdersLoading(true);
    setCheckoutError('');
    Promise.all([
      apiRequest('/api/bundle-orders'),
      isBundleAdmin ? apiRequest('/api/admin/bundle-orders') : Promise.resolve([])
    ])
      .then(([rows, queue]) => {
        if (!active) return;
        setOrders(rows);
        setFulfillmentQueue(queue);
      })
      .catch((requestError) => {
        if (active) setCheckoutError(requestError.message);
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isBundleAdmin, refreshKey]);

  useEffect(() => {
    if (!returnedOrderId) return;
    if (paymentReturn === 'cancelled') {
      setReturnNotice('Checkout was cancelled. No payment confirmation was received.');
      return;
    }

    const returnedOrder = orders.find((order) => order.id === returnedOrderId);
    setReturnNotice(
      returnedOrder?.paymentStatus === 'paid'
        ? 'Payment confirmed. MTN bundle delivery is pending manual fulfillment.'
        : 'You returned from PayFast. Khula AI is waiting for its verified payment notification; refresh the order status shortly.'
    );
  }, [orders, paymentReturn, returnedOrderId]);

  async function handlePurchase(offer) {
    setCheckoutBundleId(offer.id);
    setCheckoutError('');

    try {
      const checkout = await apiRequest('/api/bundle-orders', {
        method: 'POST',
        body: JSON.stringify({ bundleId: offer.id, recipientMobile })
      });
      const checkoutUrl = new URL(checkout.actionUrl);
      const allowedCheckoutUrls = [
        'https://sandbox.payfast.co.za/eng/process',
        'https://www.payfast.co.za/eng/process'
      ];
      if (!allowedCheckoutUrls.includes(checkoutUrl.toString()) || !checkout.fields) {
        throw new Error('PayFast returned an invalid checkout destination.');
      }

      async function handleMarkFulfilled(paymentId) {
        setFulfillmentUpdatingId(paymentId);
        setCheckoutError('');
        try {
          await apiRequest(`/api/admin/bundle-order-payments/${paymentId}/fulfillment`, {
            method: 'PATCH'
          });
          setRefreshKey((current) => current + 1);
        } catch (requestError) {
          setCheckoutError(requestError.message);
        } finally {
          setFulfillmentUpdatingId('');
        }
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkoutUrl.toString();
      form.hidden = true;
      for (const [name, value] of Object.entries(checkout.fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = String(value);
        form.append(input);
      }
      document.body.append(form);
      form.submit();
    } catch (requestError) {
      setCheckoutError(requestError.message);
      setCheckoutBundleId('');
    }
  }

  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">CONNECTIVITY</p>
        <h2>MTN Data Bundles</h2>
        <p>Choose a bundle and pay securely through PayFast.</p>
      </section>
      {(checkoutError || returnNotice) && (
        <div className={`feedback ${feedbackClass}`} role="status">
          {checkoutError || returnNotice}
        </div>
      )}
      <section className="panel bundle-recipient">
        <label>
          MTN number to receive the bundle
          <input
            type="tel"
            autoComplete="tel"
            value={recipientMobile}
            onChange={(event) => setRecipientMobile(event.target.value)}
            placeholder="+27 82 123 4567"
          />
        </label>
        <p className="small-note">
          Your account mobile number is prefilled. You can change it if the bundle is for another South African number.
        </p>
      </section>
      {bundleGroups.map((group) => (
        <section className="bundle-group" key={group.id}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{group.eyebrow}</p>
              <h2>{group.title}</h2>
            </div>
            <span className="small-note">{group.description}</span>
          </div>
          <div className="bundle-grid">
            {group.offers.map((offer) => (
              <article className="panel bundle-card" key={offer.id}>
                <div>
                  <h3>{offer.name}</h3>
                  <p>{offer.detail || 'Data only'}</p>
                </div>
                <strong className="bundle-price">
                  {offer.price}
                  {group.id === 'monthly' && <span>/ month</span>}
                </strong>
                <button
                  className={payfastCheckoutAvailable ? 'button-primary' : 'button-disabled'}
                  disabled={!payfastCheckoutAvailable || Boolean(checkoutBundleId)}
                  onClick={() => handlePurchase(offer)}
                >
                  {checkoutBundleId === offer.id
                    ? 'Opening PayFast...'
                    : group.id === 'monthly'
                      ? 'Subscribe with PayFast'
                      : 'Buy with PayFast'}
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
      <div className="two-card-grid">
        <section className="panel mini-feature">
          <p className="eyebrow">CURRENT SUBSCRIPTION</p>
          <h3>{subscription === 'premium' ? 'Premium' : 'Basic'}</h3>
          <p>Plan-specific bundle eligibility has not been configured yet.</p>
          <button className="button-secondary" onClick={onViewPlans}>View plan access</button>
        </section>
        <section className="panel mini-feature">
          <p className="eyebrow">PURCHASE STATUS</p>
          <h3>
            {!payfastConfigured
              ? 'Set up PayFast checkout'
              : payfastCheckoutAvailable
                ? 'PayFast sandbox ready'
                : 'Live checkout is disabled'}
          </h3>
          <p>
            {!payfastConfigured
              ? 'Add PayFast sandbox settings to the server .env file, then restart the API. See .env.example for the variable names.'
              : payfastCheckoutAvailable
                ? 'Sandbox payments are verified by the server before an order is marked paid.'
                : 'Live payments are blocked until seller order management and customer cancellation are ready.'}
          </p>
          <p>Paid bundles are not sent automatically; fulfill them manually and record delivery in the admin queue.</p>
        </section>
      </div>
      {isBundleAdmin && (
        <section className="panel bundle-orders">
          <div className="bundle-orders-heading">
            <div>
              <p className="eyebrow">ADMIN</p>
              <h3>Manual fulfillment queue</h3>
            </div>
          </div>
          {ordersLoading && !fulfillmentQueue.length ? (
            <p className="empty-note">Loading payments to fulfill...</p>
          ) : fulfillmentQueue.length ? (
            <div className="bundle-order-list">
              {fulfillmentQueue.map((payment) => (
                <article className="bundle-order" key={payment.paymentId}>
                  <div className="bundle-order-summary">
                    <div>
                      <strong>{payment.bundleName}</strong>
                      <p>
                        {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
                          .format(payment.amountCents / 100)}
                        {payment.recurring ? ' · monthly subscription' : ' · once-off'}
                      </p>
                      <p>{payment.customerEmail} · Recipient: {payment.recipientMobile}</p>
                    </div>
                    <button
                      className="button-primary"
                      disabled={fulfillmentUpdatingId === payment.paymentId}
                      onClick={() => handleMarkFulfilled(payment.paymentId)}
                    >
                      {fulfillmentUpdatingId === payment.paymentId
                        ? 'Saving...'
                        : 'Mark delivered'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-note">No paid bundles are waiting for delivery.</p>
          )}
        </section>
      )}
      <section className="panel bundle-orders">
        <div className="bundle-orders-heading">
          <div>
            <p className="eyebrow">PURCHASE HISTORY</p>
            <h3>Your bundle orders</h3>
          </div>
          <button
            className="button-secondary"
            disabled={ordersLoading}
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            {ordersLoading ? 'Refreshing...' : 'Refresh status'}
          </button>
        </div>
        {ordersLoading && !orders.length ? (
          <p className="empty-note">Loading your orders...</p>
        ) : orders.length ? (
          <div className="bundle-order-list">
            {orders.map((order) => (
              <article className="bundle-order" key={order.id}>
                <div className="bundle-order-summary">
                  <div>
                    <strong>{order.bundleName}</strong>
                    <p>
                      {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
                        .format(order.amountCents / 100)}
                      {order.recurring ? ' · monthly subscription' : ' · once-off'}
                    </p>
                    <p>Recipient: {order.recipientMobile}</p>
                  </div>
                  <span className="status-chip">
                    {order.paymentStatus === 'paid' ? 'Payment confirmed' : 'Awaiting payment'}
                  </span>
                </div>
                {order.payments.map((payment) => (
                  <p className="bundle-fulfillment-status" key={`${order.id}-${payment.createdAt}`}>
                    {payment.fulfillmentStatus === 'fulfilled'
                      ? 'Bundle marked as delivered.'
                      : 'Paid · waiting for manual MTN fulfillment.'}
                  </p>
                ))}
                {order.paymentStatus !== 'paid' && (
                  <p className="small-note">A return from PayFast alone does not confirm payment.</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note">No bundle orders yet.</p>
        )}
      </section>
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

function WeatherPage({ farm, onSaveNearestTown, onSessionExpired }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingTown, setSavingTown] = useState(false);
  const [nearestTown, setNearestTown] = useState(farm?.nearest_town || '');
  const [weatherError, setWeatherError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setWeather(null);
    setWeatherError('');
    setNearestTown(farm?.nearest_town || '');

    if (!farm?.id || !farm.nearest_town) {
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    apiRequest(`/api/farms/${farm.id}/weather`, { signal: controller.signal })
      .then((forecast) => {
        if (active) setWeather(forecast);
      })
      .catch((requestError) => {
        if (active && requestError.name !== 'AbortError') {
          if (requestError.status === 401) onSessionExpired();
          else setWeatherError(requestError.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [farm?.id, farm?.nearest_town, refreshKey]);

  async function handleLocationSubmit(event) {
    event.preventDefault();
    setLocationError('');
    setSavingTown(true);
    try {
      await onSaveNearestTown(nearestTown.trim());
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setLocationError(requestError.message);
    } finally {
      setSavingTown(false);
    }
  }

  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">BASIC AND PREMIUM</p>
        <h2>Weather intelligence</h2>
        <p>Check current conditions and the seven-day outlook for your farm's nearest town.</p>
      </section>
      {!farm ? (
        <section className="panel empty-state">
          <h3>Add a farm to view its forecast</h3>
          <p>Farm weather is linked to the farm selected in your profile.</p>
        </section>
      ) : (
        <>
          <section className="panel form-panel">
            <p className="eyebrow">FORECAST LOCATION</p>
            <h2>{farm.name} · {farm.district}, {farm.province}</h2>
            <p className="small-note">Use a South African nearest town, not your exact farm address. This approximate location is used to retrieve the forecast.</p>
            <form className="weather-location-form" onSubmit={handleLocationSubmit}>
              <label>
                Nearest town
                <input
                  value={nearestTown}
                  onChange={(event) => setNearestTown(event.target.value)}
                  maxLength="100"
                  required
                />
              </label>
              <button className="button-primary compact-button" disabled={savingTown}>
                {savingTown ? 'Saving location...' : 'Save forecast location'}
              </button>
            </form>
            {locationError && <p className="weather-error" role="alert">{locationError}</p>}
          </section>

          {loading ? (
            <section className="panel empty-state"><p>Loading the latest forecast...</p></section>
          ) : weatherError ? (
            <section className="panel empty-state">
              <h3>Forecast unavailable</h3>
              <p className="weather-error" role="alert">{weatherError}</p>
              <button className="button-secondary compact-button" onClick={() => setRefreshKey((current) => current + 1)}>
                Try again
              </button>
            </section>
          ) : weather ? (
            <>
              <section className="panel">
                <div className="section-heading weather-section-heading">
                  <div>
                    <p className="eyebrow">CURRENT CONDITIONS · {weather.location.name}</p>
                    <h2>{weatherDescription(weather.current.weather_code)}</h2>
                  </div>
                  <span className="small-note">Updated {new Date(weather.fetchedAt).toLocaleString()}</span>
                </div>
                <div className="weather-current">
                  <strong className="weather-temperature">
                    {weather.current.temperature_2m}{weather.currentUnits?.temperature_2m}
                  </strong>
                  <div className="weather-metrics">
                    <div><span>Humidity</span><strong>{weather.current.relative_humidity_2m}{weather.currentUnits?.relative_humidity_2m}</strong></div>
                    <div><span>Precipitation</span><strong>{weather.current.precipitation} {weather.currentUnits?.precipitation}</strong></div>
                    <div><span>Wind</span><strong>{weather.current.wind_speed_10m} {weather.currentUnits?.wind_speed_10m}</strong></div>
                  </div>
                </div>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">NEXT SEVEN DAYS</p>
                    <h2>Forecast</h2>
                  </div>
                  <span className="small-note">{weather.timezone}</span>
                </div>
                <div className="weather-forecast-grid">
                  {weather.daily.time.map((date, index) => (
                    <article className="weather-day" key={date}>
                      <strong>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                      <span>{weatherDescription(weather.daily.weather_code[index])}</span>
                      <span>High {weather.daily.temperature_2m_max[index]}{weather.dailyUnits?.temperature_2m_max}</span>
                      <span>Low {weather.daily.temperature_2m_min[index]}{weather.dailyUnits?.temperature_2m_min}</span>
                      <span>Rain chance {weather.daily.precipitation_probability_max[index]}{weather.dailyUnits?.precipitation_probability_max}</span>
                      <span>Rain {weather.daily.precipitation_sum[index]} {weather.dailyUnits?.precipitation_sum}</span>
                    </article>
                  ))}
                </div>
                <p className="small-note weather-attribution">
                  Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a> (CC BY 4.0).
                  Prototype use only; a commercial plan is required before commercial launch.
                </p>
              </section>
            </>
          ) : (
            <section className="panel empty-state">
              <h3>Save a nearest town to load the forecast</h3>
              <p>We will use the town and province to find approximate coordinates, then request the weather forecast.</p>
            </section>
          )}
        </>
      )}
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

function AssistantPage({ farm, cycles, assistantAvailable }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');
  const [error, setError] = useState('');
  const bottomOfConversation = useRef(null);
  const suggestions = [
    'Summarize my active crops and their growth stages.',
    'What should I watch for in the next seven days?',
    'Which records would help you give better crop advice?'
  ];

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setMessages([]);
    setError('');
    if (!farm?.id) {
      setLoadingHistory(false);
      return () => controller.abort();
    }

    setLoadingHistory(true);
    apiRequest(`/api/farms/${farm.id}/assistant/messages`, { signal: controller.signal })
      .then((rows) => {
        if (active) setMessages(rows);
      })
      .catch((requestError) => {
        if (active && requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [farm?.id]);

  useEffect(() => {
    bottomOfConversation.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingMessage, sending]);

  async function handleSubmit(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!farm || !assistantAvailable || !content || sending) return;

    setError('');
    setPendingMessage(content);
    setSending(true);
    try {
      const result = await apiRequest(`/api/farms/${farm.id}/assistant/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      setMessages((existing) => [...existing, ...result.messages]);
      setDraft('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingMessage('');
      setSending(false);
    }
  }

  return (
    <div className="content-stack">
      <section className="page-heading">
        <p className="eyebrow">BASIC AND PREMIUM</p>
        <h2>AI assistant</h2>
        <p>Ask Khula AI about your crop records and available farm forecast.</p>
      </section>
      {!farm ? (
        <section className="panel empty-state">
          <h3>Add a farm to start a conversation</h3>
          <p>Khula AI uses the selected farm’s crop records and forecast to keep its answers relevant.</p>
        </section>
      ) : (
        <section className="panel copilot-panel">
          <div className="assistant-heading">
            <span className="assistant-avatar" aria-hidden="true">AI</span>
            <div>
              <h3>Khula AI Copilot</h3>
              <p>{farm.name} · {cycles.length} crop records</p>
            </div>
            <span className={`status-chip ${assistantAvailable ? 'assistant-ready' : 'assistant-needs-key'}`}>
              {assistantAvailable ? 'OpenAI connected' : 'API key needed'}
            </span>
          </div>

          <div className="assistant-privacy-note">
            Replies use this farm’s records, recent chat, and available forecast. Your question and that context are sent to OpenAI to generate a reply. This assistant does not diagnose crop disease.
          </div>

          {!assistantAvailable && (
            <div className="assistant-key-notice" role="status">
              Add <code>OPENAI_API_KEY</code> to the project’s local <code>.env</code> file, then restart <code>npm run dev</code> to enable replies. Never put the key in frontend code or share it in chat.
            </div>
          )}

          <div className="assistant-messages" aria-live="polite">
            {loadingHistory ? (
              <p className="empty-note">Loading this farm’s conversation...</p>
            ) : messages.length === 0 && !pendingMessage ? (
              <div className="assistant-welcome">
                <strong>Let’s look at your farm together.</strong>
                <span>Try one of these questions:</span>
                <div className="assistant-suggestions">
                  {suggestions.map((suggestion) => (
                    <button
                      className="button-secondary"
                      key={suggestion}
                      disabled={!assistantAvailable || sending}
                      onClick={() => setDraft(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <article className={`assistant-message ${message.role}`} key={message.id}>
                  <div className="assistant-message-meta">
                    <strong>{message.role === 'assistant' ? 'Khula AI' : 'You'}</strong>
                    <time dateTime={message.created_at}>
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <p>{message.content}</p>
                </article>
              ))
            )}
            {pendingMessage && (
              <article className="assistant-message user">
                <div className="assistant-message-meta"><strong>You</strong><span>Sending</span></div>
                <p>{pendingMessage}</p>
              </article>
            )}
            {sending && <p className="assistant-thinking">Khula AI is checking your farm context...</p>}
            <div ref={bottomOfConversation} />
          </div>

          {error && <p className="assistant-error" role="alert">{error}</p>}

          <form className="assistant-composer" onSubmit={handleSubmit}>
            <label htmlFor="assistant-message">Your question</label>
            <textarea
              id="assistant-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about your crops, records, or the upcoming forecast..."
              maxLength={1600}
              rows={3}
              disabled={!assistantAvailable || sending}
              required
            />
            <div className="assistant-composer-footer">
              <span>{draft.length}/1600 · Chat is saved for this farm</span>
              <button
                className="button-primary compact-button"
                type="submit"
                disabled={!assistantAvailable || sending || !draft.trim()}
              >
                {sending ? 'Thinking...' : 'Send message'}
              </button>
            </div>
          </form>

          <p className="small-note assistant-disclaimer">
            Crop guidance is informational, not a diagnosis or substitute for a local agricultural extension officer. Image analysis is not enabled.
          </p>
        </section>
      )}
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
            <li>OpenAI crop copilot (requires API key setup)</li>
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

function ProfilePage({ user, emailVerificationRequired }) {
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
            <dd>
              {user.emailVerified
                ? 'Verified'
                : emailVerificationRequired
                  ? 'Not verified'
                  : 'Not checked in local development'}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export default App;
