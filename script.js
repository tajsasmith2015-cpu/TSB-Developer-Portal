"use strict";

const STORAGE_KEY = "tsb_developer_portal_v1";
const API_BASE = "http://127.0.0.1:8765";

let data = loadData();

const $ = id => document.getElementById(id);

function loadData() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && Array.isArray(saved.projects) &&
            Array.isArray(saved.tasks) && Array.isArray(saved.journal)) {
            return saved;
        }
    } catch (error) {
        console.error("Could not load saved data:", error);
    }

    return { projects: [], tasks: [], journal: [] };
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    renderAll();
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#039;"
    })[char]);
}

function showPage(page) {
    document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));

    $(page)?.classList.add("active");
    document.querySelector(`[data-page="${page}"]`)?.classList.add("active");

    const titles = {
        dashboard: "Dashboard",
        projects: "Projects",
        tasks: "Tasks",
        journal: "Journal",
        activity: "Activity Recorder",
        team: "Team",
        settings: "Settings"
    };

    $("pageTitle").textContent = titles[page] || "Dashboard";

    if (page === "activity") refreshActivity();
}

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.goto));
});

function openModal(type, item = null) {
    $("itemForm").reset();
    $("itemType").value = type;
    $("itemId").value = item?.id || "";
    $("itemName").value = item?.name || "";
    $("itemDescription").value = item?.description || "";

    $("projectFields").classList.toggle("visible", type === "project");
    $("taskFields").classList.toggle("visible", type === "task");

    if (type === "project") {
        $("projectCategory").value = item?.category || "Game Development";
        $("projectStatus").value = item?.status || "Planning";
        $("projectProgress").value = item?.progress ?? 0;
    }

    if (type === "task") {
        $("taskPriority").value = item?.priority || "Medium";
        $("taskDue").value = item?.due || "";
    }

    const names = { project: "Project", task: "Task", journal: "Journal Entry" };
    $("modalTitle").textContent = `${item ? "Edit" : "Create"} ${names[type]}`;
    $("modal").classList.add("open");
}

function closeModal() {
    $("modal").classList.remove("open");
}

$("closeModal").addEventListener("click", closeModal);

$("modal").addEventListener("click", event => {
    if (event.target === $("modal")) closeModal();
});

$("addProject").addEventListener("click", () => openModal("project"));
$("addTask").addEventListener("click", () => openModal("task"));
$("addJournal").addEventListener("click", () => openModal("journal"));

$("quickAdd").addEventListener("click", () => {
    const page = document.querySelector(".page.active")?.id || "project";
    openModal(page === "tasks" ? "task" : page === "journal" ? "journal" : "project");
});

$("itemForm").addEventListener("submit", event => {
    event.preventDefault();

    const type = $("itemType").value;
    const id = $("itemId").value;
    const collection = type === "project" ? data.projects :
        type === "task" ? data.tasks : data.journal;

    const old = collection.find(item => item.id === id);

    const item = {
        ...(old || {}),
        id: id || uid(),
        name: $("itemName").value.trim(),
        description: $("itemDescription").value.trim(),
        updatedAt: new Date().toISOString()
    };

    if (type === "project") {
        item.category = $("projectCategory").value;
        item.status = $("projectStatus").value;
        item.progress = Math.min(100, Math.max(0, Number($("projectProgress").value) || 0));
    }

    if (type === "task") {
        item.priority = $("taskPriority").value;
        item.due = $("taskDue").value;
        item.completed = old?.completed || false;
    }

    if (!item.name) return;

    if (old) {
        Object.assign(old, item);
    } else {
        item.createdAt = new Date().toISOString();
        collection.unshift(item);
    }

    saveData();
    closeModal();
});

function deleteItem(type, id) {
    if (!confirm("Are you sure you want to delete this item?")) return;

    const collection = type === "project" ? data.projects :
        type === "task" ? data.tasks : data.journal;

    data[type === "project" ? "projects" : type === "task" ? "tasks" : "journal"] =
        collection.filter(item => item.id !== id);

    saveData();
}

