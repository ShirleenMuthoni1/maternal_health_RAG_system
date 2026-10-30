// Words shown to the user come from translations.js. T("key") gives the text in the chosen language.
const T = window.t || function (key) { return key; };

// Works out which trimester a number of weeks falls in
function getTrimester(weeks) {
  if (weeks <= 13) return 1;
  if (weeks <= 27) return 2;
  return 3;
}

// The mother's saved profile (null until it has loaded)
let savedProfile = null;

// Writes the welcome line, status, weeks and location in the chosen language.
// It runs on load and again whenever the language is changed.
function drawProfile() {
  document.getElementById('welcome').textContent = T('dash.welcome');

  const locationText = document.getElementById('locationText');

  if (!savedProfile) {
    document.getElementById('statusText').textContent = T('dash.completeProfile');
    document.getElementById('weeksText').textContent = '-- ' + T('dash.weeks');
    locationText.textContent = T('dash.notSet');
    return;
  }

  const weeks = Number(savedProfile.gestationalAge);
  const trimester = getTrimester(weeks);

  document.getElementById('weeksText').textContent =
    weeks + ' ' + T(weeks === 1 ? 'dash.week' : 'dash.weeks');

  document.getElementById('statusText').textContent =
    T(weeks === 1 ? 'dash.statusOne' : 'dash.status')
      .replace('{w}', weeks)
      .replace('{n}', T('dash.ord' + trimester));

  // A full pregnancy is about 40 weeks
  const percent = Math.min((weeks / 40) * 100, 100);
  document.getElementById('progressFill').style.width = percent + '%';

  document.getElementById('t' + trimester).classList.add('active');

  if (savedProfile.location === 'Other') {
    locationText.textContent = T('profile.other');
  } else if (savedProfile.location) {
    // "Nairobi, Kenya" is shown as "Nairobi"
    locationText.textContent = savedProfile.location.split(',')[0];
  } else {
    locationText.textContent = T('dash.notSet');
  }
}

// Load the mother's profile from the backend
async function loadProfile() {
  try {
    const response = await fetch('/api/profile');

    if (response.status === 404) {
      // She has an account but no profile yet, so send her to set one up
      window.location.href = 'profile-setup.html';
      return;
    }
    if (response.ok) {
      savedProfile = await response.json();
    }
  } catch (e) {
    // If the server cannot be reached, the page keeps its default text
  }
  drawProfile();
}

drawProfile();
loadProfile();

// ----- Recent questions sidebar -----
// TEMPORARY: questions are still kept in the browser and will move to the database
// when the chat page is connected to the backend. The sample questions only let
// you see the design.
const USE_SAMPLES = true;
// Sample questions are looked up by key so they also change language
const SAMPLE_KEYS = ['dash.sample1', 'dash.sample2'];

let savedQuestions = [];
try {
  savedQuestions = JSON.parse(localStorage.getItem('bloomRecentQuestions')) || [];
} catch (e) {
  savedQuestions = [];
}

const list = document.getElementById('questionList');

function drawQuestions() {
  list.innerHTML = '';

  // Questions the mother really asked stay as she typed them; samples are translated
  let questions = savedQuestions;
  if (questions.length === 0 && USE_SAMPLES) {
    questions = SAMPLE_KEYS.map(function (key) { return T(key); });
  }

  if (questions.length === 0) {
    const note = document.createElement('li');
    note.className = 'empty-note';
    note.textContent = T('dash.noQuestions');
    list.appendChild(note);
    return;
  }

  questions.forEach(function (question) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'question-link';
    link.href = 'chat.html?q=' + encodeURIComponent(question);

    const text = document.createElement('span');
    text.textContent = question;

    const arrow = document.createElement('span');
    arrow.className = 'material-symbols-outlined';
    arrow.textContent = 'chevron_right';

    link.appendChild(text);
    link.appendChild(arrow);
    item.appendChild(link);
    list.appendChild(item);
  });
}

drawQuestions();

// If the language is changed on this page, redraw everything this file writes
document.addEventListener('bloom:langchange', function () {
  drawProfile();
  drawQuestions();
});

// ----- Open and close the sidebar -----
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('sidebarBackdrop');

function openSidebar() {
  sidebar.classList.add('open');
  backdrop.classList.add('show');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  backdrop.classList.remove('show');
}

document.getElementById('menuBtn').addEventListener('click', openSidebar);
document.getElementById('closeSidebar').addEventListener('click', closeSidebar);
document.getElementById('collapseBtn').addEventListener('click', closeSidebar);
backdrop.addEventListener('click', closeSidebar);

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') closeSidebar();
});