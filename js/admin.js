// admin.js - Admin Dashboard Logic
let statusChartInstance = null;
let problemsChartInstance = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadDashboard();
});

// Navigation Logic
function setupNavigation() {
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.view-section');

  links.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active nav link
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Update active section
      const targetId = link.getAttribute('data-target');
      sections.forEach(sec => sec.classList.remove('active'));
      document.getElementById(targetId).classList.add('active');

      // Load data for section
      if (targetId === 'dashboardView') loadDashboard();
      if (targetId === 'trackerDataView') loadTrackerData();
      if (targetId === 'routesDataView') loadRoutesData();
      if (targetId === 'problemsDataView') loadProblemsData();
      if (targetId === 'questionsDataView') loadQuestionsData();
      if (targetId === 'submissionsDataView') loadSubmissionsData();
      // importExportView requires no dynamic loading on open
    });
  });
}

// Modal Logic
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// API Fetch Wrapper with Mock Data Fallback
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`/api/v1${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error('Server not running');
  } catch (err) {
    console.warn('Backend API failed, using MOCK DATA for preview purposes:', err);
    
    // MOCK DATA FALLBACK
    if (endpoint === '/analytics') {
      return {
        ok: true,
        data: {
          totals: { trackerItems: 142, routes: 56, problems: 89, questions: 120 },
          trackerByStatus: [
            { status: 'resolved', count: 85 },
            { status: 'pending', count: 42 },
            { status: 'drafted', count: 15 }
          ],
          routesByDept: [
            { department: 'Municipal Corp', count: 20 },
            { department: 'Water Board', count: 15 },
            { department: 'Electricity Dept', count: 12 },
            { department: 'Transport', count: 9 }
          ],
          problemsByCategory: [
            { category: 'Infrastructure', count: 35 },
            { category: 'Sanitation', count: 28 },
            { category: 'Utilities', count: 18 },
            { category: 'Public Safety', count: 8 }
          ]
        }
      };
    }
    if (endpoint === '/tracker') {
      return {
        ok: true,
        data: [
          { id: 101, title: 'Pothole on MG Road', category: 'Infrastructure', status: 'pending', createdAt: '2026-08-25T10:00:00Z', notes: 'Awaiting inspector' },
          { id: 102, title: 'Streetlight broken in Sector 4', category: 'Utilities', status: 'resolved', createdAt: '2026-08-22T14:30:00Z', notes: 'Fixed by maintenance team' },
          { id: 103, title: 'Garbage accumulation', category: 'Sanitation', status: 'drafted', createdAt: '2026-08-28T09:15:00Z', notes: 'Need to add pictures' },
          { id: 104, title: 'Water pipe leak', category: 'Utilities', status: 'pending', createdAt: '2026-08-29T08:00:00Z', notes: 'Urgent attention required' }
        ]
      };
    }
    if (endpoint === '/routes') {
      return {
        ok: true,
        data: [
          { id: 1, authority_name: 'City Municipal Corporation', department: 'Municipal Corp', portal_name: 'Civic Portal', portal_url: '#' },
          { id: 2, authority_name: 'State Water Supply', department: 'Water Board', portal_name: 'Jal Board', portal_url: '#' },
          { id: 3, authority_name: 'Regional Transport Office', department: 'Transport', portal_name: 'Parivahan', portal_url: '#' }
        ]
      };
    }
    if (endpoint === '/problems') {
      return {
        ok: true,
        data: [
          { id: 'prob-1', title: 'How to report a pothole?', category: 'Infrastructure', routeId: 1 },
          { id: 'prob-2', title: 'No water supply for 2 days', category: 'Utilities', routeId: 2 },
          { id: 'prob-3', title: 'Applying for driving license', category: 'Transport', routeId: 3 }
        ]
      };
    }
    if (endpoint === '/questions') {
      return {
        ok: true,
        data: [
          { id: 'q-1', route_id: 1, sort_order: 1, prompt: 'What is the exact location of the issue?', question_key: 'location' },
          { id: 'q-2', route_id: 1, sort_order: 2, prompt: 'Have you taken any photos?', question_key: 'photos' },
          { id: 'q-3', route_id: 2, sort_order: 1, prompt: 'What is your consumer number?', question_key: 'consumer_no' }
        ]
      };
    }
    if (endpoint === '/submissions') {
      return {
        ok: true,
        data: [
          { id: 1, name: 'Anil Kumar', email: 'anil.k@example.com', form_type: 'newsletter', message: null, created_at: '2026-08-29T10:00:00Z' },
          { id: 2, name: 'Priya Singh', email: 'priya88@example.com', form_type: 'contact', message: 'I need help tracking my grievance on CPGRAMS.', created_at: '2026-08-28T14:30:00Z' },
          { id: 3, name: null, email: 'user.anon@example.com', form_type: 'newsletter', message: null, created_at: '2026-08-27T09:15:00Z' }
        ]
      };
    }
    
    // For PUT / DELETE (Mock Success)
    if (options.method === 'PUT' || options.method === 'DELETE') {
      alert('Mock Data Mode: Action simulated successfully!');
      return { ok: true };
    }
    
    return null;
  }
}

// ----------------------------------------------------
// DASHBOARD VIEW
// ----------------------------------------------------
async function loadDashboard() {
  const data = await apiFetch('/analytics');
  if (!data || !data.ok) return;

  // Update Stats
  document.getElementById('stat-total-tracker').innerText = data.data.totals.trackerItems;
  document.getElementById('stat-total-routes').innerText = data.data.totals.routes;
  document.getElementById('stat-total-problems').innerText = data.data.totals.problems;
  document.getElementById('stat-total-questions').innerText = data.data.totals.questions;

  // Render Status Chart
  const statusLabels = data.data.trackerByStatus.map(d => d.status.toUpperCase());
  const statusValues = data.data.trackerByStatus.map(d => d.count);
  renderPieChart('statusChart', statusLabels, statusValues, ['#1976D2', '#1A7A4E', '#F57F17', '#C74634']);

  // Render Problems By Category Chart
  const probLabels = data.data.problemsByCategory.map(d => d.category);
  const probValues = data.data.problemsByCategory.map(d => d.count);
  renderBarChart('problemsChart', probLabels, probValues);
}

function renderPieChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (statusChartInstance) statusChartInstance.destroy();
  
  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 1,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#5F5C5A' } }
      }
    }
  });
}

function renderBarChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  if (problemsChartInstance) problemsChartInstance.destroy();
  
  problemsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Problems',
        data: data,
        backgroundColor: '#C74634',
        borderRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: '#E5E4E2' }, ticks: { color: '#5F5C5A' } },
        x: { grid: { display: false }, ticks: { color: '#5F5C5A' } }
      }
    }
  });
}

// ----------------------------------------------------
// TRACKER VIEW
// ----------------------------------------------------
async function loadTrackerData() {
  const res = await apiFetch('/tracker');
  if (!res || !res.ok) return;

  const tbody = document.querySelector('#trackerTable tbody');
  tbody.innerHTML = res.data.map(item => `
    <tr>
      <td>#${item.id}</td>
      <td>${item.title}</td>
      <td>${item.category || 'N/A'}</td>
      <td><span class="badge status-${item.status}">${item.status}</span></td>
      <td>${new Date(item.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-icon" onclick="editTracker('${item.id}', '${item.status}', '${item.notes || ''}')">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        </button>
        <button class="btn btn-icon btn-danger" onclick="deleteTracker('${item.id}')">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function editTracker(id, status, notes) {
  document.getElementById('edit-tracker-id').value = id;
  document.getElementById('edit-tracker-status').value = status;
  document.getElementById('edit-tracker-notes').value = notes;
  openModal('trackerModal');
}

async function saveTracker(e) {
  e.preventDefault();
  const id = document.getElementById('edit-tracker-id').value;
  const status = document.getElementById('edit-tracker-status').value;
  const notes = document.getElementById('edit-tracker-notes').value;

  const res = await apiFetch(`/tracker/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes })
  });

  if (res && res.ok) {
    closeModal('trackerModal');
    loadTrackerData();
  }
}

async function deleteTracker(id) {
  if (!confirm('Are you sure you want to delete this grievance record?')) return;
  const res = await apiFetch(`/tracker/${id}`, { method: 'DELETE' });
  if (res && res.ok) loadTrackerData();
}

// ----------------------------------------------------
// ROUTES VIEW
// ----------------------------------------------------
async function loadRoutesData() {
  const res = await apiFetch('/routes');
  if (!res || !res.ok) return;

  const tbody = document.querySelector('#routesTable tbody');
  tbody.innerHTML = res.data.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.authority_name}</td>
      <td>${item.department}</td>
      <td><a href="${item.portal_url}" target="_blank" style="color:var(--accent-color)">${item.portal_name}</a></td>
      <td>
        <button class="btn btn-icon btn-danger" onclick="deleteRoute('${item.id}')">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

async function deleteRoute(id) {
  if (!confirm('Delete route?')) return;
  const res = await apiFetch(`/routes/${id}`, { method: 'DELETE' });
  if (res && res.ok) loadRoutesData();
}

// ----------------------------------------------------
// PROBLEMS VIEW
// ----------------------------------------------------
async function loadProblemsData() {
  const res = await apiFetch('/problems');
  if (!res || !res.ok) return;

  const tbody = document.querySelector('#problemsTable tbody');
  tbody.innerHTML = res.data.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.title}</td>
      <td>${item.category}</td>
      <td>${item.routeId || 'N/A'}</td>
      <td>
        <button class="btn btn-icon btn-danger" onclick="deleteProblem('${item.id}')">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

async function deleteProblem(id) {
  if (!confirm('Delete problem base entry?')) return;
  const res = await apiFetch(`/problems/${id}`, { method: 'DELETE' });
  if (res && res.ok) loadProblemsData();
}

// ----------------------------------------------------
// QUESTIONS VIEW
// ----------------------------------------------------
async function loadQuestionsData() {
  const res = await apiFetch('/questions');
  if (!res || !res.ok) return;

  const tbody = document.querySelector('#questionsTable tbody');
  tbody.innerHTML = res.data.map(item => `
    <tr>
      <td>${item.route_id}</td>
      <td>${item.sort_order}</td>
      <td>${item.prompt.substring(0,40)}...</td>
      <td>${item.question_key}</td>
      <td>
        <button class="btn btn-icon btn-danger" onclick="deleteQuestion('${item.id}')">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

async function deleteQuestion(id) {
  if (!confirm('Delete wizard question?')) return;
  const res = await apiFetch(`/questions/${id}`, { method: 'DELETE' });
  if (res && res.ok) loadQuestionsData();
}

// ----------------------------------------------------
// SUBMISSIONS VIEW
// ----------------------------------------------------
async function loadSubmissionsData() {
  const res = await apiFetch('/submissions');
  if (!res || !res.ok) return;

  const tbody = document.querySelector('#submissionsTable tbody');
  tbody.innerHTML = res.data.map(item => `
    <tr>
      <td>${item.id}</td>
      <td>${item.name || '<em style="color:var(--text-tertiary)">N/A</em>'}</td>
      <td><a href="mailto:${item.email}" style="color:var(--accent-color)">${item.email}</a></td>
      <td><span class="badge" style="background:var(--border-color); color:var(--text-primary)">${item.form_type}</span></td>
      <td>${item.message ? item.message.substring(0,40) + '...' : '<em style="color:var(--text-tertiary)">N/A</em>'}</td>
      <td>${new Date(item.created_at).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-icon btn-danger" onclick="deleteSubmission('${item.id}')">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

async function deleteSubmission(id) {
  if (!confirm('Delete user submission?')) return;
  const res = await apiFetch(`/submissions/${id}`, { method: 'DELETE' });
  if (res && res.ok) loadSubmissionsData();
}

// ----------------------------------------------------
// EXPORT & IMPORT VIEW
// ----------------------------------------------------
async function exportData() {
  alert('Preparing export...');
  // Since we are mocking data, we'll just download the mock objects
  const mockExport = {
    exportDate: new Date().toISOString(),
    routes: (await apiFetch('/routes')).data,
    tracker: (await apiFetch('/tracker')).data,
    problems: (await apiFetch('/problems')).data,
    questions: (await apiFetch('/questions')).data
  };

  const blob = new Blob([JSON.stringify(mockExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nyayasetu-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importData() {
  const fileInput = document.getElementById('importFile');
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Please select a JSON file to import first.');
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed.routes && !parsed.tracker) {
        throw new Error("Invalid backup format");
      }
      // Usually we would POST this to the backend, e.g. /api/v1/import
      // Since we are running in mock mode, just simulate success
      alert('Mock Data Mode: Backup file successfully validated and imported!\n(Refresh page to see mock data again)');
      fileInput.value = '';
    } catch (err) {
      alert('Error parsing JSON file: ' + err.message);
    }
  };
  
  reader.readAsText(file);
}
