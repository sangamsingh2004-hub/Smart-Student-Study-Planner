const STORAGE_KEY = 'studyflow_tasks_v1';

let tasks = loadTasks();
let currentFilter = 'all';

const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const taskForm = document.getElementById('taskForm');
const addPanel = document.getElementById('addTaskPanel');

const taskTitle = document.getElementById('taskTitle');
const taskSubject = document.getElementById('taskSubject');
const taskDue = document.getElementById('taskDue');
const taskPriority = document.getElementById('taskPriority');

// Load saved tasks from browser
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

// Save tasks
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Date helpers
function dateOnly(dateString) {
  if (!dateString) return null;

  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDate(dateString) {
  const date = dateOnly(dateString);

  if (!date) return 'No deadline';

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

function getDueClass(dateString, done) {
  if (!dateString || done) return '';

  return dateOnly(dateString) < todayDate()
    ? 'overdue'
    : '';
}

// Create a task object
function createTask(title, subject, due, priority) {
  return {
    id: Date.now() + Math.random(),
    title,
    subject,
    due,
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  };
}

// Display tasks
function renderTasks() {
  taskList.innerHTML = '';

  const filtered = tasks.filter(task =>
    currentFilter === 'all' ||
    (currentFilter === 'pending' && !task.completed) ||
    (currentFilter === 'completed' && task.completed)
  );

  emptyState.classList.toggle('show', filtered.length === 0);

  taskList.style.display =
    filtered.length === 0 ? 'none' : 'grid';

  // Sort: pending first, then deadline
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    const aDue = a.due || '9999-99-99';
    const bDue = b.due || '9999-99-99';

    return aDue.localeCompare(bDue);
  });

  filtered.forEach(task => {
    const row = document.createElement('article');
    row.className = 'task-item' +
      (task.completed ? ' done' : '');

    // Checkbox
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task-check';
    check.checked = task.completed;
    check.setAttribute('aria-label', 'Mark task completed');

    check.addEventListener('change', () => {
      toggleTask(task.id);
    });

    // Task information
    const info = document.createElement('div');
    info.className = 'task-info';

    const title = document.createElement('div');
    title.className = 'task-name';
    title.textContent = task.title;

    const meta = document.createElement('div');
    meta.className = 'task-meta';

    const subject = document.createElement('span');
    subject.className = 'subject-chip';
    subject.textContent = task.subject;

    const priority = document.createElement('span');
    priority.className = 'priority ' + task.priority;
    priority.textContent = task.priority + ' Priority';

    const due = document.createElement('span');
    due.className = 'due-label ' +
      getDueClass(task.due, task.completed);
    due.textContent = 'Due: ' + formatDate(task.due);

    meta.append(subject, priority, due);
    info.append(title, meta);

    // Delete button
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = '×';
    del.title = 'Delete task';
    del.setAttribute('aria-label', 'Delete task');

    del.addEventListener('click', () => {
      deleteTask(task.id);
    });

    row.append(check, info, del);
    taskList.append(row);
  });

  updateStats();
  updateSuggestions();
}

// Dashboard statistics
function updateStats() {
  const total = tasks.length;

  const completed = tasks.filter(
    t => t.completed
  ).length;

  const pending = total - completed;

  const percent = total
    ? Math.round((completed / total) * 100)
    : 0;

  document.getElementById('totalCount').textContent = total;
  document.getElementById('completedCount').textContent = completed;
  document.getElementById('pendingCount').textContent = pending;

  document.getElementById('progressPercent').textContent =
    percent + '%';

  document.getElementById('progressFill').style.width =
    percent + '%';
}

// Smart suggestions based on task data
function updateSuggestions() {
  const box = document.getElementById('suggestions');
  box.innerHTML = '';

  const pending = tasks.filter(t => !t.completed);

  const overdue = pending.filter(t =>
    t.due && dateOnly(t.due) < todayDate()
  );

  const urgent = pending.filter(t =>
    t.priority === 'High'
  );

  const soonLimit = new Date(
    todayDate().getTime() + 2 * 86400000
  );

  const dueSoon = pending.filter(t =>
    t.due &&
    dateOnly(t.due) >= todayDate() &&
    dateOnly(t.due) <= soonLimit
  );

  const tips = [];

  if (!tasks.length) {
    tips.push([
      'Start with a small goal',
      'Add one study task to get your planner going.'
    ]);
  }
  else if (!pending.length) {
    tips.push([
      'Amazing work!',
      'All tasks are complete. Add a new goal to keep momentum.'
    ]);
  }
  else {
    if (overdue.length) {
      tips.push([
        'Prioritize overdue work',
        `You have ${overdue.length} overdue task(s). Consider starting with one now.`
      ]);
    }

    if (urgent.length) {
      tips.push([
        'Focus on high priority',
        `${urgent.length} pending task(s) marked High priority. Give these extra attention.`
      ]);
    }

    if (dueSoon.length) {
      tips.push([
        'Plan for the next 2 days',
        `${dueSoon.length} task(s) due soon. Break them into short sessions.`
      ]);
    }

    if (!tips.length) {
      tips.push([
        'Try a 25-minute session',
        'Choose one task and study for 25 minutes, then take a 5-minute break.'
      ]);
    }

    tips.push([
      'Keep your plan realistic',
      'Avoid scheduling too much. A few focused sessions are better than a long list.'
    ]);
  }

  tips.slice(0, 3).forEach(([heading, message]) => {
    const item = document.createElement('div');
    item.className = 'suggestion';

    const strong = document.createElement('strong');
    strong.textContent = heading;

    item.append(strong, document.createTextNode(message));
    box.append(item);
  });
}

// Mark task completed or pending
function toggleTask(id) {
  tasks = tasks.map(t =>
    t.id === id
      ? { ...t, completed: !t.completed }
      : t
  );

  saveTasks();
  renderTasks();
}

// Delete task
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);

  saveTasks();
  renderTasks();
}

// Show add task form
function openForm() {
  addPanel.classList.add('show');
  taskTitle.focus();
}

// Hide form
function closeForm() {
  addPanel.classList.remove('show');
  taskForm.reset();
}

// Button events
document.getElementById('openAddForm')
  .addEventListener('click', openForm);

document.getElementById('emptyAddBtn')
  .addEventListener('click', openForm);

document.getElementById('closeAddForm')
  .addEventListener('click', closeForm);

// Add new task
taskForm.addEventListener('submit', event => {
  event.preventDefault();

  const title = taskTitle.value.trim();

  if (!title) return;

  tasks.unshift(
    createTask(
      title,
      taskSubject.value,
      taskDue.value,
      taskPriority.value
    )
  );

  saveTasks();
  renderTasks();
  closeForm();

  // Return to All Tasks filter
  currentFilter = 'all';

  document.querySelectorAll('.filter-btn').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.filter === 'all'
    );
  });
});

// Task filters
document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;

    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b === button);
    });

    renderTasks();
  });
});

// Display today's date
const now = new Date();

document.getElementById('todayLabel').textContent =
  now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

// Prevent selecting past date in date picker
taskDue.min = new Date(
  now.getTime() - now.getTimezoneOffset() * 60000
).toISOString().slice(0, 10);

// Initial render
renderTasks();