// Log in and registration logic goes here
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

// Checks that an email looks like name@something.com
function emailLooksValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Log in form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', function (event) {
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

    // TEMPORARY: there is no backend yet, so this just moves to the dashboard.
    // Later this will send the email and password to the log in API instead.
    window.location.href = 'dashboard.html';
  });
}

// Registration form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', function (event) {
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

    // TEMPORARY: there is no backend yet, so no account is saved.
    // Later this will send the email and password to the registration API.
    window.location.href = 'profile-setup.html';
  });
}