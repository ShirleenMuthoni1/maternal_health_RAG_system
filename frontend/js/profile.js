const weeksSelect = document.getElementById('gestationalAge');
const locationSelect = document.getElementById('location');
const symptomsBox = document.getElementById('symptoms');
const historyBox = document.getElementById('medicalHistory');
const error = document.getElementById('formError');
const profileForm = document.getElementById('profileForm');
const submitBtn = profileForm.querySelector('button[type="submit"]');

// true when this mother already has a saved profile (so saving means updating it)
let hasProfile = false;

// Back arrow in the top bar:
// - if she already has a profile (she clicked Edit on the dashboard), go back to the dashboard
// - otherwise she is still signing up, so go back to the welcome page
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', function () {
    window.location.href = hasProfile ? 'dashboard.html' : 'index.html';
  });
}

// Fill the weeks dropdown with 1 to 42 weeks
for (let week = 1; week <= 42; week++) {
  const option = document.createElement('option');
  option.value = week;
  option.textContent = week + (week === 1 ? ' week' : ' weeks');
  weeksSelect.appendChild(option);
}

// Load the saved profile (if there is one) and fill the form
async function loadProfile() {
  try {
    const response = await fetch('/api/profile');
    if (response.ok) {
      const saved = await response.json();
      hasProfile = true;
      weeksSelect.value = saved.gestationalAge || '';
      locationSelect.value = saved.location || '';
      symptomsBox.value = saved.symptoms || '';
      historyBox.value = saved.medicalHistory || '';
    }
    // A 404 just means a new mother with no profile yet, so the form stays empty
  } catch (e) {
    error.textContent = 'Could not load your saved details. Please check your connection.';
  }
}

loadProfile();

// Sends the profile to the backend with the chosen method (POST creates, PUT updates)
async function saveProfile(method, profile) {
  const response = await fetch('/api/profile', {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  });

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }
  return { ok: response.ok, status: response.status, data: data };
}

profileForm.addEventListener('submit', async function (event) {
  event.preventDefault();

  if (!weeksSelect.value || !locationSelect.value) {
    error.textContent = 'Please choose your gestational age and your location.';
    return;
  }

  error.textContent = '';
  submitBtn.disabled = true;

  const profile = {
    gestationalAge: weeksSelect.value,
    location: locationSelect.value,
    symptoms: symptomsBox.value.trim(),
    medicalHistory: historyBox.value.trim()
  };

  try {
    let result = await saveProfile(hasProfile ? 'PUT' : 'POST', profile);

    // If the server says a profile already exists, update it instead
    if (result.status === 409) {
      result = await saveProfile('PUT', profile);
    }

    if (result.ok) {
      window.location.href = 'dashboard.html';
      return;
    }
    error.textContent = result.data.error || 'Something went wrong. Please try again.';
  } catch (e) {
    error.textContent = 'Could not reach the server. Please check your connection and try again.';
  }

  submitBtn.disabled = false;
});