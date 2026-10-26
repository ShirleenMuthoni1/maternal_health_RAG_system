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

const NETWORK_ERROR = 'Could not reach the server. Please check your connection and try again.';

// Change the password
form.addEventListener('submit', async function (event) {
  event.preventDefault();
  error.textContent = '';
  success.textContent = '';

  const code = codeInput.value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!/^\d{6}$/.test(code)) {
    error.textContent = 'Please enter the 6-digit code from your email.';
    return;
  }
  if (!password || !confirmPassword) {
    error.textContent = 'Please fill in both password fields.';
    return;
  }
  if (password.length < 8) {
    error.textContent = 'Your password must be at least 8 characters.';
    return;
  }
  if (password !== confirmPassword) {
    error.textContent = 'The two passwords do not match.';
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
      success.textContent = (result.data.message || 'Your password has been changed.') +
        ' Taking you to the log in page...';
      setTimeout(function () {
        window.location.href = 'login.html';
      }, 2000);
      return;
    }

    error.textContent = result.data.error || 'Something went wrong. Please try again.';
  } catch (e) {
    error.textContent = NETWORK_ERROR;
  }

  resetBtn.disabled = false;
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

// A code was just requested, so start with the wait already running
startWait(60);

resendBtn.addEventListener('click', async function () {
  error.textContent = '';
  success.textContent = '';
  startWait(60);

  try {
    await post('/api/forgot-password', { email: resetEmail });
    success.textContent = 'If an account exists, a new code is on its way. It can take a minute.';
  } catch (e) {
    error.textContent = NETWORK_ERROR;
  }
});