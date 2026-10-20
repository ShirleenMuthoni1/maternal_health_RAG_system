// Include this file in the <head> of every page that needs a logged in user.
// It hides the page until the server confirms there is a session.
document.documentElement.style.visibility = 'hidden';

// Removes details kept in the browser so the next person on this computer does not see them
function clearBrowserData() {
  try {
    localStorage.removeItem('bloomProfile');
    localStorage.removeItem('bloomRecentQuestions');
    localStorage.removeItem('bloomUserName');
  } catch (e) {
    // Ignore storage problems
  }
}

async function checkLogin() {
  try {
    const response = await fetch('/api/me');
    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }
  } catch (e) {
    // If the server cannot be reached, show the page so the problem is visible
  }
  document.documentElement.style.visibility = 'visible';
}

checkLogin();

// Log out button (only on pages that have one)
document.addEventListener('DOMContentLoaded', function () {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async function () {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
      // Carry on even if the server cannot be reached
    }
    clearBrowserData();
    window.location.href = 'index.html';
  });
});