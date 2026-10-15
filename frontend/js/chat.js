// Chat logic goes here
// Back arrow in the top bar goes to the dashboard
document.getElementById('backBtn').addEventListener('click', function () {
  window.location.href = 'dashboard.html';
});

const messages = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const questionInput = document.getElementById('questionInput');
const sendBtn = document.getElementById('sendBtn');

// ---------- Context information card (from the saved profile) ----------
let profile = null;
try {
  profile = JSON.parse(localStorage.getItem('bloomProfile'));
} catch (e) {
  profile = null;
}

function ordinal(n) {
  return n === 1 ? '1st' : n === 2 ? '2nd' : '3rd';
}

if (profile && profile.gestationalAge) {
  const weeks = Number(profile.gestationalAge);
  const trimester = weeks <= 13 ? 1 : weeks <= 27 ? 2 : 3;

  document.getElementById('ctxWeeks').textContent = weeks + (weeks === 1 ? ' week' : ' weeks');
  document.getElementById('ctxTrimester').textContent = ordinal(trimester) + ' Trimester';
} else {
  document.getElementById('contextEmpty').hidden = false;
}

if (profile && profile.location) {
  // "Nairobi, Kenya" is shown as "Nairobi"
  document.getElementById('ctxLocation').textContent = profile.location.split(',')[0];
}

// ---------- Helpers that draw the message bubbles ----------
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
  const bubble = document.createElement('div');
  bubble.className = 'msg-thinking';
  bubble.textContent = 'Looking through trusted maternal health sources...';
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
    const label = document.createElement('strong');
    label.textContent = 'SOURCES:';
    text.appendChild(label);
    text.appendChild(document.createTextNode(' ' + sources.join(' \u2022 ')));
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
  const titleText = document.createElement('span');
  titleText.textContent = 'Danger Sign Detected';
  title.appendChild(titleText);

  const message = document.createElement('p');
  message.textContent =
    'These symptoms indicate an emergency. Please seek immediate medical care at the nearest hospital or emergency health facility right now.';

  bubble.appendChild(title);
  bubble.appendChild(message);
  messages.appendChild(bubble);
  scrollToBottom();
}

// ---------- Keep the question for the dashboard's Recent Questions list ----------
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

// ---------- TEMPORARY: stands in for the backend until it exists ----------
// Later, replace this whole function with a call to the chat API, which will
// check for danger signs and run the RAG pipeline (retrieval and the LLM).
// The real danger sign check belongs in the backend and must be tested properly.
// This keyword list only lets you see both screens.
const DEMO_DANGER_WORDS = [
  'heavy bleeding', 'severe headache', 'convulsion', 'seizure',
  'blurred vision', 'severe abdominal pain', 'severe lower abdominal pain',
  'baby is not moving', 'no fetal movement', 'reduced fetal movement'
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
          answer:
            'This is a placeholder answer while the backend is being built. In the finished system, ' +
            'the response will be generated from the trusted maternal health sources in the knowledge base, ' +
            'using your gestational age and location.',
          sources: ['Sample source one', 'Sample source two']
        });
      }
    }, 700);
  });
}

// ---------- Sending a question ----------
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