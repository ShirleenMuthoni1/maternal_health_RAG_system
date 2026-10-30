// Words shown to the user come from translations.js. T("key") gives the text in the chosen language.
const T = window.t || function (key) { return key; };

// The email she asked for a code for is kept for this tab only
let resetEmail = '';
try {
  resetEmail = sessionStorage.getItem('bloomResetEmail') || '';
} catch (e) {
  resetEmail = '';
}

// If we do not know which email this is for, start again
if (!resetEmail) {
  window.location.href = 'forgot-password.html';
}

document.getElementById('emailShown').textContent = resetEmail;

// Back arrow in the top bar goes to the forgot password page
document.getElementById('backBtn').addEventListener('click', function () {
  window.location.href = 'forgot-password.html';
});

// Show or hide the password when the eye icon is clicked
document.querySelectorAll('.toggle-password').forEach(function (button) {
  button.addEventListener('click', function () {
    const input = document.getElementById(button.dataset.target);
    const icon = button.querySelector('.material-symbols-outlined');
    const isShowing = input.type === 'text';
    input.type = isShowing ? 'password' : 'text';
    icon.textContent = isShowing ? 'visibility' : 'visibility_off';
  });
});

const form = document.getElementById('resetForm');
const codeInput = document.getElementById('code');
const error = document.getElementById('formError');
const success = document.getElementById('formSuccess');
const resetBtn = document.getElementById('resetBtn');
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

// Change the password
form.addEventListener('submit', async function (event) {
  event.preventDefault();
  error.textContent = '';
  success.textContent = '';

  const code = codeInput.value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!/^\d{6}$/.test(code)) {
    error.textContent = T('verify.enterCode');
    return;
  }
  if (!password || !confirmPassword) {
    error.textContent = T('reset.fillBoth');
    return;
  }
  if (password.length < 8) {
    error.textContent = T('auth.pwShort');
    return;
  }
  if (password !== confirmPassword) {
    error.textContent = T('auth.pwMismatch');
    return;
  }

  resetBtn.disabled = true;

  try {
    const result = await post('/api/reset-password', {
      email: resetEmail,
      code: code,
      password: password
    });

    if (result.ok) {
      try {
        sessionStorage.removeItem('bloomResetEmail');
      } catch (e) {
        // Ignore storage problems
      }
      success.textContent = T('reset.changed') + ' ' + T('reset.redirecting');
      setTimeout(function () {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }

    error.textContent = result.data.error || T('auth.generic');
  } catch (e) {
    error.textContent = T('auth.network');
  }

  resetBtn.disabled = false;
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

// A code was just requested, so start with the wait already running
startWait(60);

resendBtn.addEventListener('click', async function () {
  error.textContent = '';
  success.textContent = '';
  startWait(60);

  try {
    await post('/api/forgot-password', { email: resetEmail });
    success.textContent = T('reset.resent');
  } catch (e) {
    error.textContent = T('auth.network');
  }
});