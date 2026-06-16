const GRAPHQL_URL = 'http://localhost:4000/graphql';

// State Management
let jobsState = [];
let selectedJobId = null;
let activeTab = 'seeker'; // 'seeker' or 'employer'
let token = localStorage.getItem('token') || null;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// DOM Elements
const btnSeekerTab = document.getElementById('btn-seeker-tab');
const btnSeekerHistoryTab = document.getElementById('btn-seeker-history-tab');
const btnSavedJobsTab = document.getElementById('btn-saved-jobs-tab');
const btnProfileTab = document.getElementById('btn-profile-tab');
const btnEmployerTab = document.getElementById('btn-employer-tab');
const seekerSection = document.getElementById('seeker-section');
const seekerHistorySection = document.getElementById('seeker-history-section');
const savedJobsSection = document.getElementById('saved-jobs-section');
const profileSection = document.getElementById('profile-section');
const jobApplicantsSection = document.getElementById('job-applicants-section');
const mainContentWrapper = document.querySelector('.content-wrapper');
const loadingIndicator = document.getElementById('loading-indicator');
const errorIndicator = document.getElementById('error-indicator');

const authLanding = document.getElementById('auth-landing');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');
const btnShowLogin = document.getElementById('btn-show-login');
const btnShowRegister = document.getElementById('btn-show-register');
const btnCloseLogin = document.getElementById('btn-close-login');
const btnCloseRegister = document.getElementById('btn-close-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const linkToRegister = document.getElementById('link-to-register');
const linkToLogin = document.getElementById('link-to-login');
const userInfoSpan = document.getElementById('user-info');
const btnLogout = document.getElementById('btn-logout');

// Utility Date Parser
const parseDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (/^\d+$/.test(dateVal)) {
    return new Date(parseInt(dateVal));
  }
  const parsed = new Date(dateVal);
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

// Utility Currency Formatter
const formatRupiah = (salary) => {
  if (!salary) return 'Tidak ditentukan';
  const numericOnly = salary.replace(/[^0-9]/g, '');
  if (!numericOnly) return salary;
  return 'Rp ' + parseInt(numericOnly).toLocaleString('id-ID');
};

// GraphQL Request Helper
async function graphqlRequest(query, variables = {}) {
  try {
    showLoading(true);
    showError(null);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables })
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      throw new Error(`Server mengembalikan respon tidak valid (bukan JSON). Status: ${res.status} ${res.statusText}`);
    }

    if (json.errors) {
      throw new Error(json.errors[0].message);
    }
    return json.data;
  } catch (err) {
    console.error('GraphQL Error:', err);
    showError(err.message || 'Gagal terhubung ke GraphQL server.');
    throw err;
  } finally {
    showLoading(false);
  }
}

// UI Helpers
function showLoading(show) {
  if (loadingIndicator) loadingIndicator.style.display = show ? 'block' : 'none';
}

function showError(msg) {
  if (!errorIndicator) return;
  if (msg) {
    errorIndicator.textContent = msg;
    errorIndicator.style.display = 'block';
  } else {
    errorIndicator.style.display = 'none';
  }
}

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupAuthUI();
  setupCreateJobModal();

  if (token && currentUser) {
    showLoggedInUI();
    checkAuthAndRender();
  } else {
    showLoggedOutUI();
    checkAuthAndRender();
  }
});

function showLoggedInUI() {
  if (userInfoSpan) {
    userInfoSpan.textContent = `Halo, ${currentUser.name}`;
    userInfoSpan.style.display = 'inline-block';
  }
  if (btnLogout) btnLogout.style.display = 'inline-block';
}

function showLoggedOutUI() {
  if (userInfoSpan) userInfoSpan.style.display = 'none';
  if (btnLogout) btnLogout.style.display = 'none';
}

// Setup Auth UI and Listeners
function setupAuthUI() {
  if (btnShowLogin) btnShowLogin.addEventListener('click', () => loginModal.classList.add('active'));
  if (btnShowRegister) btnShowRegister.addEventListener('click', () => registerModal.classList.add('active'));
  if (btnCloseLogin) btnCloseLogin.addEventListener('click', () => loginModal.classList.remove('active'));
  if (btnCloseRegister) btnCloseRegister.addEventListener('click', () => registerModal.classList.remove('active'));

  if (linkToRegister) {
    linkToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginModal.classList.remove('active');
      registerModal.classList.add('active');
    });
  }

  if (linkToLogin) {
    linkToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerModal.classList.remove('active');
      loginModal.classList.add('active');
    });
  }

  const roleSelect = document.getElementById('register-role');
  const companyGroup = document.getElementById('register-company-group');
  if (roleSelect && companyGroup) {
    roleSelect.addEventListener('change', () => {
      if (roleSelect.value === 'recruiter') {
        companyGroup.style.display = 'block';
      } else {
        companyGroup.style.display = 'none';
        const registerCompanyInput = document.getElementById('register-company');
        if (registerCompanyInput) registerCompanyInput.value = '';
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      const mutation = `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
            user {
              id
              name
              email
              role
              companyName
              logoUrl
            }
          }
        }
      `;
      try {
        const data = await graphqlRequest(mutation, { email, password });
        token = data.login.token;
        currentUser = data.login.user;
        localStorage.setItem('token', token);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        loginModal.classList.remove('active');
        loginForm.reset();
        showLoggedInUI();
        checkAuthAndRender();
      } catch (err) {
        alert(`Login gagal: ${err.message}`);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      const role = roleSelect ? roleSelect.value : 'seeker';
      const companyName = document.getElementById('register-company') ? document.getElementById('register-company').value : '';

      const mutation = `
        mutation Register($name: String!, $email: String!, $password: String!, $role: String!, $companyName: String) {
          register(name: $name, email: $email, password: $password, role: $role, companyName: $companyName) {
            user {
              id
              name
            }
          }
        }
      `;
      try {
        await graphqlRequest(mutation, { name, email, password, role, companyName });
        alert('Registrasi berhasil! Silakan login.');
        registerModal.classList.remove('active');
        registerForm.reset();
        loginModal.classList.add('active');
      } catch (err) {
        alert(`Registrasi gagal: ${err.message}`);
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      token = null;
      currentUser = null;
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      showLoggedOutUI();
      checkAuthAndRender();
    });
  }
}

// Check auth state and render dynamic components
async function checkAuthAndRender() {
  if (!token || !currentUser) {
    if (authLanding) authLanding.style.display = 'block';
    if (seekerSection) seekerSection.style.display = 'none';
    if (seekerHistorySection) seekerHistorySection.style.display = 'none';
    if (savedJobsSection) savedJobsSection.style.display = 'none';
    if (profileSection) profileSection.style.display = 'none';
    if (jobApplicantsSection) jobApplicantsSection.style.display = 'none';

    if (btnSeekerTab) btnSeekerTab.style.display = 'none';
    if (btnSeekerHistoryTab) btnSeekerHistoryTab.style.display = 'none';
    if (btnSavedJobsTab) btnSavedJobsTab.style.display = 'none';
    if (btnProfileTab) btnProfileTab.style.display = 'none';
    if (btnEmployerTab) btnEmployerTab.style.display = 'none';
    const bellContainer = document.getElementById('bell-container');
    if (bellContainer) bellContainer.style.display = 'none';
  } else {
    if (authLanding) authLanding.style.display = 'none';

    if (currentUser.role === 'seeker') {
      if (btnSeekerTab) btnSeekerTab.style.display = 'inline-block';
      if (btnSeekerHistoryTab) btnSeekerHistoryTab.style.display = 'inline-block';
      if (btnSavedJobsTab) btnSavedJobsTab.style.display = 'inline-block';
      if (btnProfileTab) btnProfileTab.style.display = 'inline-block';
      if (btnEmployerTab) btnEmployerTab.style.display = 'none';
      const bellContainer = document.getElementById('bell-container');
      if (bellContainer) bellContainer.style.display = 'block';

      setupNotificationBell();
      loadNotifications();
      await fetchSavedJobIds();
      await fetchAppliedJobIds();
      switchTab('seeker');
    } else if (currentUser.role === 'recruiter') {
      if (btnSeekerTab) btnSeekerTab.style.display = 'none';
      if (btnSeekerHistoryTab) btnSeekerHistoryTab.style.display = 'none';
      if (btnSavedJobsTab) btnSavedJobsTab.style.display = 'none';
      if (btnProfileTab) btnProfileTab.style.display = 'inline-block';
      if (btnEmployerTab) btnEmployerTab.style.display = 'inline-block';
      const bellContainer = document.getElementById('bell-container');
      if (bellContainer) bellContainer.style.display = 'none';

      switchTab('employer');
    }
  }
}

// Setup Navigation Tabs
function setupNavigation() {
  if (btnSeekerTab) {
    btnSeekerTab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('seeker');
    });
  }
  if (btnSeekerHistoryTab) {
    btnSeekerHistoryTab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('seeker-history');
    });
  }
  if (btnSavedJobsTab) {
    btnSavedJobsTab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('saved-jobs');
    });
  }
  if (btnProfileTab) {
    btnProfileTab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('profile');
    });
  }
  if (btnEmployerTab) {
    btnEmployerTab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('employer');
    });
  }
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(sec => sec.style.display = 'none');

  if (tab === 'seeker') {
    if (btnSeekerTab) btnSeekerTab.classList.add('active');
    if (seekerSection) seekerSection.style.display = 'block';
    loadSeekerPortal();
  } else if (tab === 'seeker-history') {
    if (btnSeekerHistoryTab) btnSeekerHistoryTab.classList.add('active');
    if (seekerHistorySection) seekerHistorySection.style.display = 'block';
    loadSeekerHistoryPortal();
  } else if (tab === 'saved-jobs') {
    if (btnSavedJobsTab) btnSavedJobsTab.classList.add('active');
    if (savedJobsSection) savedJobsSection.style.display = 'block';
    loadSavedJobsPortal();
  } else if (tab === 'profile') {
    if (btnProfileTab) btnProfileTab.classList.add('active');
    if (profileSection) profileSection.style.display = 'block';
    loadProfilePortal();
  } else if (tab === 'employer') {
    if (btnEmployerTab) btnEmployerTab.classList.add('active');
    if (seekerSection) seekerSection.style.display = 'block'; // Recruiter portal replaces seekerSection content
    loadEmployerPortal();
  }
}

