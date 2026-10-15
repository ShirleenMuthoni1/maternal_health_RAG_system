// Profile setup logic goes here
// Back arrow in the top bar:
// - if she already saved a profile (she clicked Edit on the dashboard), go back to the dashboard
// - otherwise she is still signing up, so go back to the registration page
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', function () {
    let hasProfile = false;
    try {
      hasProfile = !!localStorage.getItem('bloomProfile');
    } catch (e) {
      hasProfile = false;
    }
    window.location.href = hasProfile ? 'dashboard.html' : 'register.html';
  });
}

const weeksSelect = document.getElementById('gestationalAge');
const locationSelect = document.getElementById('location');
const symptomsBox = document.getElementById('symptoms');
const historyBox = document.getElementById('medicalHistory');
const error = document.getElementById('formError');

// Fill the weeks dropdown with 1 to 42 weeks
for (let week = 1; week <= 42; week++) {
  const option = document.createElement('option');
  option.value = week;
  option.textContent = week + (week === 1 ? ' week' : ' weeks');
  weeksSelect.appendChild(option);
}

// If a profile was saved before (for example when she clicks Edit), fill it back in
try {
  const saved = JSON.parse(localStorage.getItem('bloomProfile'));
  if (saved) {
    weeksSelect.value = saved.gestationalAge || '';
    locationSelect.value = saved.location || '';
    symptomsBox.value = saved.symptoms || '';
    historyBox.value = saved.medicalHistory || '';
  }
} catch (e) {
  // If the browser blocks storage, the form just starts empty
}

// Profile form
document.getElementById('profileForm').addEventListener('submit', function (event) {
  event.preventDefault();

  if (!weeksSelect.value || !locationSelect.value) {
    error.textContent = 'Please choose your gestational age and your location.';
    return;
  }

  error.textContent = '';

  const profile = {
    gestationalAge: weeksSelect.value,
    location: locationSelect.value,
    symptoms: symptomsBox.value.trim(),
    medicalHistory: historyBox.value.trim()
  };

  // TEMPORARY: there is no backend yet, so this is kept in the browser only.
  // Later this will be sent to the context information API and saved in the database.
  try {
    localStorage.setItem('bloomProfile', JSON.stringify(profile));
  } catch (e) {
    // Ignore storage problems for now
  }

  window.location.href = 'dashboard.html';
});