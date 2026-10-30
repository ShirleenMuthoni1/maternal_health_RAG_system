// Words shown to the user come from translations.js. T("key") gives the text in the chosen language.
const T = window.t || function (key) { return key; };

// The email she registered with is kept for this tab only
let pendingEmail = '';
try {
  pendingEmail = sessionStorage.getItem('bloomPendingEmail') || '';
} catch (e) {
  pendingEmail = '';
}

// If we do not know which email to verify, send her back to register
if (!pendingEmail) {
  window.location.href = 'register.html';
}

document.getElementById('emailShown').textContent = pendingEmail;

// Back arrow in the top bar goes to the registration page
document.getElementById('backBtn').addEventListener('click', function () {
  window.location.href = 'register.html';
});

const form = document.getElementById('verifyForm');
const codeInput = document.getElementById('code');
const error = document.getElementById('formError');
const success = document.getElementById('formSuccess');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');

// Only allow digits while typing
codeInput.addEventListener('input', function () {
  codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
});

async function post(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }
  return { ok: response.ok, data: data };
}

// Verify
form.addEventListener('submit', async function (event) {
  event.preventDefault();
  error.textContent = '';
  success.textContent = '';

  const code = codeInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    error.textContent = T('verify.enterCode');
    return;
  }

  verifyBtn.disabled = true;

  try {
    const result = await post('/api/verify-email', { email: pendingEmail, code: code });
    if (result.ok) {
      try {
        sessionStorage.removeItem('bloomPendingEmail');
      } catch (e) {
        // Ignore storage problems
      }
      // The dashboard sends a mother with no profile on to the profile setup page
      window.location.href = 'dashboard.html';
      return;
    }
    error.textContent = result.data.error || T('auth.generic');
  } catch (e) {
    error.textContent = T('auth.network');
  }

  verifyBtn.disabled = false;
});

// Resend, with a 60 second wait
let waitTimer = null;
let secondsLeft = 0;

// Shows "Resend code (45s)" while waiting, and "Resend code" when ready
function showResendLabel() {
  resendBtn.textContent = secondsLeft > 0
    ? T('verify.resend') + ' (' + secondsLeft + T('verify.sec') + ')'
    : T('verify.resend');
}

function startWait(seconds) {
  secondsLeft = seconds;
  resendBtn.disabled = true;
  showResendLabel();

  clearInterval(waitTimer);
  waitTimer = setInterval(function () {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      clearInterval(waitTimer);
      resendBtn.disabled = false;
    }
    showResendLabel();
  }, 1000);
}

// If the language is changed on this page, redraw the button text
document.addEventListener('bloom:langchange', showResendLabel);

// A code was just sent, so start with the wait already running
startWait(60);

resendBtn.addEventListener('click', async function () {
  error.textContent = '';
  success.textContent = '';
  startWait(60);

  try {
    await post('/api/resend-code', { email: pendingEmail });
    success.textContent = T('verify.resent');
  } catch (e) {
    error.textContent = T('auth.network');
  }
});