// ----------------------------------------------------
// SEEKER PORTAL LOGIC
// ----------------------------------------------------
async function loadSeekerPortal() {
  seekerSection.innerHTML = `
    <div class="hero-search-jobstreet">
      <div>
        <h1 style="color: white; margin-bottom: 1rem; font-size: 2rem;">Cari lowongan kerja terbaru</h1>
        
        <div class="search-container jobstreet-search">
          <div class="search-input-group">
            <svg width="20" height="20" fill="none" stroke="#666" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" id="search-keyword" placeholder="Jelaskan posisi yang kamu cari (jabatan, industri, skill...)">
          </div>
          <div class="search-input-group">
            <svg width="20" height="20" fill="none" stroke="#666" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <input type="text" id="search-location" placeholder="Masukkan kota atau wilayah">
          </div>
          <select id="search-category" style="display: none;">
            <option value="">Semua Kategori</option>
          </select>
          <button id="btn-search" class="search-btn jobstreet-btn">Cari</button>
        </div>
      </div>
    </div>

    <div class="job-portal-layout">
      <div class="job-list-pane" id="job-list-container">
        <!-- Rendered jobs list -->
      </div>
      <div class="job-detail-pane" id="job-detail-container">
        <!-- Empty state like Jobstreet -->
        <div class="empty-detail-jobstreet">
          <h3>&larr; Pilih lowongan kerja</h3>
          <p>Tampilkan detail di sini</p>
          <div class="empty-illustration">
             <svg viewBox="0 0 200 200" width="200" height="200">
                <circle cx="100" cy="100" r="80" fill="#fce4ec"/>
                <rect x="60" y="60" width="80" height="100" rx="8" fill="#fff" stroke="#e0e0e0" stroke-width="4"/>
                <rect x="70" y="70" width="60" height="20" rx="4" fill="#0d3880"/>
                <rect x="70" y="100" width="40" height="8" rx="4" fill="#e0e0e0"/>
                <rect x="70" y="115" width="60" height="8" rx="4" fill="#e0e0e0"/>
                <!-- Cursor arrow -->
                <path d="M110 130 L130 150 L120 155 L110 130" fill="#e91e63"/>
             </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Application Modal -->
    <div id="apply-modal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title">Kirim Lamaran Pekerjaan</h3>
          <button class="modal-close-btn" id="btn-close-modal">&times;</button>
        </div>
        <form id="apply-job-form">
          <input type="hidden" id="apply-job-id">
          <div class="form-group">
            <label for="apply-name">Nama Lengkap</label>
            <input type="text" id="apply-name" placeholder="Masukkan nama lengkap Anda" required>
          </div>
          <div class="form-group">
            <label for="apply-email">Alamat Email</label>
            <input type="email" id="apply-email" placeholder="contoh@domain.com" required>
          </div>
          <div class="form-group">
            <label for="apply-resume">Link Resume/CV (URL)</label>
            <input type="url" id="apply-resume" placeholder="https://drive.google.com/..." required>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">Kirim Lamaran</button>
        </form>
      </div>
    </div>
  `;

  seekerSection.classList.add('active');

  // Add search event listeners
  document.getElementById('btn-search').addEventListener('click', () => fetchAndRenderJobs());
  document.getElementById('search-keyword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchAndRenderJobs();
  });
  document.getElementById('search-location').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchAndRenderJobs();
  });
  document.getElementById('search-category').addEventListener('change', () => fetchAndRenderJobs());

  // Modal event listeners
  document.getElementById('btn-close-modal').addEventListener('click', closeApplyModal);
  document.getElementById('apply-job-form').addEventListener('submit', submitApplication);

  // Load jobs initial
  await fetchAndRenderJobs();
}

async function fetchAndRenderJobs() {
  const keyword = document.getElementById('search-keyword').value;
  const location = document.getElementById('search-location').value;
  const category = document.getElementById('search-category').value;

  const query = `
    query GetJobs($search: String, $location: String, $category: String) {
      jobs(search: $search, location: $location, category: $category) {
        id
        title
        company
        description
        location
        salary
        category
        type
        createdAt
        status
        deadline
        applicantCount
        savedCount
        logoUrl
        minEducation
      }
    }
  `;

  try {
    const data = await graphqlRequest(query, { search: keyword, location, category });
    jobsState = data.jobs;
    renderJobList();
  } catch (err) {
    // Errors handled in graphqlRequest helper
  }
}

