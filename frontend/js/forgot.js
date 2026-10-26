// Back arrow in the top bar goes to the log in page
document.getElementById('backBtn').addEventListener('click', function () {
  window.location.href = 'login.html';
});

const form = document.getElementById('forgotForm');
const emailInput = document.getElementById('email');
const error = document.getElementById('formError');
const sendBtn = document.getElementById('sendBtn');

function emailLooksValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  error.textContent = '';

  const email = emailInput.value.trim();
  if (!email) {
    error.textContent = 'Please enter your email address.';
    return;
  }
  if (!emailLooksValid(email)) {
    error.textContent = 'Please enter a valid email address.';
    return;
  }

  sendBtn.disabled = true;

  try {
    const response = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });

    if (response.ok) {
      // The next page is the same whether or not the email is registered
      try {
        sessionStorage.setItem('bloomResetEmail', email);
      } catch (e) {
        // Ignore storage problems
      }
      window.location.href = 'reset-password.html';
      return;
    }

    let data = {};
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }
    error.textContent = data.error || 'Something went wrong. Please try again.';
  } catch (e) {
    error.textContent = 'Could not reach the server. Please check your connection and try again.';
  }

  sendBtn.disabled = false;
});