/* function go(page) {
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
 */

const API_URL = "http://127.0.0.1:8000";

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

/* ================= BACKEND INTEGRATION ================= */

async function reviewCode() {
  openWindow("review");

  const mode = document.getElementById("mode")?.value || "bug";
  const files = document.getElementById("fileInput").files;
  const textCode = document.getElementById("codeInput").value;

  let payloadFiles = [];

  if (files.length > 0) {
    for (const file of files) {
      const content = await file.text();
      payloadFiles.push({
        filename: file.name,
        content: content
      });
    }
  } else if (textCode.trim()) {
    payloadFiles.push({
      filename: "main.c",
      content: textCode
    });
  } else {
    document.getElementById("review").innerHTML = "No code provided";
    return;
  }

  document.getElementById("review").innerHTML = "Analyzing...";

  const res = await fetch("http://127.0.0.1:8000/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "C",
      mode: mode,
      focus_areas: ["bugs", "security", "performance", "readability"],
      files: payloadFiles
    })
  });

  const data = await res.json();
  window.lastReviewId = data.review_id;
  renderReview(data.analysis);
}

/* ================= Rewrite Code ==================== */
async function rewriteCode() {
  if (!window.lastReviewId) {
    alert("Run review first");
    return;
  }

  openWindow("optimize");
  document.getElementById("optimize").innerHTML = "Rewriting...";

  const res = await fetch(
    `http://127.0.0.1:8000/rewrite/${window.lastReviewId}`,
    { method: "POST" }
  );

  const data = await res.json();

  let html = "";
  data.rewrites.forEach(r => {
    html += `<h4>${r.filename}</h4>`;
    html += `<pre>${r.rewritten}</pre>`;
    html += `<details><summary>Diff</summary><pre>${r.diff}</pre></details>`;
  });

  document.getElementById("optimize").innerHTML = html;
}


function renderReview(analysis) {
  let html = `<h4>Summary</h4><p>${analysis.summary}</p>`;

  const sections = [
    ["serious_bugs", "❌ Serious Bugs"],
    ["high_priority", "⚠️ High Priority"],
    ["medium_priority", "🟡 Medium Priority"],
    ["low_priority", "🟢 Low Priority"]
  ];

  sections.forEach(([key, title]) => {
    if (analysis[key]?.length) {
      html += `<h4>${title}</h4><ul>`;
      analysis[key].forEach(i => {
        html += `<li><b>${i.file}</b> (line ${i.line}): ${i.issue}</li>`;
      });
      html += "</ul>";
    }
  });

  document.getElementById("review").innerHTML = html;
}

async function toggleHistory() {
  const historyEl = document.getElementById("history");
  historyEl.classList.toggle("hidden");

  // Load history only when it becomes visible
  if (!historyEl.classList.contains("hidden")) {
    await loadHistory();
  }
}


async function loadHistory() {
  const res = await fetch("http://127.0.0.1:8000/history");
  const history = await res.json();

  const ul = document.getElementById("history");
  ul.innerHTML = "";

  history.forEach(h => {
    const li = document.createElement("li");
    li.innerText = `#${h.id} - ${h.summary}`;
    li.onclick = () => openReview(h.id);
    ul.appendChild(li);
  });
}

async function openReview(id) {
  localStorage.setItem("review_id", id);
  go("editor.html");
}