function renderJobList() {
  const container = document.getElementById('job-list-container');
  const unappliedJobs = jobsState.filter(job => !appliedJobIds.includes(job.id));

  if (unappliedJobs.length === 0) {
    container.innerHTML = `
      <div class="no-data" style="padding: 2.5rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" style="color: var(--text-secondary); opacity: 0.5;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.073a2.25 2.25 0 01-2.25 2.25H5.25a2.25 2.25 0 01-2.25-2.25V15.75m16.5 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 15.75m16.5 0V9.75a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9.75v6"></path>
        </svg>
        <p style="font-weight: 600; color: var(--text-primary);">Belum ada lowongan tersedia</p>
        <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 240px; line-height: 1.5;">Rekruter belum memposting lowongan. Coba lagi nanti atau hapus filter pencarian.</p>
      </div>
    `;
    document.getElementById('job-detail-container').innerHTML = `
      <div class="no-data" style="padding: 3rem 2rem; text-align: center;">
        <p style="color: var(--text-secondary);">Belum ada lowongan untuk ditampilkan.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = unappliedJobs.map(job => {
    const logoHtml = job.logoUrl
      ? `<img src="${job.logoUrl}" alt="${job.company} Logo" style="width: 40px; height: 40px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;">`
      : `<div style="width: 40px; height: 40px; border-radius: var(--radius-sm); background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 1.1rem; flex-shrink: 0;">${job.company.charAt(0).toUpperCase()}</div>`;

    return `
      <div class="job-card ${job.id === selectedJobId ? 'selected' : ''}" onclick="selectJob('${job.id}')">
        <div class="job-card-header" style="display: flex; gap: 0.75rem; align-items: center;">
          ${logoHtml}
          <div style="min-width: 0; flex: 1;">
            <h3 class="job-title" style="margin: 0; font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${job.title}</h3>
            <p class="job-company" style="margin: 2px 0 0 0; font-size: 0.88rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${job.company}</p>
          </div>
        </div>
        <div class="job-meta-tags" style="margin-top: 0.75rem;">
          <span class="tag tag-type">${job.type}</span>
          <span class="tag tag-location">${job.location}</span>
          ${job.salary ? `<span class="tag tag-salary">${formatRupiah(job.salary)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // If a job is already selected, make sure details are shown
  if (selectedJobId) {
    renderJobDetails();
  } else if (unappliedJobs.length > 0) {
    // Proactively select the first job
    selectJob(unappliedJobs[0].id);
  }
}

window.selectJob = async function (id) {
  selectedJobId = id;
  // Update class of elements
  const cards = document.querySelectorAll('.job-card');
  cards.forEach(card => card.classList.remove('selected'));

  // Find which card is clicked
  const activeCard = Array.from(cards).find(card => card.getAttribute('onclick').includes(id));
  if (activeCard) activeCard.classList.add('selected');

  try {
    const query = `
      query GetJobDetail($id: ID!) {
        job(id: $id) {
          id
          title
          company
          description
          location
          salary
          category
          type
          createdAt
          status
          deadline
          applicantCount
          savedCount
          logoUrl
          minEducation
        }
      }
    `;
    const data = await graphqlRequest(query, { id });
    if (data && data.job) {
      const index = jobsState.findIndex(j => j.id === id);
      if (index !== -1) {
        jobsState[index] = data.job;
      } else {
        jobsState.push(data.job);
      }
    }
  } catch (err) {
    console.error('Error fetching job details:', err);
  }

  renderJobDetails();
};

function renderJobDetails() {
  const detailPane = document.getElementById('job-detail-container');
  const job = jobsState.find(j => j.id === selectedJobId);
  if (!job) {
    detailPane.innerHTML = `
      <div class="empty-detail-jobstreet">
        <h3>&larr; Pilih lowongan kerja</h3>
        <p>Tampilkan detail di sini</p>
        <div class="empty-illustration">
           <svg viewBox="0 0 200 200" width="200" height="200">
              <circle cx="100" cy="100" r="80" fill="#fce4ec"/>
              <rect x="60" y="60" width="80" height="100" rx="8" fill="#fff" stroke="#e0e0e0" stroke-width="4"/>
              <rect x="70" y="70" width="60" height="20" rx="4" fill="#0d3880"/>
              <rect x="70" y="100" width="40" height="8" rx="4" fill="#e0e0e0"/>
              <rect x="70" y="115" width="60" height="8" rx="4" fill="#e0e0e0"/>
              <!-- Cursor arrow -->
              <path d="M110 130 L130 150 L120 155 L110 130" fill="#e91e63"/>
           </svg>
        </div>
      </div>
    `;
    return;
  }

  // Format date helper
  const dateFormatted = parseDate(job.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const deadlineFormatted = job.deadline ? parseDate(job.deadline).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Tidak ditentukan';

  const status = job.status || 'Available';
  let statusBadgeHtml = '';
  const isClosedStatus = status.toLowerCase() === 'full' || status.toLowerCase() === 'closed' || status.toLowerCase() === 'penuh';
  
  if (!isClosedStatus) {
    statusBadgeHtml = `<span style="background-color: rgba(16, 185, 129, 0.15); color: var(--accent-success); padding: 0.25rem 0.65rem; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(16, 185, 129, 0.25);">Open / Tersedia</span>`;
  } else {
    statusBadgeHtml = `<span style="background-color: rgba(239, 68, 68, 0.15); color: var(--accent-danger); padding: 0.25rem 0.65rem; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(239, 68, 68, 0.25);">Closed / Penuh</span>`;
  }

  const isApplied = appliedJobIds.includes(job.id);
  let actionButtonHtml = '';
  if (isApplied) {
    actionButtonHtml = `
      <button class="btn btn-secondary" disabled style="background-color: #10b981; color: white; cursor: not-allowed; opacity: 0.8; box-shadow: none; display: inline-flex; align-items: center; gap: 0.25rem;">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        Sudah Dilamar
      </button>
    `;
  } else if (isClosedStatus) {
    actionButtonHtml = `
      <button class="btn btn-secondary" disabled style="background-color: #4b5563; color: #d1d5db; cursor: not-allowed; opacity: 0.8; box-shadow: none;">
        Lamar Pekerjaan Ini
      </button>
    `;
  } else {
    actionButtonHtml = `
      <button class="btn btn-primary" onclick="openApplyModal('${job.id}')">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        Lamar Pekerjaan Ini
      </button>
    `;
  }

  const isSaved = savedJobIds.includes(job.id);
  const bookmarkButtonHtml = (currentUser && currentUser.role === 'seeker') ? `
    <button class="btn" onclick="toggleSaveJobFromUI('${job.id}')" style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0; min-width: 44px; border: 1px solid ${isSaved ? 'var(--accent-blue)' : 'rgba(255,255,255,0.15)'}; background: ${isSaved ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)'}; color: ${isSaved ? 'var(--accent-blue)' : 'var(--text-secondary)'}; border-radius: var(--radius-sm); transition: var(--transition-smooth); cursor: pointer;" title="${isSaved ? 'Hapus dari Lowongan Tersimpan' : 'Simpan Lowongan'}">
      <svg width="20" height="20" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  ` : ''; const detailLogoHtml = job.logoUrl
    ? `<img src="${job.logoUrl}" alt="${job.company} Logo" style="width: 54px; height: 54px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;">`
    : `<div style="width: 54px; height: 54px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 1.4rem; flex-shrink: 0;">${job.company.charAt(0).toUpperCase()}</div>`;

  detailPane.innerHTML = `
    <div class="detail-header" style="display: flex; gap: 1rem; align-items: flex-start;">
      ${detailLogoHtml}
      <div style="flex: 1; min-width: 0;">
        <h2 class="detail-title" style="margin: 0; font-size: 1.5rem; word-break: break-word;">${job.title}</h2>
        <p class="detail-company" style="margin: 4px 0 0 0; font-size: 1.1rem; color: var(--text-secondary);">${job.company}</p>
        
        <!-- Statistik Interaksi -->
        <div style="display: flex; gap: 1.5rem; margin-top: 0.75rem; margin-bottom: 0.25rem; font-size: 0.85rem; color: var(--text-secondary); align-items: center; flex-wrap: wrap;">
          <span style="display: inline-flex; align-items: center; gap: 0.4rem;">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="color: var(--accent-blue);">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Jumlah Pelamar: <strong style="color: var(--accent-blue);">${job.applicantCount || 0}</strong>
          </span>
          <span style="display: inline-flex; align-items: center; gap: 0.4rem;">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="color: var(--accent-purple);">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Disimpan oleh: <strong style="color: var(--accent-purple);">${job.savedCount || 0} orang</strong>
          </span>
        </div>
      </div>
    </div>
    
    <div class="detail-header-meta" style="margin-top: 1.5rem;">
      <div class="detail-meta-grid">
        <div class="meta-item">
          <div class="meta-item-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
          </div>
          <div>
            <p class="meta-item-label">Lokasi</p>
            <p class="meta-item-value">${job.location}</p>
          </div>
        </div>
        <div class="meta-item">
          <div class="meta-item-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p class="meta-item-label">Gaji Per Bulan</p>
            <p class="meta-item-value">${formatRupiah(job.salary)}</p>
          </div>
        </div>
        <div class="meta-item">
          <div class="meta-item-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          <div>
            <p class="meta-item-label">Tipe Pekerjaan</p>
            <p class="meta-item-value">${job.type} (${job.category})</p>
          </div>
        </div>
        <div class="meta-item">
          <div class="meta-item-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l-4-2.2m4 2.2v6m-4-8.2L3 9m1.212-2.126A2 2 0 003 8.667v4.667a2 2 0 001.072 1.765l5 2.5a2 2 0 001.856 0l5-2.5a2 2 0 001.072-1.765V8.667a2 2 0 00-1.212-1.793L12 5l-3.788 1.874z" /></svg>
          </div>
          <div>
            <p class="meta-item-label">Pendidikan Minimal</p>
            <p class="meta-item-value" style="margin-top: 4px;">
              <span style="background-color: rgba(59, 130, 246, 0.15); color: var(--accent-blue); padding: 0.25rem 0.65rem; border-radius: var(--radius-sm); font-weight: 700; font-size: 0.8rem; border: 1px solid rgba(59, 130, 246, 0.25);">
                ${job.minEducation || 'Tidak ditentukan'}
              </span>
            </p>
          </div>
        </div>
        <div class="meta-item">
          <div class="meta-item-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <div>
            <p class="meta-item-label">Diposting Pada</p>
            <p class="meta-item-value">${dateFormatted}</p>
          </div>
        </div>
        <div class="meta-item">
          <div class="meta-item-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <div>
            <p class="meta-item-label">Deadline Pendaftaran</p>
            <p class="meta-item-value">${deadlineFormatted}</p>
          </div>
        </div>
        <div class="meta-item">
          <div class="meta-item-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <p class="meta-item-label">Status Lowongan</p>
            <p class="meta-item-value" style="margin-top: 4px;">${statusBadgeHtml}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-body">
      <h3 class="detail-section-title">Deskripsi Pekerjaan</h3>
      <div class="detail-description">${job.description}</div>
    </div>

    <div class="apply-action-bar" style="display: flex; gap: 0.5rem; align-items: center;">
      ${actionButtonHtml}
      ${bookmarkButtonHtml}
    </div>
  `;
}

window.openApplyModal = function (jobId) {
  document.getElementById('apply-job-id').value = jobId;
  document.getElementById('apply-job-form').reset();
  if (currentUser) {
    document.getElementById('apply-name').value = currentUser.name;
    document.getElementById('apply-email').value = currentUser.email;
  }
  document.getElementById('apply-modal').classList.add('active');
};

function closeApplyModal() {
  document.getElementById('apply-modal').classList.remove('active');
}

async function submitApplication(e) {
  e.preventDefault();
  const jobId = parseInt(document.getElementById('apply-job-id').value);
  const applicantName = document.getElementById('apply-name').value;
  const applicantEmail = document.getElementById('apply-email').value;
  const resumeUrl = document.getElementById('apply-resume').value;

  const mutation = `
    mutation ApplyJob($input: ApplicationInput!) {
      applyJob(input: $input) {
        id
        status
      }
    }
  `;

  try {
    await graphqlRequest(mutation, {
      input: { jobId, applicantName, applicantEmail, resumeUrl }
    });
    alert('Lamaran Anda berhasil dikirim!');
    closeApplyModal();
    
    if (!appliedJobIds.includes(jobId.toString())) {
      appliedJobIds.push(jobId.toString());
    }
    
    renderJobList();
    
    const unappliedJobs = jobsState.filter(job => !appliedJobIds.includes(job.id));
    if (unappliedJobs.length > 0) {
      await selectJob(unappliedJobs[0].id);
    } else {
      selectedJobId = null;
      renderJobDetails();
    }
  } catch (err) {
    alert(`Gagal melamar pekerjaan: ${err.message}`);
  }
}

// ----------------------------------------------------
// EMPLOYER / RECRUITER PORTAL LOGIC
// ----------------------------------------------------
async function loadEmployerPortal() {
  seekerSection.innerHTML = `
    <div class="recruiter-layout">
      <!-- Section: Header Action -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h1 style="font-size: 1.75rem; font-weight: 800; margin: 0;">Recruiter Portal</h1>
        <button class="btn btn-primary" id="btn-show-create-job-modal">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="margin-right: 0.25rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
          Tambah Lowongan
        </button>
      </div>

      <!-- Bento Grid 4x1 for Stats -->
      <div class="bento-grid-4">
        <!-- Stat Card 1: Total Views -->
        <div class="bento-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Views</span>
            <div class="stat-icon-wrapper" style="background-color: rgba(15, 76, 57, 0.05); color: var(--accent-primary);">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
          <div class="stat-body">
            <span class="stat-value">0</span>
            <span class="stat-trend trend-neutral">0% minggu ini</span>
          </div>
        </div>

        <!-- Stat Card 2: Shortlisted -->
        <div class="bento-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Shortlisted</span>
            <div class="stat-icon-wrapper" style="background-color: rgba(212, 255, 0, 0.15); color: var(--accent-primary);">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="stat-body">
            <span class="stat-value">0</span>
            <span class="stat-trend trend-neutral">0% mtd</span>
          </div>
        </div>

        <!-- Stat Card 3: Total Pelamar -->
        <div class="bento-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Total Pelamar</span>
            <div class="stat-icon-wrapper" style="background-color: rgba(15, 76, 57, 0.05); color: var(--accent-primary);">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div class="stat-body">
            <span class="stat-value" id="dashboard-total-applicants">0</span>
            <span class="stat-trend trend-neutral">Real-time database</span>
          </div>
        </div>

        <!-- Stat Card 4: Lowongan Aktif -->
        <div class="bento-card stat-card">
          <div class="stat-header">
            <span class="stat-label">Lowongan Aktif</span>
            <div class="stat-icon-wrapper" style="background-color: rgba(212, 255, 0, 0.15); color: var(--accent-primary);">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div class="stat-body">
            <span class="stat-value" id="dashboard-active-jobs">0</span>
            <span class="stat-trend trend-neutral">Aktif / Available</span>
          </div>
        </div>
      </div>

      <!-- Bento Grid Secondary: Trend Line Chart & Widgets -->
      <div class="bento-grid-secondary">
        <!-- Weekly Trend Chart -->
        <div class="bento-card weekly-trend-chart">
          <div class="chart-header">
            <h3 class="chart-title">Tren Kunjungan &amp; Lamaran</h3>
            <div class="chart-legend">
              <div class="legend-item">
                <div class="legend-color-emerald"></div>
                <span>Views</span>
              </div>
              <div class="legend-item">
                <div class="legend-color-lime"></div>
                <span>Lamaran</span>
              </div>
            </div>
          </div>
          <div class="chart-svg-container">
            <svg viewBox="0 0 500 220" width="100%" height="100%" preserveAspectRatio="none" style="display: block; overflow: visible;">
              <defs>
                <!-- Gradients for Premium Look -->
                <linearGradient id="chart-grad-views" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0F4C39" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#0F4C39" stop-opacity="0.0"/>
                </linearGradient>
                <linearGradient id="chart-grad-applies" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#D4FF00" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#D4FF00" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              
              <!-- Grid lines -->
              <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" stroke-dasharray="4" stroke-width="1" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" stroke-dasharray="4" stroke-width="1" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" stroke-dasharray="4" stroke-width="1" />
              <line x1="0" y1="190" x2="500" y2="190" stroke="#e2e8f0" stroke-width="1" />

              <!-- Area under Views path -->
              <path id="chart-area-views" d="M 0 190 L 500 190 L 500 190 L 0 190 Z" fill="url(#chart-grad-views)" />
              
              <!-- Views Line Path -->
              <path id="chart-line-views" d="M 0 190 L 500 190" fill="none" stroke="#0F4C39" stroke-width="3.5" stroke-linecap="round" />

              <!-- Area under Applies path -->
              <path id="chart-area-applies" d="M 0 190 L 500 190 L 500 190 L 0 190 Z" fill="url(#chart-grad-applies)" />
              
              <!-- Applies Line Path -->
              <path id="chart-line-applies" d="M 0 190 L 500 190" fill="none" stroke="#b8de00" stroke-width="3" stroke-linecap="round" />
              
              <!-- Data Points & Tooltips -->
              <g id="chart-points"></g>

              <!-- Empty State Text (Zero Data Dashboard) -->
              <text id="chart-empty-text" x="250" y="110" text-anchor="middle" fill="var(--text-secondary)" font-family="Inter" font-weight="600" font-size="14" style="display: block;">Data belum tersedia</text>
              
              <!-- Labels at the bottom -->
              <text class="chart-day-label" x="0" y="210" fill="#94a3b8" font-size="10" font-family="Inter" font-weight="600">Sen</text>
              <text class="chart-day-label" x="80" y="210" fill="#94a3b8" font-size="10" font-family="Inter" font-weight="600">Sel</text>
              <text class="chart-day-label" x="160" y="210" fill="#94a3b8" font-size="10" font-family="Inter" font-weight="600">Rab</text>
              <text class="chart-day-label" x="240" y="210" fill="#94a3b8" font-size="10" font-family="Inter" font-weight="600">Kam</text>
              <text class="chart-day-label" x="320" y="210" fill="#94a3b8" font-size="10" font-family="Inter" font-weight="600">Jum</text>
              <text class="chart-day-label" x="400" y="210" fill="#94a3b8" font-size="10" font-family="Inter" font-weight="600">Sab</text>
              <text class="chart-day-label" x="470" y="210" fill="#94a3b8" font-size="10" font-family="Inter" font-weight="600">Min</text>
            </svg>
          </div>
        </div>

        <!-- Schedule & Inbox Widget Card -->
        <div class="widget-stack">
          <!-- Widget: Jadwal Interview -->
          <div class="bento-card widget-card" id="widget-jadwal-card">
            <h3 class="widget-title" id="widget-jadwal-title">Jadwal Terdekat</h3>
            <ul class="widget-list" id="widget-jadwal-list">
              <li style="padding: 1.25rem 1rem; text-align: center; color: var(--text-secondary); font-size: 0.88rem; font-style: italic; border: 1px dashed var(--border-color); border-radius: var(--radius-md); background-color: var(--bg-primary);">Belum ada jadwal interview</li>
            </ul>
          </div>

          <!-- Widget: Inbox / Pesan Baru -->
          <div class="bento-card widget-card" id="widget-pesan-card">
            <h3 class="widget-title" id="widget-pesan-title">Pesan Masuk</h3>
            <ul class="widget-list" id="widget-pesan-list">
              <li style="padding: 1.25rem 1rem; text-align: center; color: var(--text-secondary); font-size: 0.88rem; font-style: italic; border: 1px dashed var(--border-color); border-radius: var(--radius-md); background-color: var(--bg-primary);">Tidak ada pesan baru</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Section: Daftar Lowongan Saya (Tabel Utama) -->
      <div class="card">
        <h2 class="card-title">Daftar Lowongan Kerja Saya</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Judul Lowongan</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Tanggal Upload</th>
                <th style="text-align:center;">Pelamar</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="my-jobs-list-body">
              <tr><td colspan="6" class="loading">Loading data lowongan Anda...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Bind Show Create Job Modal Button
  document.getElementById('btn-show-create-job-modal').addEventListener('click', () => {
    document.getElementById('job-created-at-modal').value = new Date().toISOString().split('T')[0];
    document.getElementById('create-job-modal').classList.add('active');
  });

  // Load recruiter's job list table
  await fetchAndRenderMyJobsTable();
}

// Inline update status lowongan
window.updateJobStatusInline = async function (jobId, newStatus) {
  const mutation = `
    mutation UpdateJobStatus($id: ID!, $status: String!) {
      updateJobStatus(id: $id, status: $status) {
        id
        status
      }
    }
  `;
  try {
    await graphqlRequest(mutation, { id: jobId, status: newStatus });
    alert(`Status lowongan berhasil diubah menjadi ${newStatus}`);
    await fetchAndRenderMyJobsTable();
  } catch (err) {
    alert(`Gagal memperbarui status lowongan: ${err.message}`);
    await fetchAndRenderMyJobsTable();
  }
};

// Global state / helper untuk bookmark lowongan
let savedJobIds = [];
let appliedJobIds = [];

async function fetchSavedJobIds() {
  if (!token || !currentUser || currentUser.role !== 'seeker') return;
  const query = `
    query {
      mySavedJobs {
        id
      }
    }
  `;
  try {
    const data = await graphqlRequest(query);
    savedJobIds = data.mySavedJobs.map(j => j.id);
  } catch (err) {
    console.error('Error fetching saved job IDs:', err);
  }
}

async function fetchAppliedJobIds() {
  if (!token || !currentUser || currentUser.role !== 'seeker') return;
  const query = `
    query {
      myApplications {
        jobId
      }
    }
  `;
  try {
    const data = await graphqlRequest(query);
    appliedJobIds = (data.myApplications || []).map(app => app.jobId);
  } catch (err) {
    console.error('Error fetching applied job IDs:', err);
  }
}

window.toggleSaveJobFromUI = async function (jobId) {
  const mutation = `
    mutation ToggleSave($jobId: ID!) {
      toggleSaveJob(jobId: $jobId)
    }
  `;
  try {
    const data = await graphqlRequest(mutation, { jobId });
    const isNowSaved = data.toggleSaveJob;
    if (isNowSaved) {
      if (!savedJobIds.includes(jobId)) savedJobIds.push(jobId);
      alert('Lowongan berhasil disimpan!');
    } else {
      savedJobIds = savedJobIds.filter(id => id !== jobId);
      alert('Lowongan dihapus dari daftar simpan.');
    }
    // Refetch details to update savedCount in real-time
    await selectJob(jobId);
    if (activeTab === 'saved-jobs') {
      loadSavedJobsPortal();
    }
  } catch (err) {
    alert(`Gagal menyimpan lowongan: ${err.message}`);
  }
};

async function loadSavedJobsPortal() {
  savedJobsSection.innerHTML = `
    <div class="card">
      <h2 class="card-title">Lowongan Kerja Tersimpan</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Lowongan</th>
              <th>Perusahaan</th>
              <th>Lokasi</th>
              <th>Deadline</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody id="saved-jobs-list-body">
            <tr><td colspan="5" class="loading">Loading data lowongan tersimpan...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const query = `
    query {
      mySavedJobs {
        id
        title
        company
        location
        deadline
        status
      }
    }
  `;
  try {
    const data = await graphqlRequest(query);
    const tbody = document.getElementById('saved-jobs-list-body');
    if (!tbody) return;

    if (!data.mySavedJobs || data.mySavedJobs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-data">Belum ada lowongan pekerjaan yang Anda simpan.</td></tr>';
      return;
    }

    tbody.innerHTML = data.mySavedJobs.map(job => {
      const deadlineDate = job.deadline ? parseDate(job.deadline).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) : 'Tidak ditentukan';

      return `
        <tr>
          <td><strong>${job.title}</strong></td>
          <td>${job.company}</td>
          <td>${job.location}</td>
          <td>${deadlineDate}</td>
          <td>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-primary btn-sm" onclick="viewSavedJobDetails('${job.id}')" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;">Lihat Detail</button>
              <button class="action-btn action-btn-reject" onclick="toggleSaveJobFromUI('${job.id}')" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    const tbody = document.getElementById('saved-jobs-list-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="no-data">Gagal memuat lowongan tersimpan.</td></tr>';
    }
  }
}

window.viewSavedJobDetails = function (jobId) {
  activeTab = 'seeker';
  document.querySelectorAll('.tab-content').forEach(sec => sec.style.display = 'none');
  seekerSection.style.display = 'block';
  document.querySelectorAll('.nav-links a').forEach(tab => tab.classList.remove('active'));
  btnSeekerTab.classList.add('active');

  loadSeekerPortal().then(() => {
    selectJob(jobId);
  });
};

// Seeker Profile Logic
async function loadProfilePortal() {
  if (currentUser && currentUser.role === 'recruiter') {
    profileSection.innerHTML = `
      <div class="card" style="max-width: 800px; margin: 0 auto;">
        <h2 class="card-title">Profil Perusahaan & Rekruter</h2>
        
        <form id="profile-form">
          <div class="form-group">
            <label for="profile-name">Nama Lengkap Rekruter</label>
            <input type="text" id="profile-name" placeholder="Nama lengkap Anda" required>
          </div>
          <div class="form-group">
            <label for="profile-company">Nama Perusahaan</label>
            <input type="text" id="profile-company" placeholder="Nama perusahaan Anda" required>
          </div>
          <div class="form-group">
            <label for="profile-logo-url">URL Logo Perusahaan</label>
            <input type="url" id="profile-logo-url" placeholder="https://example.com/logo.png">
          </div>
          <div id="logo-preview-container" style="margin-top: 1rem; display: none; flex-direction: column; gap: 0.5rem;">
            <label>Preview Logo</label>
            <img id="logo-preview-img" src="" alt="Logo Preview" style="max-width: 120px; max-height: 120px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid rgba(255,255,255,0.08);">
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1.5rem;">Simpan Profil Rekruter</button>
        </form>
      </div>
    `;

    const nameInput = document.getElementById('profile-name');
    const companyInput = document.getElementById('profile-company');
    const logoInput = document.getElementById('profile-logo-url');
    const previewContainer = document.getElementById('logo-preview-container');
    const previewImg = document.getElementById('logo-preview-img');

    nameInput.value = currentUser.name || '';
    companyInput.value = currentUser.companyName || '';
    logoInput.value = currentUser.logoUrl || '';

    const updatePreview = () => {
      const val = logoInput.value.trim();
      if (val) {
        previewImg.src = val;
        previewContainer.style.display = 'flex';
      } else {
        previewContainer.style.display = 'none';
      }
    };

    logoInput.addEventListener('input', updatePreview);
    updatePreview();

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const companyName = companyInput.value.trim();
      const logoUrl = logoInput.value.trim();

      const mutation = `
        mutation UpdateRecruiterProfile($name: String!, $companyName: String!, $logoUrl: String) {
          updateRecruiterProfile(name: $name, companyName: $companyName, logoUrl: $logoUrl) {
            id
            name
            companyName
            logoUrl
          }
        }
      `;

      try {
        const data = await graphqlRequest(mutation, { name, companyName, logoUrl: logoUrl || null });
        currentUser.name = data.updateRecruiterProfile.name;
        currentUser.companyName = data.updateRecruiterProfile.companyName;
        currentUser.logoUrl = data.updateRecruiterProfile.logoUrl;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        if (userInfoSpan) {
          userInfoSpan.textContent = `Halo, ${currentUser.name}`;
        }
        alert('Profil Rekruter berhasil diperbarui!');
      } catch (err) {
        alert(`Gagal memperbarui profil: ${err.message}`);
      }
    });
    return;
  }

  profileSection.innerHTML = `
    <div class="card" style="max-width: 800px; margin: 0 auto;">
      <h2 class="card-title">Profil Saya</h2>
      
      <div style="background-color: var(--bg-tertiary); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; font-size: 0.95rem;">Kelengkapan Profil</span>
          <span id="profile-progress-text" style="font-weight: 700; color: var(--accent-success);">0%</span>
        </div>
        <div style="background-color: rgba(255,255,255,0.1); border-radius: 999px; height: 10px; overflow: hidden; width: 100%;">
          <div id="profile-progress-bar" style="background: linear-gradient(135deg, var(--accent-blue), var(--accent-success)); height: 100%; width: 0%; transition: width 0.5s ease-in-out;"></div>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Lengkapi semua 5 field profil untuk memaksimalkan peluang dilihat Recruiter.</p>
      </div>

      <form id="profile-form">
        <div class="form-group">
          <label for="profile-name">Nama Lengkap</label>
          <input type="text" id="profile-name" placeholder="Nama lengkap Anda">
        </div>
        <div class="form-group">
          <label for="profile-bio">Bio / Deskripsi Singkat</label>
          <textarea id="profile-bio" rows="4" placeholder="Ceritakan singkat tentang diri Anda, minat profesional, dsb..."></textarea>
        </div>
        <div class="form-group">
          <label for="profile-experience">Pengalaman Kerja</label>
          <textarea id="profile-experience" rows="4" placeholder="Tuliskan riwayat pekerjaan Anda sebelumnya (nama perusahaan, jabatan, durasi)..."></textarea>
        </div>
        <div class="form-group">
          <label for="profile-skill">Keahlian (Skills)</label>
          <input type="text" id="profile-skill" placeholder="Misal: React, Node.js, PostgreSQL, Docker (pisahkan dengan koma)">
        </div>
        <div class="form-group">
          <label for="profile-portfolio">Link Portofolio (URL)</label>
          <input type="url" id="profile-portfolio" placeholder="https://github.com/username atau website pribadi Anda">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%;">Simpan Profil</button>
      </form>
    </div>
  `;

  const query = `
    query {
      myProfile {
        name
        bio
        pengalamanKerja
        skill
        portofolioUrl
      }
    }
  `;

  let profileData = null;
  try {
    const data = await graphqlRequest(query);
    profileData = data.myProfile;
  } catch (err) {
    console.error('Error fetching profile:', err);
  }

  const nameInput = document.getElementById('profile-name');
  const bioInput = document.getElementById('profile-bio');
  const expInput = document.getElementById('profile-experience');
  const skillInput = document.getElementById('profile-skill');
  const portInput = document.getElementById('profile-portfolio');

  // Pre-populate — name falls back to currentUser if profile name is null
  nameInput.value = (profileData && profileData.name) ? profileData.name : (currentUser ? currentUser.name : '');
  if (profileData) {
    bioInput.value = profileData.bio || '';
    expInput.value = profileData.pengalamanKerja || '';
    skillInput.value = profileData.skill || '';
    portInput.value = profileData.portofolioUrl || '';
  }

  function updateProgressBar() {
    let filledCount = 0;
    if (nameInput.value.trim()) filledCount++;
    if (bioInput.value.trim()) filledCount++;
    if (expInput.value.trim()) filledCount++;
    if (skillInput.value.trim()) filledCount++;
    if (portInput.value.trim()) filledCount++;

    const percent = Math.round((filledCount / 5) * 100);
    document.getElementById('profile-progress-text').textContent = `${percent}%`;
    document.getElementById('profile-progress-bar').style.width = `${percent}%`;
  }

  [nameInput, bioInput, expInput, skillInput, portInput].forEach(input => {
    input.addEventListener('input', updateProgressBar);
  });

  updateProgressBar();

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      // Update name if it changed
      const newName = nameInput.value.trim();
      if (newName && currentUser && newName !== currentUser.name) {
        const nameMutation = `
          mutation UpdateName($name: String!) {
            updateName(name: $name) {
              id name email role
            }
          }
        `;
        const nameData = await graphqlRequest(nameMutation, { name: newName });
        // Sync to local state so header name updates immediately
        currentUser.name = nameData.updateName.name;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('user-info').textContent = `Halo, ${currentUser.name}`;
      }

      // Update rest of profile
      const profileMutation = `
        mutation UpdateProfile($bio: String, $pengalamanKerja: String, $skill: String, $portofolioUrl: String) {
          updateProfile(bio: $bio, pengalamanKerja: $pengalamanKerja, skill: $skill, portofolioUrl: $portofolioUrl) {
            bio
          }
        }
      `;
      await graphqlRequest(profileMutation, {
        bio: bioInput.value,
        pengalamanKerja: expInput.value,
        skill: skillInput.value,
        portofolioUrl: portInput.value
      });
      alert('Profil Anda berhasil diperbarui!');
      updateProgressBar();
    } catch (err) {
      alert(`Gagal memperbarui profil: ${err.message}`);
    }
  });
}


