const API_URL = "https://codesage-9jqk.onrender.com";

function go(page) {
  window.location.href = page;
}

function toggleAuth() {
  const nameField = document.getElementById("name");
  const formTitle = document.getElementById("formTitle");
  const submitBtn = document.getElementById("submitBtn");
  const switchText = document.getElementById("switchText");

  nameField.classList.toggle("hidden");

  if (formTitle.innerText === "Login") {
    formTitle.innerText = "Create Account";
    submitBtn.innerText = "Sign Up";
    switchText.innerText = "Already have an account?";
  } else {
    formTitle.innerText = "Login";
    submitBtn.innerText = "Login";
    switchText.innerText = "Don't have an account?";
  }
}

function toggleHistory() {
  const historyEl = document.getElementById("history");
  historyEl.classList.toggle("hidden");

  // Load history only when it becomes visible
  if (!historyEl.classList.contains("hidden")) {
    loadHistory();
  }
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
    document.getElementById("review").innerHTML = `
      <h4>AI Review</h4>
      <p>No code provided. Please paste code or upload files.</p>
    `;
    return;
  }

  document.getElementById("review").innerHTML = `
    <h4>AI Review</h4>
    <p>Analyzing your code...</p>
  `;

  try {
    const res = await fetch(`${API_URL}/review`, {
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
  } catch (error) {
    document.getElementById("review").innerHTML = `
      <h4>AI Review</h4>
      <p>Error connecting to server. Please make sure the backend is running.</p>
    `;
  }
}

/* ================= Rewrite Code ==================== */
async function rewriteCode() {
  if (!window.lastReviewId) {
    alert("Please run a review first");
    return;
  }

  openWindow("optimize");
  document.getElementById("optimize").innerHTML = `
    <h4>Optimized Code</h4>
    <p>Rewriting your code...</p>
  `;

  try {
    const res = await fetch(
      `${API_URL}/rewrite/${window.lastReviewId}`,
      { method: "POST" }
    );

    const data = await res.json();
    const originalCode = document.getElementById("codeInput").value;

    let html = `<div class="diff-header">
      <h4>Code Refactoring</h4>
      <div class="diff-legend">
        <span class="legend-item"><span class="legend-color removed"></span> Removed</span>
        <span class="legend-item"><span class="legend-color added"></span> Added</span>
      </div>
    </div>`;

    data.rewrites.forEach((r, index) => {
      const diffHtml = generateVisualDiff(originalCode, r.rewritten);

      html += `
        <div class="diff-file-section">
          <div class="diff-file-header">
            <span class="diff-filename">${escapeHtml(r.filename)}</span>
            <button class="btn small apply-btn" onclick="applyRewrite(${index})">Apply Changes</button>
          </div>
          
          <div class="diff-container">
            <div class="diff-pane original">
              <div class="diff-pane-header">Original Code</div>
              <div class="diff-content">${diffHtml.original}</div>
            </div>
            <div class="diff-pane refactored">
              <div class="diff-pane-header">Refactored Code</div>
              <div class="diff-content">${diffHtml.refactored}</div>
            </div>
          </div>
          
          <details class="raw-diff">
            <summary>View Raw Diff</summary>
            <pre>${escapeHtml(r.diff)}</pre>
          </details>
        </div>
      `;

      // Store rewritten code for apply function
      window.rewrittenCode = window.rewrittenCode || [];
      window.rewrittenCode[index] = r.rewritten;
    });

    document.getElementById("optimize").innerHTML = html;
  } catch (error) {
    document.getElementById("optimize").innerHTML = `
      <h4>Optimized Code</h4>
      <p>Error connecting to server. Please make sure the backend is running.</p>
    `;
  }
}

function generateVisualDiff(original, refactored) {
  const originalLines = original.split('\n');
  const refactoredLines = refactored.split('\n');

  // Simple line-by-line diff
  const maxLines = Math.max(originalLines.length, refactoredLines.length);

  let originalHtml = '';
  let refactoredHtml = '';

  // Create a map of changes using LCS-like approach
  const changes = computeLineDiff(originalLines, refactoredLines);

  changes.original.forEach((line, i) => {
    const lineNum = i + 1;
    const status = line.status;
    const lineClass = status === 'removed' ? 'diff-line removed' :
      status === 'modified' ? 'diff-line modified' : 'diff-line';
    originalHtml += `<div class="${lineClass}">
      <span class="diff-line-num">${lineNum}</span>
      <span class="diff-line-content">${escapeHtml(line.text)}</span>
    </div>`;
  });

  changes.refactored.forEach((line, i) => {
    const lineNum = i + 1;
    const status = line.status;
    const lineClass = status === 'added' ? 'diff-line added' :
      status === 'modified' ? 'diff-line modified' : 'diff-line';
    refactoredHtml += `<div class="${lineClass}">
      <span class="diff-line-num">${lineNum}</span>
      <span class="diff-line-content">${escapeHtml(line.text)}</span>
    </div>`;
  });

  return { original: originalHtml, refactored: refactoredHtml };
}

function computeLineDiff(originalLines, refactoredLines) {
  const originalSet = new Set(originalLines.map(l => l.trim()));
  const refactoredSet = new Set(refactoredLines.map(l => l.trim()));

  const original = originalLines.map(text => {
    const trimmed = text.trim();
    if (!trimmed) return { text, status: 'unchanged' };
    if (!refactoredSet.has(trimmed)) return { text, status: 'removed' };
    return { text, status: 'unchanged' };
  });

  const refactored = refactoredLines.map(text => {
    const trimmed = text.trim();
    if (!trimmed) return { text, status: 'unchanged' };
    if (!originalSet.has(trimmed)) return { text, status: 'added' };
    return { text, status: 'unchanged' };
  });

  return { original, refactored };
}

function applyRewrite(index) {
  if (window.rewrittenCode && window.rewrittenCode[index]) {
    document.getElementById("codeInput").value = window.rewrittenCode[index];

    // Update line numbers if the function exists
    if (typeof updateLineNumbers === 'function') {
      updateLineNumbers();
    }

    // Show confirmation
    const btn = document.querySelector(`.apply-btn`);
    if (btn) {
      btn.textContent = 'Applied!';
      btn.classList.add('applied');
      setTimeout(() => {
        btn.textContent = 'Apply Changes';
        btn.classList.remove('applied');
      }, 2000);
    }
  }
}

function renderReview(analysis) {
  let html = `<h4>Summary</h4><p>${escapeHtml(analysis.summary)}</p>`;

  const sections = [
    ["serious_bugs", "Serious Bugs", "priority-serious"],
    ["high_priority", "High Priority", "priority-high"],
    ["medium_priority", "Medium Priority", "priority-medium"],
    ["low_priority", "Low Priority", "priority-low"]
  ];

  sections.forEach(([key, title, className]) => {
    if (analysis[key]?.length) {
      html += `<h4 class="${className}">${title}</h4><ul>`;
      analysis[key].forEach(i => {
        html += `<li><strong>${escapeHtml(i.file)}</strong> (line ${i.line}): ${escapeHtml(i.issue)}</li>`;
      });
      html += "</ul>";
    }
  });

  document.getElementById("review").innerHTML = html;
}

async function loadHistory() {
  try {
    const res = await fetch(`${API_URL}/history`);
    const history = await res.json();

    const ul = document.getElementById("history");
    ul.innerHTML = "";

    if (history.length === 0) {
      ul.innerHTML = "<li>No history yet</li>";
      return;
    }

    history.forEach(h => {
      const li = document.createElement("li");
      li.innerText = `#${h.id} - ${h.summary}`;
      li.onclick = () => openReview(h.id);
      ul.appendChild(li);
    });
  } catch (error) {
    const ul = document.getElementById("history");
    ul.innerHTML = "<li>Unable to load history</li>";
  }
}

function openReview(id) {
  localStorage.setItem("review_id", id);
  go("editor.html");
}

// Utility function to escape HTML and prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
