
const STORAGE_KEY = "tsb_developer_portal_v1";

let data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  projects: [],
  tasks: [],
  journal: []
};

let currentType = "";

const $ = id => document.getElementById(id);

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showPage(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.toggle("active-page", section.id === page);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const titles = {
    dashboard: "Dashboard",
    projects: "Projects",
    tasks: "Tasks",
    journal: "Development Journal",
    team: "Team Workspace",
    settings: "Settings"
  };

  $("pageTitle").textContent = titles[page] || "Dashboard";
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.go));
});

function updateRole() {
  const isAdmin = $("roleSelect").value === "Admin";
  document.querySelectorAll(".admin-only").forEach(button => {
    button.style.display = isAdmin ? "" : "none";
  });
}

$("roleSelect").addEventListener("change", updateRole);

function openModal(type) {
  currentType = type;
  $("itemForm").reset();

  const fields = {
    project: [
      ["name", "Project Name", "text"],
      ["category", "Category", "select", ["Game", "Software", "Website", "Other"]],
      ["status", "Status", "select", ["Planning", "In Development", "Completed"]],
      ["description", "Description", "textarea"]
    ],
    task: [
      ["name", "Task Name", "text"],
      ["priority", "Priority", "select", ["Low", "Medium", "High"]],
      ["description", "Description", "textarea"]
    ],
    journal: [
      ["title", "Entry Title", "text"],
      ["description", "Development Notes", "textarea"]
    ]
  };

  const titles = {
    project: "Add New Project",
    task: "Create New Task",
    journal: "New Journal Entry"
  };

  $("modalTitle").textContent = titles[type];

  $("formFields").innerHTML = fields[type].map(([name, label, kind, options]) => {
    let control = "";

    if (kind === "select") {
      control = `<select name="${name}" required>
        ${options.map(option =>
          `<option value="${escapeHTML(option)}">${escapeHTML(option)}</option>`
        ).join("")}
      </select>`;
    } else if (kind === "textarea") {
      control = `<textarea name="${name}" required></textarea>`;
    } else {
      control = `<input name="${name}" type="text" required maxlength="100">`;
    }

    return `<div class="field"><label>${label}</label>${control}</div>`;
  }).join("");

  $("modal").classList.add("show");
}

function closeModal() {
  $("modal").classList.remove("show");
}

$("closeModal").addEventListener("click", closeModal);

$("modal").addEventListener("click", event => {
  if (event.target === $("modal")) closeModal();
});

$("addProjectBtn").addEventListener("click", () => openModal("project"));
$("addTaskBtn").addEventListener("click", () => openModal("task"));
$("addJournalBtn").addEventListener("click", () => openModal("journal"));

$("itemForm").addEventListener("submit", event => {
  event.preventDefault();

  const form = new FormData(event.target);
  const item = Object.fromEntries(form.entries());

  item.id = Date.now().toString();
  item.created = new Date().toLocaleDateString();

  if (currentType === "task") item.completed = false;

  data[
    currentType === "project" ? "projects" :
    currentType === "task" ? "tasks" : "journal"
  ].unshift(item);

  saveData();
  closeModal();
});

function removeItem(type, id) {
  if (!confirm("Are you sure you want to delete this item?")) return;
  data[type] = data[type].filter(item => item.id !== id);
  saveData();
}

function toggleTask(id) {
  const task = data.tasks.find(item => item.id === id);
  if (!task) return;
  task.completed = !task.completed;
  saveData();
}

function renderProjects() {
  const container = $("projectList");

  if (!data.projects.length) {
    container.innerHTML = '<div class="empty">No projects yet. Add your first project.</div>';
  } else {
    container.innerHTML = data.projects.map(project => `
      <div class="item-card">
        <div>
          <h3>${escapeHTML(project.name)}</h3>
          <p>${escapeHTML(project.category)} · ${escapeHTML(project.description)}</p>
          <p>Created: ${escapeHTML(project.created)}</p>
        </div>
        <div class="item-actions">
          <span class="tag">${escapeHTML(project.status)}</span>
          <button class="small-button" data-delete="projects" data-id="${project.id}">Delete</button>
        </div>
      </div>
    `).join("");
  }

  $("recentProjects").innerHTML = data.projects.length
    ? data.projects.slice(0, 3).map(project =>
        `<div class="item-card"><div><h3>${escapeHTML(project.name)}</h3><p>${escapeHTML(project.category)}</p></div><span class="tag">${escapeHTML(project.status)}</span></div>`
      ).join("")
    : '<div class="empty">No projects added yet.</div>';
}

function renderTasks() {
  const container = $("taskList");

  container.innerHTML = data.tasks.length
    ? data.tasks.map(task => `
      <div class="item-card">
        <div>
          <h3>${escapeHTML(task.name)}</h3>
          <p>${escapeHTML(task.description)}</p>
          <p>Priority: ${escapeHTML(task.priority)}</p>
        </div>
        <div class="item-actions">
          <button class="small-button" data-toggle="${task.id}">
            ${task.completed ? "Reopen" : "Complete"}
          </button>
          <span class="tag">${task.completed ? "COMPLETED" : "PENDING"}</span>
          <button class="small-button" data-delete="tasks" data-id="${task.id}">Delete</button>
        </div>
      </div>
    `).join("")
    : '<div class="empty">No tasks yet. Create your first task.</div>';
}

function renderJournal() {
  $("journalList").innerHTML = data.journal.length
    ? data.journal.map(entry => `
      <div class="item-card">
        <div>
          <h3>${escapeHTML(entry.title)}</h3>
          <p>${escapeHTML(entry.description)}</p>
          <p>${escapeHTML(entry.created)}</p>
        </div>
        <button class="small-button" data-delete="journal" data-id="${entry.id}">Delete</button>
      </div>
    `).join("")
    : '<div class="empty">No journal entries yet.</div>';
}

document.addEventListener("click", event => {
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    removeItem(deleteButton.dataset.delete, deleteButton.dataset.id);
  }

  const toggleButton = event.target.closest("[data-toggle]");
  if (toggleButton) {
    toggleTask(toggleButton.dataset.toggle);
  }
});

function renderStats() {
  $("projectCount").textContent = data.projects.length;
  $("taskCount").textContent = data.tasks.length;
  $("completedCount").textContent = data.tasks.filter(task => task.completed).length;
  $("journalCount").textContent = data.journal.length;
}

function renderAll() {
  renderProjects();
  renderTasks();
  renderJournal();
  renderStats();
}

$("exportBtn").addEventListener("click", () => {
  const file = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "TSB_Portal_Backup.json";
  link.click();
  URL.revokeObjectURL(url);
});

$("clearBtn").addEventListener("click", () => {
  if (!confirm("This will permanently clear all portal data saved in this browser. Continue?")) return;

  data = { projects: [], tasks: [], journal: [] };
  saveData();
});

renderAll();
updateRole();