// System Notifications Logic
let notificationList = [];

async function loadNotifications() {
  if (!token || !currentUser || currentUser.role !== 'seeker') return;

  const query = `
    query {
      myNotifications {
        id
        message
        isRead
        createdAt
      }
    }
  `;
  try {
    const data = await graphqlRequest(query);
    notificationList = data.myNotifications || [];

    const unreadCount = notificationList.filter(n => !n.isRead).length;
    const badge = document.getElementById('bell-badge-count');
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }

    renderNotificationsDropdown();
  } catch (err) {
    console.error('Error loading notifications:', err);
  }
}

function renderNotificationsDropdown() {
  const container = document.getElementById('notif-list-body');
  if (!container) return;

  const unread = notificationList.filter(n => !n.isRead);

  if (notificationList.length === 0) {
    container.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; padding: 1.5rem 0;">Tidak ada notifikasi.</div>';
    return;
  }

  // "Mark All as Read" button at top if there are unreads
  const markAllBtn = unread.length > 0 ? `
    <button onclick="markAllNotificationsRead()" style="width: 100%; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); color: var(--accent-blue); border-radius: var(--radius-sm); padding: 0.4rem 0.75rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; margin-bottom: 0.5rem; transition: var(--transition-smooth);">
      ✓ Tandai Semua Dibaca (${unread.length})
    </button>
  ` : '';

  const items = notificationList.map(n => {
    const timeStr = new Date(n.createdAt).toLocaleDateString('id-ID', {
      hour: 'numeric', minute: 'numeric', day: 'numeric', month: 'short'
    });
    const isUnread = !n.isRead;
    return `
      <div style="padding: 0.65rem; border-radius: var(--radius-sm); background-color: ${isUnread ? 'rgba(59, 130, 246, 0.08)' : 'transparent'}; border: 1px solid ${isUnread ? 'rgba(59, 130, 246, 0.15)' : 'transparent'}; position: relative; transition: var(--transition-smooth); display: flex; flex-direction: column; gap: 0.25rem;">
        ${isUnread ? '<span style="position: absolute; top: 0.75rem; right: 0.75rem; width: 8px; height: 8px; border-radius: 50%; background-color: var(--accent-blue);"></span>' : ''}
        <p style="font-size: 0.85rem; color: var(--text-primary); margin: 0; padding-right: 1.25rem; line-height: 1.4;">${n.message}</p>
        <span style="font-size: 0.75rem; color: var(--text-secondary);">${timeStr}</span>
        ${isUnread ? `<button onclick="clickNotification('${n.id}', true)" style="align-self: flex-start; margin-top: 4px; background: transparent; border: none; color: var(--accent-blue); font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 0;">✓ Tandai Dibaca</button>` : '<span style="font-size: 0.75rem; color: var(--text-secondary);">✓ Dibaca</span>'}
      </div>
    `;
  }).join('');

  container.innerHTML = markAllBtn + items;
}

