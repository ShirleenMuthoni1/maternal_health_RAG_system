// Load the mother's profile from the backend 
// Works out which trimester a number of weeks falls in
function getTrimester(weeks) {
  if (weeks <= 13) return 1;
  if (weeks <= 27) return 2;
  return 3;
}

function ordinal(n) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : '3rd';
}

function showProfile(profile) {
  const weeks = Number(profile.gestationalAge);
  const trimester = getTrimester(weeks);

  document.getElementById('weeksText').textContent = weeks + (weeks === 1 ? ' Week' : ' Weeks');
  document.getElementById('statusText').textContent =
    weeks + ' Weeks Pregnant \u2022 ' + ordinal(trimester) + ' Trimester';

  // A full pregnancy is about 40 weeks
  const percent = Math.min((weeks / 40) * 100, 100);
  document.getElementById('progressFill').style.width = percent + '%';

  document.getElementById('t' + trimester).classList.add('active');

  if (profile.location) {
    // "Nairobi, Kenya" is shown as "Nairobi"
    document.getElementById('locationText').textContent = profile.location.split(',')[0];
  }
}

async function loadProfile() {
  try {
    const response = await fetch('/api/profile');

    if (response.status === 404) {
      // She has an account but no profile yet, so send her to set one up
      window.location.href = 'profile-setup.html';
      return;
    }
    if (response.ok) {
      showProfile(await response.json());
    }
  } catch (e) {
    // If the server cannot be reached, the page keeps its default text
  }
}

loadProfile();

// Recent questions sidebar 
// TEMPORARY: questions are still kept in the browser and will move to the database
// when the chat page is connected to the backend. The sample questions only let
// you see the design.
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

// Open and close the sidebar 
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