function editItem(type, id) {
    const collection = type === "project" ? data.projects :
        type === "task" ? data.tasks : data.journal;

    const item = collection.find(entry => entry.id === id);
    if (item) openModal(type, item);
}

function toggleTask(id) {
    const task = data.tasks.find(item => item.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveData();
}

function emptyMessage(message) {
    return `<div class="empty-state">${escapeHTML(message)}</div>`;
}

function renderDashboard() {
    const completed = data.tasks.filter(task => task.completed).length;
    const percentage = data.tasks.length ?
        Math.round(completed / data.tasks.length * 100) : 0;

    $("totalProjects").textContent = data.projects.length;
    $("totalTasks").textContent = data.tasks.length;
    $("completedTasks").textContent = completed;
    $("totalJournal").textContent = data.journal.length;

    $("taskProgress").textContent = percentage + "%";
    $("taskProgressBar").style.width = percentage + "%";
    $("taskProgressText").textContent =
        `${completed} of ${data.tasks.length} tasks completed.`;

    $("recentProjects").innerHTML = data.projects.slice(0, 5).map(project => `
        <div class="item-row">
            <div><h4>${escapeHTML(project.name)}</h4>
            <p>${escapeHTML(project.category || "Project")} · ${escapeHTML(project.status || "Planning")}</p></div>
            <span class="tag">${Number(project.progress) || 0}%</span>
        </div>
    `).join("") || emptyMessage("No projects created yet.");

    $("recentTasks").innerHTML = data.tasks.slice(0, 5).map(task => `
        <div class="item-row">
            <div><h4>${escapeHTML(task.name)}</h4>
            <p>${task.completed ? "Completed" : escapeHTML(task.priority || "Medium")}</p></div>
            <span class="tag">${task.completed ? "DONE" : "OPEN"}</span>
        </div>
    `).join("") || emptyMessage("No tasks created yet.");
}

function renderProjects() {
    const query = $("projectSearch").value.toLowerCase();

    const projects = data.projects.filter(item =>
        `${item.name} ${item.category} ${item.status}`.toLowerCase().includes(query)
    );

    $("projectList").innerHTML = projects.map(project => `
        <article class="item-card">
            <div class="item-card-top">
                <span class="tag">${escapeHTML(project.category)}</span>
                <span class="tag">${escapeHTML(project.status)}</span>
            </div>
            <h3>${escapeHTML(project.name)}</h3>
            <p>${escapeHTML(project.description || "No description added.")}</p>
            <div class="card-progress">
                <small class="muted">Progress: ${Number(project.progress) || 0}%</small>
                <div class="progress-track"><div style="width:${Math.min(100,Math.max(0,Number(project.progress)||0))}%"></div></div>
            </div>
            <div class="row-actions">
                <button class="small-btn" onclick="editItem('project','${project.id}')">Edit</button>
                <button class="small-btn" onclick="deleteItem('project','${project.id}')">Delete</button>
            </div>
        </article>
    `).join("") || emptyMessage("No projects found.");
}

function renderTasks() {
    const query = $("taskSearch").value.toLowerCase();

    const tasks = data.tasks.filter(item =>
        `${item.name} ${item.description} ${item.priority}`.toLowerCase().includes(query)
    );

    $("taskList").innerHTML = tasks.map(task => `
        <div class="item-row">
            <div>
                <h4>${escapeHTML(task.name)}</h4>
                <p>${escapeHTML(task.priority || "Medium")} Priority
                ${task.due ? " · Due " + escapeHTML(task.due) : ""}
                · ${task.completed ? "Completed" : "Pending"}</p>
                <p>${escapeHTML(task.description || "")}</p>
            </div>
            <div class="row-actions">
                <button class="small-btn" onclick="toggleTask('${task.id}')">${task.completed ? "Reopen" : "Complete"}</button>
                <button class="small-btn" onclick="editItem('task','${task.id}')">Edit</button>
                <button class="small-btn" onclick="deleteItem('task','${task.id}')">Delete</button>
            </div>
        </div>
    `).join("") || emptyMessage("No tasks found.");
}

function renderJournal() {
    const query = $("journalSearch").value.toLowerCase();

    const entries = data.journal.filter(item =>
        `${item.name} ${item.description}`.toLowerCase().includes(query)
    );

    $("journalList").innerHTML = entries.map(entry => `
        <article class="item-card">
            <span class="tag">DEVELOPMENT NOTE</span>
            <h3>${escapeHTML(entry.name)}</h3>
            <p>${escapeHTML(entry.description || "No notes added.")}</p>
            <small class="muted">${new Date(entry.createdAt || Date.now()).toLocaleString()}</small>
            <div class="row-actions" style="margin-top:15px">
                <button class="small-btn" onclick="editItem('journal','${entry.id}')">Edit</button>
                <button class="small-btn" onclick="deleteItem('journal','${entry.id}')">Delete</button>
            </div>
        </article>
    `).join("") || emptyMessage("No journal entries found.");
}

function renderAll() {
    renderDashboard();
    renderProjects();
    renderTasks();
    renderJournal();
}

["projectSearch", "taskSearch", "journalSearch"].forEach(id => {
    $(id).addEventListener("input", renderAll);
});

$("roleSelect").value = localStorage.getItem("tsb_role") || "Team Leader";
$("roleSelect").addEventListener("change", event => {
    localStorage.setItem("tsb_role", event.target.value);
});

$("exportData").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "TSB-Developer-Portal-Backup.json";
    link.click();
    URL.revokeObjectURL(url);
});

