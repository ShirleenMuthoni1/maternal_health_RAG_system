// The admin report page. It only ever receives counts from the server.

const errorBox = document.getElementById('adminError');
const fromInput = document.getElementById('fromDate');
const toInput = document.getElementById('toDate');

// Dates are typed and shown as day/month/year
// The server wants year-month-day, so these two helpers convert between the two.

// "08/11/2026" becomes "2026-11-08". Empty text gives "". A wrong date gives null.
function toServerDate(text) {
  const value = text.trim();
  if (value === '') return '';

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  // Rejects dates that do not exist, such as 31/02/2026, it is an older date
  const check = new Date(year, month - 1, day);
  if (check.getFullYear() !== year || check.getMonth() !== month - 1 || check.getDate() !== day) {
    return null;
  }
  return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

// "2026-11-08" becomes "08/11/2026"
function showDate(serverDate) {
  const parts = String(serverDate).split('-');
  return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : serverDate;
}

// "nutrition_pregnancy" becomes "Nutrition pregnancy".
// Two answers are not subjects, so they get a clearer name.
function niceTopic(name) {
  if (name === 'no information') return 'No information in the knowledge base';
  if (name === 'danger signs') return 'Danger signs (red alert shown)';
  const text = String(name).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Draws one row: a label, a bar and the number
function makeRow(label, count, max, kind) {
  const row = document.createElement('div');
  row.className = 'bar-row';

  const name = document.createElement('span');
  name.className = 'bar-label';
  name.textContent = label;

  const track = document.createElement('div');
  track.className = 'bar-track';
  const fill = document.createElement('div');
  fill.className = 'bar-fill' + (kind ? ' ' + kind : '');
  fill.style.width = (max > 0 ? Math.round((count / max) * 100) : 0) + '%';
  track.appendChild(fill);

  const number = document.createElement('span');
  number.className = 'bar-count';
  number.textContent = count;

  row.appendChild(name);
  row.appendChild(track);
  row.appendChild(number);
  return row;
}

// Fills a box with rows, or a short message when there is nothing to show
function drawRows(boxId, rows) {
  const box = document.getElementById(boxId);
  box.textContent = '';

  if (rows.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-note';
    empty.textContent = 'No questions in this period.';
    box.appendChild(empty);
    return;
  }

  const max = Math.max.apply(null, rows.map(function (r) { return r.count; }));
  rows.forEach(function (r) {
    box.appendChild(makeRow(r.label, r.count, max, r.kind));
  });
}

function drawReport(data) {
  document.getElementById('statRegistered').textContent = data.registeredMothers;
  document.getElementById('statActive').textContent = data.activeMothers;
  document.getElementById('statQuestions').textContent = data.totalQuestions;
  document.getElementById('statDanger').textContent = data.dangerAlerts;

  drawRows('languageBars', [
    { label: 'English', count: data.languages.en || 0 },
    { label: 'Kiswahili', count: data.languages.sw || 0 }
  ]);

  drawRows('topicBars', data.topics.map(function (t) {
    let kind = '';
    if (t.topic === 'danger signs') kind = 'danger';
    if (t.topic === 'no information') kind = 'muted';
    return { label: niceTopic(t.topic), count: t.count, kind: kind };
  }));

  drawRows('dayBars', data.perDay.map(function (d) {
    return { label: showDate(d.date), count: d.count };
  }));
}

async function loadReport() {
  errorBox.textContent = '';

  const fromDate = toServerDate(fromInput.value);
  const toDate = toServerDate(toInput.value);
  if (fromDate === null || toDate === null) {
    errorBox.textContent = 'Please type dates like 08/11/2026 (day/month/year).';
    return;
  }

  const params = new URLSearchParams();
  if (fromDate) params.set('from', fromDate);
  if (toDate) params.set('to', toDate);
  const query = params.toString() ? '?' + params.toString() : '';

  try {
    const response = await fetch('/api/admin/summary' + query);
    const data = await response.json();
    if (!response.ok) {
      errorBox.textContent = data.error || 'The report could not be loaded.';
      return;
    }
    drawReport(data);
  } catch (e) {
    errorBox.textContent = 'The report could not be loaded. Please check your connection.';
  }
}

// Only the admin may be here
async function start() {
  try {
    const response = await fetch('/api/me');
    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    const me = await response.json();
    if (!me.isAdmin) {
      window.location.href = 'dashboard.html';
      return;
    }
  } catch (e) {
    errorBox.textContent = 'The server could not be reached.';
    return;
  }
  loadReport();
}

document.getElementById('filterForm').addEventListener('submit', function (event) {
  event.preventDefault();
  loadReport();
});

document.getElementById('clearBtn').addEventListener('click', function () {
  fromInput.value = '';
  toInput.value = '';
  loadReport();
});

document.getElementById('logoutBtn').addEventListener('click', async function () {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (e) {
    // Go to the login page anyway
  }
  window.location.href = 'login.html';
});

start();