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
} 
 
function setRole(role) { 
  const selected = roles[role] || roles.farmer; 
  document.querySelector('#welcome-title').innerHTML = `Welcome, ${selected.name} <span class="wave">↗</span>`; 
  document.querySelector('#welcome-subtitle').textContent = selected.title; 
  document.querySelector('#profile-role').textContent = selected.profile; 
} 
 
// co pilot
 
document.querySelector('#assistant-form').addEventListener('submit', (event) => { 
  event.preventDefault(); 
 
  const question = document 
    .querySelector('#assistant-question') 

      .value 
    .trim() 
    .toLowerCase(); 
 
  if (!question) return; 
 
  const response = document.querySelector('#assistant-response'); 
 
  let answer = ''; 
 
  if (question.includes('maize')) { 
    answer = ' Planting Advisor: Maize is typically planted between October and December in South Africa. Monitor rainfall forecasts before planting.'; 
  } 
  else if (question.includes('weather') || question.includes('rain')) { 
    answer = '🌦 Climate Risk Advisor: Rainfall is expected this week. Consider delaying irrigation and monitoring soil moisture levels.'; 
  } 
  else if (question.includes('buyer') || question.includes('market')) { 
    answer = 'Market Insight: Demand for maize and vegetables remains strong. Potential buyers include food processors, wholesalers and retailers.'; 
  } 
  else if (question.includes('disease') || question.includes('pest')) { 
    answer = ' Crop Health Record: Monitor crops for leaf discoloration, pest damage and signs of fungal infection. Early detection improves yield outcomes.'; 
  } 
  else if (question.includes('finance') || question.includes('loan')) { 
    answer = ' Finance Assistant: Explore agricultural grants, production loans and equipment financing opportunities for farm expansion.'; 
  } 
  else { 
    answer = ' Farm Copilot can assist with planting advice, climate risks, crop health, buyers, logistics, financing and learning resources.'; 
  } 
 
  response.hidden = false; 
  response.innerHTML = answer; 
  document.querySelector('#assistant-question').value = ''; 
 
  response.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'nearest' 
  }); 
}); 
 
setPlan(currentPlan); 
