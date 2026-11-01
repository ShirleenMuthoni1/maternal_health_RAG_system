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

// Recent questions sidebar
// The list comes from the database: the mother's last 10 questions.
const list = document.getElementById('questionList');

// Questions are kept here so the list can be redrawn (after a delete or a language change)
let recentQuestions = [];
// The id of the question that is asking "Delete this conversation?" (null = none)
let confirmingId = null;

function makeButton(text, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

// Removes one conversation from the database, then from the list
async function deleteQuestion(id) {
  try {
    const response = await fetch('/api/questions/' + id, { method: 'DELETE' });
    if (response.ok || response.status === 404) {
      recentQuestions = recentQuestions.filter(function (q) { return q.id !== id; });
      confirmingId = null;
      drawQuestions();
      return;
    }
  } catch (e) {
    // handled below
  }
  alertDeleteFailed();
}

function alertDeleteFailed() {
  const note = document.createElement('li');
  note.className = 'empty-note';
  note.textContent = T('dash.deleteFailed');
  list.insertBefore(note, list.firstChild);
}

function drawQuestions() {
  list.innerHTML = '';

  if (recentQuestions.length === 0) {
    const note = document.createElement('li');
    note.className = 'empty-note';
    note.textContent = T('dash.noQuestions');
    list.appendChild(note);
    return;
  }

  recentQuestions.forEach(function (item) {
    const row = document.createElement('li');

    // She pressed the bin: ask "are you sure?" in place of this question
    if (confirmingId === item.id) {
      const box = document.createElement('div');
      box.className = 'confirm-box';

      const message = document.createElement('p');
      message.textContent = T('dash.confirmDelete');
      box.appendChild(message);

      const actions = document.createElement('div');
      actions.className = 'confirm-actions';
      actions.appendChild(makeButton(T('dash.cancel'), 'confirm-no', function () {
        confirmingId = null;
        drawQuestions();
      }));
      actions.appendChild(makeButton(T('dash.deleteYes'), 'confirm-yes', function () {
        deleteQuestion(item.id);
      }));
      box.appendChild(actions);

      row.appendChild(box);
      list.appendChild(row);
      return;
    }

    const line = document.createElement('div');
    line.className = 'question-row';

    const link = document.createElement('a');
    link.className = 'question-link';
    // Opens the saved conversation (it is not asked again)
    link.href = 'chat.html?id=' + item.id;

    const text = document.createElement('span');
    text.textContent = item.question;

    const arrow = document.createElement('span');
    arrow.className = 'material-symbols-outlined';
    arrow.textContent = 'chevron_right';

    link.appendChild(text);
    link.appendChild(arrow);

    // The bin button
    const bin = document.createElement('button');
    bin.type = 'button';
    bin.className = 'delete-btn';
    bin.setAttribute('aria-label', T('dash.delete'));
    bin.title = T('dash.delete');
    const binIcon = document.createElement('span');
    binIcon.className = 'material-symbols-outlined';
    binIcon.textContent = 'delete';
    bin.appendChild(binIcon);
    bin.addEventListener('click', function () {
      confirmingId = item.id;
      drawQuestions();
    });

    line.appendChild(link);
    line.appendChild(bin);
    row.appendChild(line);
    list.appendChild(row);
  });
}

async function loadQuestions() {
  try {
    const response = await fetch('/api/questions');
    if (response.ok) {
      recentQuestions = await response.json();
    }
  } catch (e) {
    // If the server cannot be reached, the list stays empty
  }
  drawQuestions();
}

loadQuestions();

// If the language is changed on this page, redraw everything this file writes
document.addEventListener('bloom:langchange', function () {
  drawProfile();
  drawQuestions();
});

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