window.clickNotification = async function (id, isUnread) {
  if (!isUnread) return;
  const mutation = `
    mutation MarkRead($id: ID!) {
      markAsRead(id: $id)
    }
  `;
  try {
    await graphqlRequest(mutation, { id });
    await loadNotifications();
  } catch (err) {
    console.error('Error marking notification as read:', err);
  }
};

window.markAllNotificationsRead = async function () {
  const mutation = `
    mutation {
      markAllAsRead
    }
  `;
  try {
    await graphqlRequest(mutation);
    await loadNotifications();
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
  }
};

// Notification bell state flag — prevents duplicate listener stacking
let _bellListenerAttached = false;

function setupNotificationBell() {
  const bell = document.getElementById('bell-container');
  const dropdown = document.getElementById('notif-dropdown');
  if (!bell || !dropdown) return;
  if (_bellListenerAttached) return;
  _bellListenerAttached = true;

  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShowing = dropdown.style.display === 'block';
    if (isShowing) {
      dropdown.style.display = 'none';
    } else {
      dropdown.style.display = 'block';
      // Refresh the list each time it is opened
      loadNotifications();
    }
  });

  // Close dropdown when clicking anywhere outside
  document.addEventListener('click', (e) => {
    if (!bell.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// Recruiter Modal and Workspace Logic
function setupCreateJobModal() {
  const modal = document.getElementById('create-job-modal');
  // Auto-format salary input to Rp format on blur
  const salaryInput = document.getElementById('job-salary-modal');
  if (salaryInput) {
    salaryInput.addEventListener('blur', () => {
      const raw = salaryInput.value.trim();
      if (!raw) return;
      // If it's a pure number (no letters), format it as Rp
      const numericOnly = raw.replace(/[^0-9\-]/g, '');
      if (/^\d+(\-\d+)?$/.test(numericOnly) && !raw.toLowerCase().includes('rp')) {
        // Single number
        if (/^\d+$/.test(numericOnly)) {
          const formatted = 'Rp ' + parseInt(numericOnly).toLocaleString('id-ID');
          salaryInput.value = formatted;
        }
      } else if (/^\d[\d.,\s]*[-–]\s*\d[\d.,]*$/.test(raw.replace(/[Rp\s]/gi, ''))) {
        // Already has range format, ensure Rp prefix
        if (!raw.startsWith('Rp')) {
          salaryInput.value = 'Rp ' + raw;
        }
      }
    });
  }

  const closeBtn = document.getElementById('btn-close-create-job');
  const form = document.getElementById('create-job-form-modal');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('job-title-modal').value;
      const location = document.getElementById('job-location-modal').value;
      let salary = document.getElementById('job-salary-modal').value.trim();
      const category = document.getElementById('job-category-modal').value;
      const type = document.getElementById('job-type-modal').value;
      const deadline = document.getElementById('job-deadline-modal').value;
      const status = document.getElementById('job-status-modal').value;
      const minEducation = document.getElementById('job-min-education-modal').value;
      const description = document.getElementById('job-description-modal').value;

      // Auto-format plain number salary before submit
      if (salary && /^\d+$/.test(salary.replace(/[.,\s]/g, ''))) {
        const num = parseInt(salary.replace(/[.,\s]/g, ''));
        salary = 'Rp ' + num.toLocaleString('id-ID');
      } else if (salary && !salary.toLowerCase().startsWith('rp') && /\d/.test(salary)) {
        salary = 'Rp ' + salary;
      }

      const mutation = `
        mutation CreateJob($input: JobInput!) {
          createJob(input: $input) {
            id
            title
            company
            deadline
            status
            createdAt
            minEducation
          }
        }
      `;

      try {
        await graphqlRequest(mutation, {
          input: { title, description, location, salary, category, type, deadline, status, minEducation }
        });
        alert('Lowongan pekerjaan baru berhasil ditambahkan!');
        form.reset();
        modal.classList.remove('active');
        await fetchAndRenderMyJobsTable();
      } catch (err) {
        alert(`Gagal memposting lowongan kerja: ${err.message}`);
      }
    });
  }
}

window.loadJobApplicantsPortal = async function (jobId, jobTitle) {
  document.querySelectorAll('.tab-content').forEach(sec => sec.style.display = 'none');
  jobApplicantsSection.style.display = 'block';

  jobApplicantsSection.innerHTML = `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.75rem;">
        <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">Daftar Pelamar: ${jobTitle}</h2>
        <button class="btn btn-secondary" onclick="goBackToRecruiterDashboard()">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" style="margin-right: 0.25rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Kembali ke Dasbor
        </button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nama Pelamar</th>
              <th>Email</th>
              <th>Resume</th>
              <th>Tanggal Melamar</th>
              <th>Status</th>
              <th>Profil</th>
              <th>Kelola Aksi</th>
            </tr>
          </thead>
          <tbody id="workspace-applicants-list-body">
            <tr><td colspan="7" class="loading">Loading pelamar...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  await renderWorkspaceApplicants(jobId, jobTitle);
};

window.goBackToRecruiterDashboard = function () {
  document.querySelectorAll('.tab-content').forEach(sec => sec.style.display = 'none');
  seekerSection.style.display = 'block';
  loadEmployerPortal();
};

async function renderWorkspaceApplicants(jobId, jobTitle) {
  const query = `
    query GetApplications($jobId: ID) {
      applications(jobId: $jobId) {
        id
        applicantName
        applicantEmail
        resumeUrl
        status
        appliedAt
        applicantId
      }
    }
  `;
  try {
    const data = await graphqlRequest(query, { jobId });
    const tbody = document.getElementById('workspace-applicants-list-body');
    if (!tbody) return;

    if (!data.applications || data.applications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-data">Belum ada pelamar untuk lowongan ini.</td></tr>';
      return;
    }

    tbody.innerHTML = data.applications.map(app => {
      const date = parseDate(app.appliedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      let badgeClass = 'badge-pending';
      const statusLower = app.status.toLowerCase();
      const isDecided = statusLower === 'accepted' || statusLower === 'acc' || statusLower === 'rejected';
      const disabledAttr = isDecided ? 'disabled' : '';

      if (statusLower === 'accepted' || statusLower === 'acc') {
        badgeClass = 'badge-accepted';
      } else if (statusLower === 'rejected') {
        badgeClass = 'badge-rejected';
      } else if (statusLower === 'interview') {
        badgeClass = 'badge-interview';
      }

      let displayStatus = app.status ? app.status.toUpperCase() : '';
      if (displayStatus === 'ACC') {
        displayStatus = 'ACCEPTED';
      }

      return `
        <tr>
          <td><strong>${app.applicantName}</strong></td>
          <td>${app.applicantEmail}</td>
          <td>
            <a href="${app.resumeUrl}" target="_blank" class="tag tag-type btn-resume" style="text-decoration:none;">Buka Resume</a>
          </td>
          <td>${date}</td>
          <td><span class="badge ${badgeClass}">${displayStatus}</span></td>
          <td>
            <button class="action-btn action-btn-interview" onclick="showApplicantProfile('${app.applicantEmail}', '${app.applicantName.replace(/'/g, "\\'")}', '${app.applicantId || ''}', '${jobId}')"
              style="padding: 0.35rem 0.75rem; font-size: 0.8rem; white-space: nowrap;">
              🔍 Lihat Profil
            </button>
          </td>
          <td>
            <div class="action-buttons">
              <button class="action-btn action-btn-accept" ${disabledAttr} onclick="promptStatusWithMessage('${app.id}', 'Accepted', '${jobId}', '${jobTitle.replace(/'/g, "\\'")}')" style="background-color: var(--accent-success); color: white; border: none; font-weight: bold; padding: 0.35rem 0.75rem;">Terima (ACC)</button>
              <button class="action-btn action-btn-reject" ${disabledAttr} onclick="promptStatusWithMessage('${app.id}', 'Rejected', '${jobId}', '${jobTitle.replace(/'/g, "\\'")}')" style="background-color: var(--accent-danger); color: white; border: none; font-weight: bold; padding: 0.35rem 0.75rem;">Tolak (Reject)</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    const tbody = document.getElementById('workspace-applicants-list-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-data">Gagal memuat daftar pelamar.</td></tr>';
    }
  }
}

