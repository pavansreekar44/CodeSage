function go(page) {
  window.location.href = page;
}

function toggleAuth() {
  document.getElementById("name").classList.toggle("hidden");
  document.getElementById("formTitle").innerText =
    document.getElementById("formTitle").innerText === "Login"
      ? "Create Account"
      : "Login";
}

function toggleHistory() {
  document.getElementById("history").classList.toggle("hidden");
}

function openWindow(id) {
  document.querySelectorAll(".window").forEach(w => w.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}
