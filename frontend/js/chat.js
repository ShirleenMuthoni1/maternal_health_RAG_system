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

// Context information card (loaded from the backend)
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

// Helpers that draw the message bubbles 
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

function addUserMessage(text, when) {
  const bubble = document.createElement('div');
  bubble.className = 'msg-user';

  const body = document.createElement('div');
  body.textContent = text;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const time = document.createElement('span');
  time.textContent = when
    ? new Date(when).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : timeNow();
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

// text: the alert written by the RAG pipeline (in her language). If there is none,
// the fixed alert from translations.js is used.
function addDangerMessage(text) {
  const bubble = document.createElement('div');
  bubble.className = 'msg-danger';
  bubble.setAttribute('role', 'alert');

  const title = document.createElement('div');
  title.className = 'danger-title';
  title.appendChild(makeIcon('warning'));
  title.appendChild(makeText('span', 'chat.dangerTitle'));

  let message;
  if (text) {
    message = document.createElement('p');
    message.textContent = text;
  } else {
    message = makeText('p', 'chat.dangerText');
  }

  bubble.appendChild(title);
  bubble.appendChild(message);
  messages.appendChild(bubble);
  scrollToBottom();
}

// Sends the question to the backend and returns its reply.
// The backend checks for danger signs, finds the answer and saves the question.
async function askBackend(question) {
  const language = window.bloomI18n ? window.bloomI18n.getLang() : 'en';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question, language: language })
    });

    // The RAG pipeline (Colab) is off or cannot be reached
    if (response.status === 503) {
      return { error: true, message: T('chat.unavailable') };
    }

    // Her login has expired, so send her back to log in
    if (response.status === 401) {
      window.location.href = 'login.html';
      return { error: true, message: '' };
    }

    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }

    if (!response.ok) {
      return { error: true, message: data.error || T('profile.errWrong') };
    }
    return data;
  } catch (e) {
    return { error: true, message: T('profile.errServer') };
  }
}

// Sending a question 
let waiting = false;

async function ask(question) {
  if (waiting) return;
  waiting = true;
  sendBtn.disabled = true;

  addUserMessage(question);
  const thinking = addThinking();

  const reply = await askBackend(question);
  thinking.remove();

  if (reply.error) {
    addBotMessage(reply.message, []);
  } else if (reply.danger) {
    addDangerMessage(reply.answer);
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

// If she opened the page from the Recent Questions list (chat.html?id=5),
// show that saved conversation. It is not asked again.
async function showSavedConversation(id) {
  try {
    const response = await fetch('/api/questions/' + id);

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    if (!response.ok) {
      addBotMessage(T('chat.notFound'), []);
      return;
    }

    const saved = await response.json();
    addUserMessage(saved.question, saved.createdAt);
    if (saved.danger) {
      addDangerMessage(saved.answer);
    } else {
      addBotMessage(saved.answer, saved.sources);
    }
  } catch (e) {
    addBotMessage(T('profile.errServer'), []);
  }
}

const savedId = new URLSearchParams(window.location.search).get('id');
if (savedId) {
  showSavedConversation(savedId);
}