$("importData").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const imported = JSON.parse(await file.text());

        if (!Array.isArray(imported.projects) ||
            !Array.isArray(imported.tasks) ||
            !Array.isArray(imported.journal)) {
            throw new Error("Invalid backup format.");
        }

        if (!confirm("Replace current workspace data with this backup?")) return;

        data = imported;
        saveData();
        alert("Backup imported successfully.");
    } catch (error) {
        alert("Could not import this backup: " + error.message);
    } finally {
        event.target.value = "";
    }
});

$("clearData").addEventListener("click", () => {
    if (!confirm("Permanently clear all projects, tasks and journal entries?")) return;

    data = { projects: [], tasks: [], journal: [] };
    saveData();
});

function formatDuration(seconds) {
    seconds = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

async function refreshActivity() {
    try {
        const response = await fetch(`${API_BASE}/api/activity/today`, {
            cache: "no-store"
        });

        if (!response.ok) throw new Error("Recorder unavailable");

        const result = await response.json();

        $("recorderStatus").textContent = "Recorder Connected";
        $("recorderMessage").textContent = "Local desktop activity data is available.";
        $("recorderIndicator").classList.add("online");

        $("trackedTime").textContent = formatDuration(result.total_seconds);
        $("appCount").textContent = result.applications.length;
        $("idleTime").textContent = result.idle ? "Idle" : "Active";
        $("lastUpdate").textContent = new Date().toLocaleTimeString();

        $("activityList").innerHTML = result.applications.map(app => `
            <div class="item-row">
                <div><h4>${escapeHTML(app.application)}</h4>
                <p>Foreground application</p></div>
                <span class="tag">${formatDuration(app.seconds)}</span>
            </div>
        `).join("") || emptyMessage("No application activity recorded yet.");
    } catch (error) {
        $("recorderStatus").textContent = "Recorder Offline";
        $("recorderMessage").textContent =
            "Start the local recorder using start_recorder.bat.";
        $("recorderIndicator").classList.remove("online");
        $("activityList").innerHTML =
            emptyMessage("No connection to the local recorder. Make sure recorder.py is running.");
    }
}

$("refreshActivity").addEventListener("click", refreshActivity);

renderAll();
