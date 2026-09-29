const plans = {
  basic: { label: 'Basic plan', features: ['wallet', 'rewards'] },
  premium: { label: 'Premium plan', features: ['weather', 'assistant', 'learning', 'wallet', 'rewards'] },
  enterprise: { label: 'Enterprise plan', features: ['weather', 'assistant', 'learning', 'wallet', 'rewards', 'admin'] }
};

const roles = {
  farmer: { name: 'Lindokuhle', title: "Your farm's next good decision starts here.", profile: 'Farm manager' },
  supplier: { name: 'Lindokuhle', title: 'Keep your supply moving, season after season.', profile: 'Agricultural supplier' },
  buyer: { name: 'Lindokuhle', title: 'Find the right connections for your next harvest.', profile: 'Produce buyer' },
  admin: { name: 'Lindokuhle', title: 'Your network, connected in one place.', profile: 'Company administrator' }
};

let currentPlan = 'premium';
let walletBalance = 248.50;
let dataBalance = 4.8;
let selectedBundle = null;
let toastTimeout;

const toast = (message) => {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => element.classList.remove('show'), 2800);
};

function setPlan(plan) {
  if (!plans[plan]) return;
  currentPlan = plan;
  document.querySelector('#sidebar-plan').textContent = plans[plan].label;
  document.querySelectorAll('.plan-switch button').forEach((button) => {
    const active = button.dataset.plan === plan;
    button.classList.toggle('current', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-access]').forEach((label) => {
    const included = plans[plan].features.includes(label.dataset.access);
    label.textContent = included ? 'Included' : 'Upgrade to unlock';
    label.classList.toggle('locked', !included);
  });
  document.querySelectorAll('[data-feature]').forEach((icon) => {
    icon.hidden = plans[plan].features.includes(icon.dataset.feature);
  });
  document.querySelectorAll('.plan-card').forEach((card) => {
    card.classList.toggle('plan-featured', card.dataset.cardPlan === plan);
  });
}

function setRole(role) {
  const selected = roles[role] || roles.farmer;
  document.querySelector('#welcome-title').innerHTML = `Good morning, ${selected.name} <span class="wave">↗</span>`;
  document.querySelector('#welcome-subtitle').textContent = selected.title;
  document.querySelector('#profile-role').textContent = selected.profile;
}

function openPurchase(name, price) {
  selectedBundle = { name, price: Number(price) };
  document.querySelector('#dialog-title').textContent = `Get ${name}`;
  document.querySelector('#dialog-price').textContent = `GH₵ ${Number(price).toFixed(2)}`;
  document.querySelector('#dialog-balance').textContent = walletBalance.toFixed(2);
  document.querySelector('#purchase-dialog').showModal();
}

document.querySelectorAll('.filter-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach((item) => {
      const active = item === tab;
      item.classList.toggle('selected', active);
      item.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.bundle-card').forEach((card) => {
      card.hidden = tab.dataset.filter !== 'all' && card.dataset.category !== tab.dataset.filter;
    });
  });
});

document.querySelectorAll('[data-scroll]').forEach((button) => {
  button.addEventListener('click', () => document.querySelector(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }));
});

document.querySelectorAll('.plan-switch [data-plan], .plan-choose[data-plan]').forEach((button) => {
  button.addEventListener('click', () => {
    setPlan(button.dataset.plan);
    if (button.classList.contains('plan-choose')) {
      document.querySelector('#weather').scrollIntoView({ behavior: 'smooth' });
      toast(`${plans[button.dataset.plan].label} selected for preview`);
    }
  });
});

document.querySelector('#manage-plan').addEventListener('click', () => document.querySelector('#plans').scrollIntoView({ behavior: 'smooth' }));
document.querySelector('#role-select').addEventListener('change', (event) => setRole(event.target.value));
document.querySelectorAll('.buy-bundle').forEach((button) => button.addEventListener('click', () => openPurchase(button.dataset.name, button.dataset.price)));
document.querySelector('#cancel-purchase').addEventListener('click', () => document.querySelector('#purchase-dialog').close());
document.querySelector('#confirm-purchase').addEventListener('click', () => {
  if (!selectedBundle) return;
  if (walletBalance < selectedBundle.price) {
    document.querySelector('#purchase-dialog').close();
    toast('Your wallet balance is too low. Add money to continue.');
    return;
  }
  walletBalance -= selectedBundle.price;
  if (selectedBundle.name === 'Field Day') dataBalance += 5;
  if (selectedBundle.name === 'Market Runner') dataBalance += 12;
  document.querySelector('#wallet-balance').textContent = walletBalance.toFixed(2);
  document.querySelector('#data-balance').textContent = dataBalance.toFixed(1);
  document.querySelector('#purchase-dialog').close();
  toast(`${selectedBundle.name} added. GH₵ ${selectedBundle.price.toFixed(2)} charged to your demo wallet.`);
  selectedBundle = null;
});

document.querySelector('#topup-button').addEventListener('click', () => toast('Wallet top-up is a static preview. Connect your mobile money provider to enable payments.'));
document.querySelector('#wallet-history').addEventListener('click', () => toast('No recent transactions in this demo wallet.'));

document.querySelectorAll('.assistant-suggestions button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('#assistant-question').value = button.textContent;
    document.querySelector('#assistant-form').requestSubmit();
  });
});

document.querySelector('#assistant-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const question = document.querySelector('#assistant-question').value.trim();
  if (!question) return;
  const response = document.querySelector('#assistant-response');
  response.hidden = false;
  response.textContent = `Thanks for asking: “${question}” For tailored advice, check your crop and local conditions first. The FieldLink assistant will provide farm-specific guidance when the AI service is connected.`;
  document.querySelector('#assistant-question').value = '';
  response.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

setPlan(currentPlan);
