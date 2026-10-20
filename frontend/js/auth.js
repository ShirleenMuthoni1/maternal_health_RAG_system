// Back arrow in the top bar: log in and register both go back to the welcome page
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', function () {
    window.location.href = 'index.html';
  });
}

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

// Checks that an email looks correct like email address: name@something.com
function emailLooksValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Sends the form details to the backend and returns what it answered
async function sendToServer(url, body) {
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

// Log in form 
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  const submitBtn = loginForm.querySelector('button[type="submit"]');

  loginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const error = document.getElementById('formError');

    if (!email || !password) {
      error.textContent = 'Please enter your email and password.';
      return;
    }
    if (!emailLooksValid(email)) {
      error.textContent = 'Please enter a valid email address.';
      return;
    }

    error.textContent = '';
    submitBtn.disabled = true;

    try {
      const result = await sendToServer('/api/login', { email: email, password: password });
      if (result.ok) {
        window.location.href = 'dashboard.html';
        return;
      }
      error.textContent = result.data.error || 'Something went wrong. Please try again.';
    } catch (e) {
      error.textContent = NETWORK_ERROR;
    }

    submitBtn.disabled = false;
  });
}

// Registration form 
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  const submitBtn = registerForm.querySelector('button[type="submit"]');

  registerForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const error = document.getElementById('formError');

    if (!email || !password || !confirmPassword) {
      error.textContent = 'Please fill in all the fields.';
      return;
    }
    if (!emailLooksValid(email)) {
      error.textContent = 'Please enter a valid email address.';
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

    error.textContent = '';
    submitBtn.disabled = true;

    try {
      const result = await sendToServer('/api/register', { email: email, password: password });
      if (result.ok) {
        // A new account starts with an empty profile
        try {
          localStorage.removeItem('bloomProfile');
        } catch (e) {
          // Ignore storage problems
        }
        window.location.href = 'profile-setup.html';
        return;
      }
      error.textContent = result.data.error || 'Something went wrong. Please try again.';
    } catch (e) {
      error.textContent = NETWORK_ERROR;
    }

    submitBtn.disabled = false;
  });
}