window.showApplicantProfile = async function (email, name, applicantId, jobId) {
  // Remove any existing profile modal first
  const existing = document.getElementById('applicant-profile-modal');
  if (existing) existing.remove();

  // Inject modal markup
  const modalEl = document.createElement('div');
  modalEl.id = 'applicant-profile-modal';
  modalEl.className = 'modal-overlay active';
  modalEl.innerHTML = `
    <div class="modal-box" style="max-width: 600px; width: 95%;">
      <div class="modal-header">
        <h3 class="modal-title">Profil: ${name}</h3>
        <button class="modal-close-btn" onclick="document.getElementById('applicant-profile-modal').remove()">&times;</button>
      </div>
      <div id="applicant-profile-body" style="display: flex; flex-direction: column; gap: 1rem;">
        <p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">Memuat profil...</p>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);

  // Close on backdrop click
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) modalEl.remove();
  });

  try {
    const profileQuery = `
      query GetProfile($email: String!) {
        profileByEmail(email: $email) {
          name
          email
          bio
          pengalamanKerja
          skill
          portofolioUrl
        }
      }
    `;
    const data = await graphqlRequest(profileQuery, { email });
    const p = data.profileByEmail;
    const body = document.getElementById('applicant-profile-body');
    if (!body) return;

    if (!p) {
      body.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem 0;">Pelamar belum mengisi data profil mereka.</p>';
      return;
    }

    const field = (label, value, isLink = false) => {
      if (!value) return `<div style="padding: 0.75rem 1rem; background: var(--bg-tertiary); border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05);"><p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.25rem;">${label}</p><p style="color: var(--text-secondary); font-style: italic; font-size: 0.9rem;">Belum diisi</p></div>`;
      const content = isLink
        ? `<a href="${value}" target="_blank" style="color: var(--accent-blue); font-size: 0.95rem; word-break: break-all;">${value}</a>`
        : `<p style="color: var(--text-primary); font-size: 0.95rem; white-space: pre-wrap; line-height: 1.6;">${value}</p>`;
      return `<div style="padding: 0.75rem 1rem; background: var(--bg-tertiary); border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05);"><p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.25rem;">${label}</p>${content}</div>`;
    };

    const skillPills = p.skill
      ? p.skill.split(',').map(s => `<span class="tag tag-type" style="margin: 2px;">${s.trim()}</span>`).join('')
      : null;

    body.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: rgba(59,130,246,0.06); border-radius: var(--radius-md); border: 1px solid rgba(59,130,246,0.12);">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 700; color: white; flex-shrink: 0;">${(p.name || name).charAt(0).toUpperCase()}</div>
        <div style="flex: 1;">
          <p style="font-weight: 700; font-size: 1.05rem;">${p.name || name}</p>
          <p style="color: var(--accent-blue); font-size: 0.9rem;">${p.email || email}</p>
        </div>
        ${applicantId && jobId ? `
          <button class="btn btn-primary" onclick="openChatWindow('${jobId}', '${applicantId}', '${(p.name || name).replace(/'/g, "\\'")}')" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
            💬 Chat
          </button>
        ` : ''}
      </div>
      ${field('Bio / Ringkasan', p.bio)}
      ${field('Pengalaman Kerja', p.pengalamanKerja)}
      ${p.skill ? `<div style="padding: 0.75rem 1rem; background: var(--bg-tertiary); border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.05);"><p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); margin-bottom: 0.5rem;">Keahlian (Skills)</p><div style="display: flex; flex-wrap: wrap; gap: 4px;">${skillPills}</div></div>` : field('Keahlian (Skills)', null)}
      ${field('Link Portofolio', p.portofolioUrl, true)}
    `;
  } catch (err) {
    const body = document.getElementById('applicant-profile-body');
    if (body) body.innerHTML = `<p style="color: var(--accent-danger); text-align: center; padding: 2rem 0;">Gagal memuat profil: ${err.message}</p>`;
  }
};

// -------------------------------------------------------
// MODAL: Recruiter feedback when accepting/rejecting
// -------------------------------------------------------
window.promptStatusWithMessage = function (appId, status, jobId, jobTitle) {
  const existing = document.getElementById('status-feedback-modal');
  if (existing) existing.remove();

  const isAccept = status === 'Accepted';
  const actionLabel = isAccept ? 'Terima (ACC)' : 'Tolak (Reject)';
  const actionColor = isAccept ? 'var(--accent-success)' : 'var(--accent-danger)';
  const placeholderText = isAccept
    ? 'Selamat! Silakan hadir untuk interview pada hari... (opsional)'
    : 'Maaf, kami belum bisa melanjutkan proses seleksi Anda karena... (opsional)';

  let interviewInputs = '';
  if (isAccept) {
    interviewInputs = `
      <div style="display: flex; gap: 1rem; margin-top: 1rem;">
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <label for="status-interview-date">Tanggal Interview <span style="color: var(--accent-danger);">*</span></label>
          <input type="date" id="status-interview-date" required
            style="width: 100%; background: var(--bg-tertiary); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm); color: var(--text-primary); padding: 0.75rem; font-size: 0.9rem; outline: none; font-family: inherit;">
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
          <label for="status-interview-time">Waktu Interview <span style="color: var(--accent-danger);">*</span></label>
          <input type="time" id="status-interview-time" required
            style="width: 100%; background: var(--bg-tertiary); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm); color: var(--text-primary); padding: 0.75rem; font-size: 0.9rem; outline: none; font-family: inherit;">
        </div>
      </div>
    `;
  }

  const modal = document.createElement('div');
  modal.id = 'status-feedback-modal';
  modal.className = 'modal-overlay active';
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 520px; width: 95%;">
      <div class="modal-header">
        <h3 class="modal-title" style="color: ${actionColor};">${actionLabel}</h3>
        <button class="modal-close-btn" onclick="document.getElementById('status-feedback-modal').remove()">&times;</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
          Anda akan mengubah status lamaran menjadi <strong style="color: ${actionColor};">${status}</strong>.
          Tuliskan pesan opsional untuk dikirim ke pelamar:
        </p>
        <div class="form-group" style="margin-bottom: 0;">
          <label for="status-feedback-text">Pesan untuk Pelamar (Opsional)</label>
          <textarea id="status-feedback-text" rows="4"
            placeholder="${placeholderText}"
            style="width: 100%; background: var(--bg-tertiary); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm); color: var(--text-primary); padding: 0.75rem; font-size: 0.9rem; resize: vertical; outline: none; font-family: inherit;"></textarea>
        </div>
        ${interviewInputs}
        <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="document.getElementById('status-feedback-modal').remove()">Batal</button>
          <button class="btn btn-primary" style="background: ${actionColor}; border-color: ${actionColor};"
            onclick="submitStatusWithMessage('${appId}', '${status}', '${jobId}', '${jobTitle.replace(/'/g, "\\'")}')"
          >${actionLabel} &amp; Kirim</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  setTimeout(() => document.getElementById('status-feedback-text')?.focus(), 50);
};

window.submitStatusWithMessage = async function (appId, status, jobId, jobTitle) {
  const message = document.getElementById('status-feedback-text')?.value?.trim() || '';

  let interviewDate = null;
  let interviewTime = null;
  if (status === 'Accepted') {
    interviewDate = document.getElementById('status-interview-date')?.value || '';
    interviewTime = document.getElementById('status-interview-time')?.value || '';
    if (!interviewDate || !interviewTime) {
      alert('Tanggal dan waktu interview wajib diisi.');
      return;
    }
  }

  const modal = document.getElementById('status-feedback-modal');
  const submitBtn = modal?.querySelector('button[onclick^="submitStatus"]');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Memproses...'; }

  const mutation = `
    mutation UpdateStatus($id: ID!, $status: String!, $message: String, $interviewDate: String, $interviewTime: String) {
      updateApplicationStatus(id: $id, status: $status, message: $message, interviewDate: $interviewDate, interviewTime: $interviewTime) {
        id status feedbackMessage interviewDate interviewTime
      }
    }
  `;
  try {
    await graphqlRequest(mutation, { id: appId, status, message: message || null, interviewDate: interviewDate || null, interviewTime: interviewTime || null });
    if (modal) modal.remove();
    // Re-render applicant list immediately
    await renderWorkspaceApplicants(jobId, jobTitle);
    // Refresh dashboard widgets (Jadwal Terdekat, Pesan Masuk, stats)
    // Works even when the table is not in the DOM (user is on workspace page)
    await refreshDashboardWidgets();
  } catch (err) {
    alert(`Gagal memperbarui status lamaran: ${err.message}`);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Kirim'; }
  }
};

// ----------------------------------------------------
// DASHBOARD WIDGET REFRESH (independent of table DOM)
// ----------------------------------------------------
// Fetches only the data needed for widgets and stat cards.
// Safe to call from any page (workspace, applicant list, etc.)
async function refreshDashboardWidgets() {
  const query = `
    query RefreshWidgets {
      applications {
        id
        jobId
        applicantName
        status
        interviewDate
        interviewTime
        job {
          title
        }
      }
      getRecruiterMessages {
        id
        senderId
        jobId
        content
        createdAt
        senderName
      }
      myJobs {
        id
        status
      }
    }
  `;
  try {
    const data = await graphqlRequest(query);
    // Update stat cards if they exist in DOM
    const apps = data.applications || [];
    const totalApplicantsEl = document.getElementById('dashboard-total-applicants');
    if (totalApplicantsEl) totalApplicantsEl.textContent = apps.length.toLocaleString('id-ID');
    const activeJobsEl = document.getElementById('dashboard-active-jobs');
    if (activeJobsEl) {
      const activeCount = (data.myJobs || []).filter(j => j.status === 'Available').length;
      activeJobsEl.textContent = activeCount.toLocaleString('id-ID');
    }
    // Always update schedule + inbox widgets (they live in the persistent dashboard section)
    updateInterviewScheduleWidget(apps);
    if (data.getRecruiterMessages) {
      updateInboxMessagesWidget(data.getRecruiterMessages);
    }
  } catch (err) {
    console.error('refreshDashboardWidgets error:', err);
    // Silently fail — do not block the main action
  }
}

// ----------------------------------------------------
// MY JOBS LIST & APPLICATIONS HISTORY LOGIC
// ----------------------------------------------------
async function fetchAndRenderMyJobsTable() {
  const query = `
    query {
      myJobs {
        id
        title
        status
        deadline
        createdAt
      }
      getDailyStats {
        date
        views
        applications
      }
      getRecruiterMessages {
        id
        senderId
        receiverId
        jobId
        content
        createdAt
        senderName
      }
      applications {
        id
        jobId
        applicantName
        applicantEmail
        status
        interviewDate
        interviewTime
        job {
          title
        }
      }
    }
  `;
  try {
    const data = await graphqlRequest(query);
    const tbody = document.getElementById('my-jobs-list-body');
    // NOTE: Do NOT bail out early if tbody is missing.
    // Widgets (Jadwal, Pesan Masuk) must always be updated
    // even when the user is on the workspace/applicant page.

    const myJobsList = data.myJobs || [];
    const activeJobsCount = myJobsList.filter(job => job.status === 'Available').length;
    const totalApplicantsSum = data.applications ? data.applications.length : 0;

    const totalApplicantsEl = document.getElementById('dashboard-total-applicants');
    if (totalApplicantsEl) {
      totalApplicantsEl.textContent = totalApplicantsSum.toLocaleString('id-ID');
    }
    const activeJobsEl = document.getElementById('dashboard-active-jobs');
    if (activeJobsEl) {
      activeJobsEl.textContent = activeJobsCount.toLocaleString('id-ID');
    }

    // Build count map from applications list to avoid N+1 queries
    const countMap = {};
    if (data.applications) {
      data.applications.forEach(app => {
        countMap[app.jobId] = (countMap[app.jobId] || 0) + 1;
      });
    }

    // Handle SVG chart dynamically based on getDailyStats
    const chartAreaViews = document.getElementById('chart-area-views');
    const chartLineViews = document.getElementById('chart-line-views');
    const chartAreaApplies = document.getElementById('chart-area-applies');
    const chartLineApplies = document.getElementById('chart-line-applies');
    const chartPoints = document.getElementById('chart-points');
    const chartEmptyText = document.getElementById('chart-empty-text');

    const stats = data.getDailyStats || [];

    // Update X-axis day labels dynamically in Indonesian
    const dayLabels = document.querySelectorAll('.chart-day-label');
    if (dayLabels.length === 7 && stats.length === 7) {
      dayLabels.forEach((el, index) => {
        el.textContent = getIndonesianDayName(stats[index].date);
      });
    }

    const hasActivity = stats.some(s => s.applications > 0 || s.views > 0);

    if (chartAreaViews && chartLineViews && chartAreaApplies && chartLineApplies && chartPoints && chartEmptyText) {
      if (!hasActivity || stats.length === 0) {
        // Flat baseline paths
        chartAreaViews.setAttribute('d', 'M 0 190 L 500 190 L 500 190 L 0 190 Z');
        chartLineViews.setAttribute('d', 'M 0 190 L 500 190');
        chartAreaApplies.setAttribute('d', 'M 0 190 L 500 190 L 500 190 L 0 190 Z');
        chartLineApplies.setAttribute('d', 'M 0 190 L 500 190');

        // Hide data points and show empty state text
        chartPoints.innerHTML = '';
        chartPoints.style.display = 'none';
        chartEmptyText.textContent = 'Data belum tersedia';
        chartEmptyText.style.display = 'block';
      } else {
        const maxVal = Math.max(...stats.map(s => s.applications), ...stats.map(s => s.views), 1);
        const xCoords = [0, 80, 160, 240, 320, 400, 470];

        let pathViews = 'M';
        let pathApplies = 'M';
        let pointsHtml = '';

        for (let i = 0; i < stats.length; i++) {
          const x = xCoords[i] !== undefined ? xCoords[i] : i * 80;
          const yV = 190 - (stats[i].views / maxVal) * 150;
          const yA = 190 - (stats[i].applications / maxVal) * 150;

          pathViews += `${i === 0 ? '' : ' L'} ${x} ${yV}`;
          pathApplies += `${i === 0 ? '' : ' L'} ${x} ${yA}`;

          pointsHtml += `<circle cx="${x}" cy="${yV}" r="4" fill="#0F4C39" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0px 2px 4px rgba(15,76,57,0.3));" />`;
          pointsHtml += `<circle cx="${x}" cy="${yA}" r="4" fill="#b8de00" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0px 2px 4px rgba(184,222,0,0.4));" />`;
        }

        const areaViews = pathViews + ' L 470 190 L 0 190 Z';
        const areaApplies = pathApplies + ' L 470 190 L 0 190 Z';

        chartAreaViews.setAttribute('d', areaViews);
        chartLineViews.setAttribute('d', pathViews);
        chartAreaApplies.setAttribute('d', areaApplies);
        chartLineApplies.setAttribute('d', pathApplies);

        chartPoints.innerHTML = pointsHtml;
        chartPoints.style.display = 'block';
        chartEmptyText.style.display = 'none';
      }
    }

    // Update Recruiter Schedule and Message widgets
    if (data.applications) {
      updateInterviewScheduleWidget(data.applications);
    }
    if (data.getRecruiterMessages) {
      updateInboxMessagesWidget(data.getRecruiterMessages);
    }

    if (myJobsList.length === 0) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="no-data">Anda belum memposting lowongan kerja.</td></tr>';
      return;
    }

    if (!tbody) return; // Table not in DOM (e.g. called from workspace page) — widgets already updated above

    tbody.innerHTML = myJobsList.map(job => {
      const uploadDate = parseDate(job.createdAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      const deadlineDate = job.deadline ? parseDate(job.deadline).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
      }) : 'Tidak ditentukan';
      const totalApplicants = countMap[job.id] || 0;

      const selectHtml = `
        <select onchange="updateJobStatusInline('${job.id}', this.value)" style="background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-sm); padding: 0.35rem 0.65rem; font-size: 0.85rem; outline: none; cursor: pointer;">
          <option value="Available" ${job.status === 'Available' ? 'selected' : ''}>Available</option>
          <option value="Full" ${job.status === 'Full' ? 'selected' : ''}>Full</option>
        </select>
      `;

      const countBadge = `<span style="display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 0 8px; border-radius: 999px; background: ${totalApplicants > 0 ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)'}; color: ${totalApplicants > 0 ? 'var(--accent-blue)' : 'var(--text-secondary)'}; font-size: 0.85rem; font-weight: 700; border: 1px solid ${totalApplicants > 0 ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.08)'}">${totalApplicants}</span>`;

      return `
        <tr>
          <td><strong>${job.title}</strong></td>
          <td>${selectHtml}</td>
          <td>${deadlineDate}</td>
          <td>${uploadDate}</td>
          <td style="text-align:center;">${countBadge}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="loadJobApplicantsPortal('${job.id}', '${job.title.replace(/'/g, "\\'")}')"
              style="padding: 0.35rem 0.75rem; font-size: 0.85rem;">Lihat Pelamar</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error fetching my jobs table:', err);
    const tbody = document.getElementById('my-jobs-list-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="no-data">Gagal memuat lowongan kerja Anda.</td></tr>';
    }
  }
}

async function loadSeekerHistoryPortal() {
  seekerHistorySection.innerHTML = `
    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-start;">
      <!-- Table Card (70% width on desktop) -->
      <div class="card" style="flex: 2.2; min-width: 320px;">
        <h2 class="card-title">Riwayat Lamaran Saya</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Posisi / Jabatan</th>
                <th>Perusahaan</th>
                <th>Tanggal Melamar</th>
                <th>Status</th>
                <th>Resume</th>
                <th>Pesan Rekruter</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="seeker-history-list-body">
              <tr><td colspan="7" class="loading">Loading data lamaran...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Seeker Schedule Widget (30% width on desktop) -->
      <div style="flex: 0.8; min-width: 260px; display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="bento-card widget-card" id="seeker-schedule-widget">
          <h3 class="widget-title">Jadwal Terdekat</h3>
          <ul class="widget-list">
            <li style="padding: 1.25rem 1rem; text-align: center; color: var(--text-secondary); font-size: 0.88rem; font-style: italic; border: 1px dashed var(--border-color); border-radius: var(--radius-md); background-color: var(--bg-primary);">Belum ada jadwal interview</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  const query = `
    query {
      myApplications {
        id
        jobId
        appliedAt
        status
        feedbackMessage
        resumeUrl
        interviewDate
        interviewTime
        job {
          title
          company
          recruiterId
        }
      }
    }
  `;

  try {
    const data = await graphqlRequest(query);
    const tbody = document.getElementById('seeker-history-list-body');
    if (!tbody) return;

    if (!data.myApplications || data.myApplications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-data">Anda belum mengirimkan lamaran pekerjaan.</td></tr>';
      return;
    }

    tbody.innerHTML = data.myApplications.map(app => {
      const date = parseDate(app.appliedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      let badgeClass = 'badge-pending';
      const statusLower = app.status.toLowerCase();
      if (statusLower.includes('accept') || statusLower === 'acc' || statusLower === 'diterima') {
        badgeClass = 'badge-accepted';
      } else if (statusLower.includes('reject') || statusLower === 'ditolak') {
        badgeClass = 'badge-rejected';
      } else if (statusLower.includes('interview')) {
        badgeClass = 'badge-interview';
      }

      const hasFeedback = app.feedbackMessage && app.feedbackMessage.trim();
      const isDecided = statusLower.includes('accept') || statusLower.includes('reject');
      let feedbackCell = '';
      if (hasFeedback) {
        const feedbackColor = statusLower.includes('accept') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)';
        const feedbackBorder = statusLower.includes('accept') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
        feedbackCell = `<div style="background: ${feedbackColor}; border: 1px solid ${feedbackBorder}; border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; font-size: 0.85rem; color: var(--text-primary); line-height: 1.5; max-width: 280px;">${app.feedbackMessage}</div>`;
      } else if (isDecided) {
        feedbackCell = `<span style="color: var(--text-secondary); font-style: italic; font-size: 0.82rem;">Tidak ada pesan</span>`;
      } else {
        feedbackCell = `<span style="color: var(--text-secondary); font-size: 0.82rem;">—</span>`;
      }

      // Interview invitation card under Job title
      let interviewCard = '';
      if ((statusLower === 'accepted' || statusLower === 'acc') && app.interviewDate && app.interviewTime) {
        const interviewDateFormatted = new Date(app.interviewDate).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
        interviewCard = `
          <div style="margin-top: 0.5rem; background: rgba(212, 255, 0, 0.15); border: 1px solid var(--accent-primary); border-radius: var(--radius-sm); padding: 0.5rem 0.75rem; font-size: 0.85rem; color: var(--text-primary); max-width: 320px;">
            <div style="font-weight: 800; color: var(--accent-primary); display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Undangan Interview
            </div>
            <span>${interviewDateFormatted} jam ${app.interviewTime}</span>
          </div>
        `;
      }

      // Chat Recruiter button
      const chatBtn = (app.job && app.job.recruiterId)
        ? `<button class="btn btn-secondary btn-sm" onclick="openChatWindow('${app.jobId}', '${app.job.recruiterId}', '${app.job.company.replace(/'/g, "\\'")}')" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;">💬 Chat</button>`
        : `<span style="color: var(--text-secondary); font-size: 0.82rem;">—</span>`;

      return `
        <tr>
          <td>
            <strong>${app.job ? app.job.title : 'Lowongan Dihapus'}</strong>
            ${interviewCard}
          </td>
          <td>${app.job ? app.job.company : '-'}</td>
          <td>${date}</td>
          <td><span class="badge ${badgeClass}">${app.status}</span></td>
          <td><a href="${app.resumeUrl}" target="_blank" class="tag tag-type btn-resume" style="text-decoration:none;">Buka Resume</a></td>
          <td>${feedbackCell}</td>
          <td>${chatBtn}</td>
        </tr>
      `;
    }).join('');

    // Seeker Schedule Widget Populate
    const seekerInterviews = data.myApplications.filter(app => (app.status === 'Accepted' || app.status === 'ACC') && app.interviewDate && app.interviewTime);
    const seekerWidgetList = document.querySelector('#seeker-schedule-widget .widget-list');
    if (seekerWidgetList) {
      if (seekerInterviews.length === 0) {
        seekerWidgetList.innerHTML = `
          <li style="padding: 1.25rem 1rem; text-align: center; color: var(--text-secondary); font-size: 0.88rem; font-style: italic; border: 1px dashed var(--border-color); border-radius: var(--radius-md); background-color: var(--bg-primary);">Belum ada jadwal interview</li>
        `;
      } else {
        seekerInterviews.sort((a, b) => new Date(`${a.interviewDate}T${a.interviewTime}`) - new Date(`${b.interviewDate}T${b.interviewTime}`));
        seekerWidgetList.innerHTML = seekerInterviews.map(app => {
          const dateFormatted = new Date(app.interviewDate).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short'
          });
          return `
            <li class="widget-item">
              <div class="widget-icon-box" style="background-color: rgba(212, 255, 0, 0.15); color: var(--accent-primary);">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div class="widget-info">
                <p class="widget-name">${app.job ? app.job.company : 'Perusahaan'}</p>
                <p class="widget-sub">Interview • ${app.job ? app.job.title : 'Lowongan'}</p>
              </div>
              <div class="widget-meta" style="font-size: 0.75rem; color: var(--accent-primary); font-weight: bold; line-height: 1.25;">
                ${dateFormatted}<br>${app.interviewTime}
              </div>
            </li>
          `;
        }).join('');
      }
    }
  } catch (err) {
    console.error('Error fetching seeker applications:', err);
    const tbody = document.getElementById('seeker-history-list-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-data">Gagal memuat data lamaran.</td></tr>';
    }
  }
}

