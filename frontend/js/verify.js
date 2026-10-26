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

const NETWORK_ERROR = 'Could not reach the server. Please check your connection and try again.';

// Verify
form.addEventListener('submit', async function (event) {
  event.preventDefault();
  error.textContent = '';
  success.textContent = '';

  const code = codeInput.value.trim();
  if (!/^\d{6}$/.test(code)) {
    error.textContent = 'Please enter the 6-digit code from your email.';
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
    error.textContent = result.data.error || 'Something went wrong. Please try again.';
  } catch (e) {
    error.textContent = NETWORK_ERROR;
  }

  verifyBtn.disabled = false;
});

// Resend, with a 60 second wait 
let waitTimer = null;

function startWait(seconds) {
  let left = seconds;
  resendBtn.disabled = true;
  resendBtn.textContent = 'Resend code (' + left + 's)';

  clearInterval(waitTimer);
  waitTimer = setInterval(function () {
    left -= 1;
    if (left <= 0) {
      clearInterval(waitTimer);
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend code';
    } else {
      resendBtn.textContent = 'Resend code (' + left + 's)';
    }
  }, 1000);
}

// A code was just sent, so start with the wait already running
startWait(60);

resendBtn.addEventListener('click', async function () {
  error.textContent = '';
  success.textContent = '';
  startWait(60);

  try {
    await post('/api/resend-code', { email: pendingEmail });
    success.textContent = 'A new code is on its way. It can take a minute.';
  } catch (e) {
    error.textContent = NETWORK_ERROR;
  }
});