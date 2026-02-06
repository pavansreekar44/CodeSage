function goToLogin() {
  window.location.href = "login.html";
}

function loginSuccess() {
  window.location.href = "dashboard.html";
}

function logout() {
  window.location.href = "index.html";
}

function toggleForm() {
  document.getElementById("signup").classList.toggle("hidden");
}