// ----------------------------------------------------
// DYNAMIC CHAT & MESSAGING SYSTEM
// ----------------------------------------------------
window.openChatWindow = function (jobId, targetUserId, targetUserName) {
  const profModal = document.getElementById('applicant-profile-modal');
  if (profModal) profModal.remove();

  const existing = document.getElementById('chat-window-modal');
  if (existing) existing.remove();

  const chatModal = document.createElement('div');
  chatModal.id = 'chat-window-modal';
  chatModal.className = 'modal-overlay active';
  chatModal.innerHTML = `
    <div class="modal-box" style="max-width: 550px; width: 95%; height: 500px; display: flex; flex-direction: column; padding: 1.5rem;">
      <div class="modal-header" style="margin-bottom: 1rem; padding-bottom: 0.5rem; flex-shrink: 0;">
        <h3 class="modal-title" style="display: flex; align-items: center; gap: 0.5rem; color: var(--accent-primary);">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat: ${targetUserName}
        </h3>
        <button class="modal-close-btn" onclick="document.getElementById('chat-window-modal').remove()">&times;</button>
      </div>
      
      <!-- Chat Message History Body -->
      <div id="chat-messages-body" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; padding-right: 0.25rem; margin-bottom: 1rem; background: var(--bg-primary); border-radius: var(--radius-sm); padding: 1rem; border: 1px solid var(--border-color);">
        <p style="color: var(--text-secondary); text-align: center; font-style: italic; margin-top: 2rem;">Memuat percakapan...</p>
      </div>
      
      <!-- Input Field Action Bar -->
      <form id="chat-send-form" style="display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0;" onsubmit="sendChatMessage(event, '${jobId}', '${targetUserId}')">
        <input type="text" id="chat-input-field" placeholder="Ketik pesan Anda di sini..." required style="flex: 1; background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem 1rem; color: var(--text-primary); font-size: 0.95rem; outline: none;">
        <button type="submit" class="btn btn-primary" style="padding: 0.75rem 1.5rem;">Kirim</button>
      </form>
    </div>
  `;
  document.body.appendChild(chatModal);

  chatModal.addEventListener('click', (e) => {
    if (e.target === chatModal) chatModal.remove();
  });

  loadChatHistory(jobId, targetUserId);
};

