// Words shown to the user come from translations.js. T("key") gives the text in the chosen language.
const T = window.t || function (key) { return key; };

// Back arrow in the top bar goes to the dashboard
document.getElementById('backBtn').addEventListener('click', function () {
  window.location.href = 'dashboard.html';
});

const messages = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const questionInput = document.getElementById('questionInput');
const sendBtn = document.getElementById('sendBtn');

// ----- Context information card (loaded from the backend) -----
// The mother's saved profile (null if she has none or the server could not be reached)
let savedProfile = null;

// Writes the three chips in the chosen language. Runs on load and when the language changes.
function drawContext() {
  const weeksEl = document.getElementById('ctxWeeks');
  const trimesterEl = document.getElementById('ctxTrimester');
  const locationEl = document.getElementById('ctxLocation');

  if (!savedProfile) {
    weeksEl.textContent = T('dash.notSet');
    trimesterEl.textContent = T('dash.notSet');
    locationEl.textContent = T('dash.notSet');
    return;
  }

  const weeks = Number(savedProfile.gestationalAge);
  const trimester = weeks <= 13 ? 1 : weeks <= 27 ? 2 : 3;

  weeksEl.textContent = weeks + ' ' + T(weeks === 1 ? 'profile.week' : 'profile.weeks');
  trimesterEl.textContent = T('chat.trimFmt').replace('{n}', T('dash.ord' + trimester));

  if (savedProfile.location === 'Other') {
    locationEl.textContent = T('profile.other');
  } else if (savedProfile.location) {
    // "Nairobi, Kenya" is shown as "Nairobi"
    locationEl.textContent = savedProfile.location.split(',')[0];
  } else {
    locationEl.textContent = T('dash.notSet');
  }
}

async function loadContext() {
  try {
    const response = await fetch('/api/profile');

    if (response.ok) {
      savedProfile = await response.json();
      drawContext();
      return;
    }
  } catch (e) {
    // If the server cannot be reached, the card keeps its "Not set" text
  }

  drawContext();
  document.getElementById('contextEmpty').hidden = false;
}

drawContext();
loadContext();

// If the language is changed on this page, redraw the chips
document.addEventListener('bloom:langchange', drawContext);

// ----- Helpers that draw the message bubbles -----
// Bubbles that hold fixed words (thinking, sources label, danger alert) carry data-i18n,
// so they change language by themselves. Questions and answers are shown as they are.
function timeNow() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function makeIcon(name) {
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = name;
  return icon;
}

// Creates an element whose words come from translations.js
function makeText(tag, key) {
  const element = document.createElement(tag);
  element.setAttribute('data-i18n', key);
  element.textContent = T(key);
  return element;
}

function addUserMessage(text) {
  const bubble = document.createElement('div');
  bubble.className = 'msg-user';

  const body = document.createElement('div');
  body.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const time = document.createElement('span');
  time.textContent = timeNow();
  meta.appendChild(time);
  meta.appendChild(makeIcon('done_all'));

  bubble.appendChild(body);
  bubble.appendChild(meta);
  messages.appendChild(bubble);
  scrollToBottom();
}

function addThinking() {
  const bubble = makeText('div', 'chat.thinking');
  bubble.className = 'msg-thinking';
  messages.appendChild(bubble);
  scrollToBottom();
  return bubble;
}

function addBotMessage(answer, sources) {
  const bubble = document.createElement('div');
  bubble.className = 'msg-bot';

  const body = document.createElement('div');
  body.textContent = answer;
  bubble.appendChild(body);

  if (sources && sources.length > 0) {
    const row = document.createElement('div');
    row.className = 'sources';
    row.appendChild(makeIcon('verified'));

    const text = document.createElement('div');
    const label = makeText('strong', 'chat.sources');
    text.appendChild(label);
    text.appendChild(document.createTextNode(' ' + sources.join(' • ')));
    row.appendChild(text);

    bubble.appendChild(row);
  }

  messages.appendChild(bubble);
  scrollToBottom();
}

function addDangerMessage() {
  const bubble = document.createElement('div');
  bubble.className = 'msg-danger';
  bubble.setAttribute('role', 'alert');

  const title = document.createElement('div');
  title.className = 'danger-title';
  title.appendChild(makeIcon('warning'));
  title.appendChild(makeText('span', 'chat.dangerTitle'));

  const message = makeText('p', 'chat.dangerText');

  bubble.appendChild(title);
  bubble.appendChild(message);
  messages.appendChild(bubble);
  scrollToBottom();
}

// Keep the question for the dashboard's Recent Questions list
// Temporary: kept in the browser until questions are saved in the database
function saveRecentQuestion(question) {
  try {
    let saved = JSON.parse(localStorage.getItem('bloomRecentQuestions')) || [];
    saved = saved.filter(function (q) { return q !== question; });
    saved.unshift(question);
    localStorage.setItem('bloomRecentQuestions', JSON.stringify(saved.slice(0, 10)));
  } catch (e) {
    // If the browser blocks storage, the question just isn't remembered
  }
}

// TEMPORARY: stands in for the backend until it exists
// Later, replace this whole function with a call to the chat API, which will
// check for danger signs and run the RAG pipeline (retrieval and the LLM).
// The real danger sign check belongs in the backend and must be tested properly.
// This keyword list only lets you see both screens (English and a few Kiswahili phrases).
const DEMO_DANGER_WORDS = [
  'heavy bleeding', 'severe headache', 'convulsion', 'seizure',
  'blurred vision', 'severe abdominal pain', 'severe lower abdominal pain',
  'baby is not moving', 'no fetal movement', 'reduced fetal movement',
  'kutokwa na damu nyingi', 'kichwa kuuma sana', 'degedege', 'mtoto hasogei'
];

function askBackend(question) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      const lower = question.toLowerCase();
      const isDanger = DEMO_DANGER_WORDS.some(function (word) {
        return lower.includes(word);
      });

      if (isDanger) {
        resolve({ danger: true });
      } else {
        resolve({
          danger: false,
          answer: T('chat.placeholder'),
          sources: ['Sample source one', 'Sample source two']
        });
      }
    }, 700);
  });
}

// ----- Sending a question -----
let waiting = false;

async function ask(question) {
  if (waiting) return;
  waiting = true;
  sendBtn.disabled = true;

  addUserMessage(question);
  saveRecentQuestion(question);
  const thinking = addThinking();

  const reply = await askBackend(question);
  thinking.remove();

  if (reply.danger) {
    addDangerMessage();
  } else {
    addBotMessage(reply.answer, reply.sources);
  }

  waiting = false;
  sendBtn.disabled = false;
  questionInput.focus();
}

chatForm.addEventListener('submit', function (event) {
  event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  questionInput.value = '';
  ask(question);
});

// If she opened the page from a Recent Questions link, ask that question straight away
const fromDashboard = new URLSearchParams(window.location.search).get('q');
if (fromDashboard) {
  ask(fromDashboard);
}