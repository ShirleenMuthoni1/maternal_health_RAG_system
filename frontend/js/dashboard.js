// Dashboard logic goes here
// ---------- Load the saved profile (temporary: kept in the browser) ----------
let profile = null;
try {
  profile = JSON.parse(localStorage.getItem('bloomProfile'));
} catch (e) {
  profile = null;
}

// Works out which trimester a number of weeks falls in
function getTrimester(weeks) {
  if (weeks <= 13) return 1;
  if (weeks <= 27) return 2;
  return 3;
}

function ordinal(n) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : '3rd';
}

if (profile && profile.gestationalAge) {
  const weeks = Number(profile.gestationalAge);
  const trimester = getTrimester(weeks);

  document.getElementById('weeksText').textContent = weeks + (weeks === 1 ? ' Week' : ' Weeks');
  document.getElementById('statusText').textContent =
    weeks + ' Weeks Pregnant \u2022 ' + ordinal(trimester) + ' Trimester';

  // A full pregnancy is about 40 weeks
  const percent = Math.min((weeks / 40) * 100, 100);
  document.getElementById('progressFill').style.width = percent + '%';

  document.getElementById('t' + trimester).classList.add('active');
}

if (profile && profile.location) {
  // "Nairobi, Kenya" is shown as "Nairobi"
  document.getElementById('locationText').textContent = profile.location.split(',')[0];
}

// The designs show a name, but registration only collects an email, so a name
// is shown only if one has been saved. This will come from the backend later.
let userName = null;
try {
  userName = localStorage.getItem('bloomUserName');
} catch (e) {
  userName = null;
}
if (userName) {
  document.getElementById('welcome').textContent = 'Welcome back, ' + userName;
}

// ---------- Recent questions sidebar ----------
// TEMPORARY sample questions so you can see the design. Once the chat page and
// backend save real questions, set USE_SAMPLES to false and delete the samples.
const USE_SAMPLES = true;
const SAMPLE_QUESTIONS = [
  'Should I continue taking folic acid supplements during this trimester?',
  'How should I prepare for labor and delivery plan in Nairobi?'
];

let questions = [];
try {
  questions = JSON.parse(localStorage.getItem('bloomRecentQuestions')) || [];
} catch (e) {
  questions = [];
}
if (questions.length === 0 && USE_SAMPLES) {
  questions = SAMPLE_QUESTIONS;
}

const list = document.getElementById('questionList');

if (questions.length === 0) {
  const note = document.createElement('li');
  note.className = 'empty-note';
  note.textContent = 'No questions yet. Your recent questions will appear here.';
  list.appendChild(note);
} else {
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

// ---------- Open and close the sidebar ----------
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