window.loadChatHistory = async function (jobId, targetUserId) {
  const query = `
    query GetMessages($jobId: ID!, $userId: ID!) {
      getMessages(jobId: $jobId, userId: $userId) {
        id
        senderId
        receiverId
        content
        createdAt
      }
    }
  `;
  try {
    const data = await graphqlRequest(query, { jobId, userId: targetUserId });
    const messages = data.getMessages || [];
    const body = document.getElementById('chat-messages-body');
    if (!body) return;

    if (messages.length === 0) {
      body.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-style: italic; margin-top: 2rem;">Belum ada pesan. Mulai percakapan di bawah.</p>';
      return;
    }

    body.innerHTML = messages.map(msg => {
      const isMe = msg.senderId.toString() === currentUser.id.toString();
      const alignStyle = isMe ? 'align-self: flex-end; background-color: var(--accent-primary); color: #ffffff;' : 'align-self: flex-start; background-color: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color);';
      const radiusStyle = isMe ? 'border-top-left-radius: 12px; border-bottom-left-radius: 12px; border-top-right-radius: 12px; border-bottom-right-radius: 4px;' : 'border-top-left-radius: 12px; border-bottom-left-radius: 4px; border-top-right-radius: 12px; border-bottom-right-radius: 12px;';
      const timeStr = new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      return `
        <div style="${alignStyle} ${radiusStyle} padding: 0.75rem 1rem; max-width: 75%; font-size: 0.9rem; line-height: 1.45; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 0.25rem;">
          <p style="margin: 0; word-break: break-word;">${msg.content}</p>
          <span style="font-size: 0.7rem; opacity: 0.7; align-self: flex-end;">${timeStr}</span>
        </div>
      `;
    }).join('');

    body.scrollTop = body.scrollHeight;
  } catch (err) {
    console.error('Error loading chat history:', err);
    const body = document.getElementById('chat-messages-body');
    if (body) body.innerHTML = '<p style="color: var(--accent-danger); text-align: center; font-style: italic; margin-top: 2rem;">Gagal memuat pesan.</p>';
  }
};

window.sendChatMessage = async function (e, jobId, receiverId) {
  e.preventDefault();
  const input = document.getElementById('chat-input-field');
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;

  const mutation = `
    mutation SendMsg($jobId: ID!, $receiverId: ID!, $content: String!) {
      sendMessage(jobId: $jobId, receiverId: $receiverId, content: $content) {
        id
      }
    }
  `;
  try {
    await graphqlRequest(mutation, { jobId, receiverId, content });
    input.value = '';
    await loadChatHistory(jobId, receiverId);
  } catch (err) {
    alert(`Gagal mengirim pesan: ${err.message}`);
  }
};

// ----------------------------------------------------
// UTILITY FOR DAY NAMES & SCHEDULING WIDGET
// ----------------------------------------------------
const getIndonesianDayName = (dateStr) => {
  const date = new Date(dateStr);
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  return days[date.getDay()];
};

function updateInterviewScheduleWidget(apps) {
  // Use stable ID-based targeting instead of text matching
  const container = document.getElementById('widget-jadwal-list');
  if (!container) return; // Dashboard widget section not in DOM yet

  // Filter: status must be 'Accepted' and both date + time must be filled
  const interviews = apps.filter(app =>
    app.status === 'Accepted' && app.interviewDate && app.interviewDate.trim() && app.interviewTime && app.interviewTime.trim()
  );

  if (interviews.length === 0) {
    container.innerHTML = `
      <li style="padding: 1.25rem 1rem; text-align: center; color: var(--text-secondary); font-size: 0.88rem; font-style: italic; border: 1px dashed var(--border-color); border-radius: var(--radius-md); background-color: var(--bg-primary);">Belum ada jadwal interview</li>
    `;
    return;
  }

  // Sort chronologically (soonest first)
  interviews.sort((a, b) => new Date(`${a.interviewDate}T${a.interviewTime}`) - new Date(`${b.interviewDate}T${b.interviewTime}`));

  container.innerHTML = interviews.map(app => {
    const dateFormatted = new Date(app.interviewDate).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short'
    });
    // Format time from HH:MM to display nicely
    const timeFormatted = app.interviewTime ? app.interviewTime.substring(0, 5) : '';
    return `
      <li class="widget-item">
        <div class="widget-icon-box">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div class="widget-info">
          <p class="widget-name">${app.applicantName}</p>
          <p class="widget-sub">Interview • ${app.job ? app.job.title : 'Lowongan'}</p>
        </div>
        <div class="widget-meta" style="font-size: 0.75rem; color: var(--accent-primary); font-weight: bold; line-height: 1.25;">
          ${dateFormatted}<br>${timeFormatted}
        </div>
      </li>
    `;
  }).join('');
}

function updateInboxMessagesWidget(messages) {
  // Use stable ID-based targeting
  const container = document.getElementById('widget-pesan-list');
  const widgetTitleEl = document.getElementById('widget-pesan-title');
  if (!container) return; // Dashboard widget section not in DOM yet

  const unreadCount = messages.length;

  if (widgetTitleEl) {
    widgetTitleEl.innerHTML = `Pesan Masuk ${unreadCount > 0 ? `<span class="badge badge-rejected" style="border-radius: 50%; padding: 2px 6px; font-size: 0.7rem; font-weight: bold; margin-left: 0.5rem; line-height: 1; vertical-align: middle;">${unreadCount}</span>` : ''}`;
  }

  if (messages.length === 0) {
    container.innerHTML = `
      <li style="padding: 1.25rem 1rem; text-align: center; color: var(--text-secondary); font-size: 0.88rem; font-style: italic; border: 1px dashed var(--border-color); border-radius: var(--radius-md); background-color: var(--bg-primary);">Tidak ada pesan baru</li>
    `;
    return;
  }

  container.innerHTML = messages.map(msg => {
    const timeFormatted = new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `
      <li class="widget-item" style="cursor: pointer;" onclick="openChatWindow('${msg.jobId}', '${msg.senderId}', '${(msg.senderName || 'Pelamar').replace(/'/g, "\\'")}')">
        <div class="widget-icon-box" style="background-color: rgba(212, 255, 0, 0.15); color: var(--accent-primary);">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div class="widget-info">
          <p class="widget-name">${msg.senderName || 'Pelamar #' + msg.senderId}</p>
          <p class="widget-sub">"${msg.content}"</p>
        </div>
        <div class="widget-meta" style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.25;">
          ${timeFormatted}
        </div>
      </li>
    `;
  }).join('');
}
