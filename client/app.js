const GRAPHQL_URL = 'http://localhost:4000/graphql';

// State Management
let jobsState = [];
let selectedJobId = null;
let activeTab = 'seeker'; // 'seeker' or 'employer'

// DOM Elements
const btnSeekerTab = document.getElementById('btn-seeker-tab');
const btnEmployerTab = document.getElementById('btn-employer-tab');
const seekerSection = document.getElementById('seeker-section');
const mainContentWrapper = document.querySelector('.content-wrapper');
const loadingIndicator = document.getElementById('loading-indicator');
const errorIndicator = document.getElementById('error-indicator');

// GraphQL Request Helper
async function graphqlRequest(query, variables = {}) {
  try {
    showLoading(true);
    showError(null);
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });
    const json = await res.json();
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
  loadingIndicator.style.display = show ? 'block' : 'none';
}

function showError(msg) {
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
  loadSeekerPortal();
});

// Setup Navigation Tabs
function setupNavigation() {
  btnSeekerTab.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeTab === 'seeker') return;
    activeTab = 'seeker';
    btnSeekerTab.classList.add('active');
    btnEmployerTab.classList.remove('active');
    loadSeekerPortal();
  });

  btnEmployerTab.addEventListener('click', (e) => {
    e.preventDefault();
    if (activeTab === 'employer') return;
    activeTab = 'employer';
    btnEmployerTab.classList.add('active');
    btnSeekerTab.classList.remove('active');
    loadEmployerPortal();
  });
}

// ----------------------------------------------------
// SEEKER PORTAL LOGIC
// ----------------------------------------------------
async function loadSeekerPortal() {
  // Clear main contents
  seekerSection.innerHTML = `
    <div class="hero-search">
      <h1>Temukan Pekerjaan Impian Anda</h1>
      <p>Cari lowongan kerja terbaik dari perusahaan terkemuka di Indonesia</p>
      
      <div class="search-container">
        <div class="search-input-group">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" id="search-keyword" placeholder="Kata kunci pekerjaan, keahlian, atau perusahaan...">
        </div>
        <div class="search-input-group">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <input type="text" id="search-location" placeholder="Kota atau provinsi...">
        </div>
        <div class="search-input-group">
          <select id="search-category">
            <option value="">Semua Kategori</option>
            <option value="Teknologi Informasi">Teknologi Informasi</option>
            <option value="Desain Kreatif">Desain Kreatif</option>
            <option value="Pemasaran & Penjualan">Pemasaran & Penjualan</option>
            <option value="Penulisan & Konten">Penulisan & Konten</option>
            <option value="Keuangan & Akuntansi">Keuangan & Akuntansi</option>
          </select>
        </div>
        <button id="btn-search" class="search-btn">Cari</button>
      </div>
    </div>

    <div class="job-portal-layout">
      <div class="job-list-pane" id="job-list-container">
        <!-- Rendered jobs list -->
      </div>
      <div class="job-detail-pane" id="job-detail-container">
        <div class="no-data">Pilih salah satu lowongan pekerjaan di sebelah kiri untuk melihat detail.</div>
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
  if (jobsState.length === 0) {
    container.innerHTML = '<div class="no-data">Tidak ada lowongan pekerjaan ditemukan.</div>';
    document.getElementById('job-detail-container').innerHTML = '<div class="no-data">Pilih lowongan kerja.</div>';
    return;
  }

  container.innerHTML = jobsState.map(job => `
    <div class="job-card ${job.id === selectedJobId ? 'selected' : ''}" onclick="selectJob('${job.id}')">
      <div class="job-card-header">
        <div>
          <h3 class="job-title">${job.title}</h3>
          <p class="job-company">${job.company}</p>
        </div>
      </div>
      <div class="job-meta-tags">
        <span class="tag tag-type">${job.type}</span>
        <span class="tag tag-location">${job.location}</span>
        ${job.salary ? `<span class="tag tag-salary">${job.salary}</span>` : ''}
      </div>
    </div>
  `).join('');

  // If a job is already selected, make sure details are shown
  if (selectedJobId) {
    renderJobDetails();
  } else if (jobsState.length > 0) {
    // Proactively select the first job
    selectJob(jobsState[0].id);
  }
}

window.selectJob = function(id) {
  selectedJobId = id;
  // Update class of elements
  const cards = document.querySelectorAll('.job-card');
  cards.forEach(card => card.classList.remove('selected'));
  
  // Find which card is clicked
  const activeCard = Array.from(cards).find(card => card.getAttribute('onclick').includes(id));
  if (activeCard) activeCard.classList.add('selected');

  renderJobDetails();
};

function renderJobDetails() {
  const detailPane = document.getElementById('job-detail-container');
  const job = jobsState.find(j => j.id === selectedJobId);
  if (!job) {
    detailPane.innerHTML = '<div class="no-data">Lowongan tidak ditemukan.</div>';
    return;
  }

  // Format date helper
  const dateFormatted = new Date(parseInt(job.createdAt) ? parseInt(job.createdAt) : job.createdAt).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  detailPane.innerHTML = `
    <div class="detail-header">
      <h2 class="detail-title">${job.title}</h2>
      <p class="detail-company">${job.company}</p>
      
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
            <p class="meta-item-value">${job.salary || 'Tidak ditampilkan'}</p>
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
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <div>
            <p class="meta-item-label">Diposting Pada</p>
            <p class="meta-item-value">${dateFormatted}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-body">
      <h3 class="detail-section-title">Deskripsi Pekerjaan</h3>
      <div class="detail-description">${job.description}</div>
    </div>

    <div class="apply-action-bar">
      <button class="btn btn-primary" onclick="openApplyModal('${job.id}')">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        Lamar Pekerjaan Ini
      </button>
    </div>
  `;
}

window.openApplyModal = function(jobId) {
  document.getElementById('apply-job-id').value = jobId;
  document.getElementById('apply-job-form').reset();
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
      <!-- Section 1: Post New Job -->
      <div class="card">
        <h2 class="card-title">Posting Lowongan Pekerjaan Baru</h2>
        <form id="create-job-form">
          <div class="form-row">
            <div class="form-group">
              <label for="job-title">Nama Jabatan / Posisi</label>
              <input type="text" id="job-title" placeholder="Misal: Senior React Developer" required>
            </div>
            <div class="form-group">
              <label for="job-company">Nama Perusahaan</label>
              <input type="text" id="job-company" placeholder="Misal: PT Teknologi Indonesia" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="job-location">Lokasi</label>
              <input type="text" id="job-location" placeholder="Misal: Jakarta Selatan, Indonesia" required>
            </div>
            <div class="form-group">
              <label for="job-salary">Gaji Per Bulan (Opsional)</label>
              <input type="text" id="job-salary" placeholder="Misal: Rp 15.000.000 - Rp 20.000.000">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="job-category-input">Kategori Bidang</label>
              <select id="job-category-input" required>
                <option value="Teknologi Informasi">Teknologi Informasi</option>
                <option value="Desain Kreatif">Desain Kreatif</option>
                <option value="Pemasaran & Penjualan">Pemasaran & Penjualan</option>
                <option value="Penulisan & Konten">Penulisan & Konten</option>
                <option value="Keuangan & Akuntansi">Keuangan & Akuntansi</option>
              </select>
            </div>
            <div class="form-group">
              <label for="job-type-input">Tipe Lowongan</label>
              <select id="job-type-input" required>
                <option value="Full-time">Full-time (Penuh Waktu)</option>
                <option value="Part-time">Part-time (Paruh Waktu)</option>
                <option value="Remote">Remote (Kerja Jarak Jauh)</option>
                <option value="Contract">Kontrak</option>
                <option value="Internship">Magang</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="job-description">Deskripsi Pekerjaan & Persyaratan</label>
            <textarea id="job-description" rows="6" placeholder="Tuliskan detail pekerjaan, tugas, kualifikasi pelamar..." required></textarea>
          </div>
          <button type="submit" class="btn btn-primary">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
            Posting Lowongan Kerja
          </button>
        </form>
      </div>

      <!-- Section 2: Manage Applications -->
      <div class="card">
        <h2 class="card-title">Daftar Pelamar Pekerjaan</h2>
        <div class="form-group" style="max-width: 300px;">
          <label for="filter-job-id">Filter Berdasarkan Lowongan</label>
          <select id="filter-job-id">
            <option value="">Semua Lowongan</option>
          </select>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Nama Pelamar</th>
                <th>Email</th>
                <th>Lowongan Yang Dilamar</th>
                <th>Resume</th>
                <th>Tanggal Melamar</th>
                <th>Status</th>
                <th>Kelola Aksi</th>
              </tr>
            </thead>
            <tbody id="applicants-list-body">
              <!-- Rendered applicants list -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Bind Form Create Job
  document.getElementById('create-job-form').addEventListener('submit', createNewJob);
  // Bind Filter Jobs
  document.getElementById('filter-job-id').addEventListener('change', fetchAndRenderApplicants);

  // Load drop down job options and applicants list
  await fetchJobsDropdown();
  await fetchAndRenderApplicants();
}

async function fetchJobsDropdown() {
  const query = `
    query {
      jobs {
        id
        title
        company
      }
    }
  `;
  try {
    const data = await graphqlRequest(query);
    const filterSelect = document.getElementById('filter-job-id');
    filterSelect.innerHTML = '<option value="">Semua Lowongan</option>' + data.jobs.map(job => `
      <option value="${job.id}">${job.title} - ${job.company}</option>
    `).join('');
  } catch (err) {}
}

async function fetchAndRenderApplicants() {
  const jobId = document.getElementById('filter-job-id').value;
  const variables = jobId ? { jobId: jobId } : {};

  const query = `
    query GetApplications($jobId: ID) {
      applications(jobId: $jobId) {
        id
        applicantName
        applicantEmail
        resumeUrl
        status
        appliedAt
        job {
          title
          company
        }
      }
    }
  `;

  try {
    const data = await graphqlRequest(query, variables);
    const tbody = document.getElementById('applicants-list-body');
    
    if (data.applications.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="no-data">Belum ada pelamar kerja yang mendaftar.</td></tr>';
      return;
    }

    tbody.innerHTML = data.applications.map(app => {
      const date = new Date(parseInt(app.appliedAt) ? parseInt(app.appliedAt) : app.appliedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return `
        <tr>
          <td><strong>${app.applicantName}</strong></td>
          <td>${app.applicantEmail}</td>
          <td>${app.job ? `${app.job.title} <br><span style="font-size:0.8rem;color:var(--text-secondary)">${app.job.company}</span>` : 'Pekerjaan Telah Dihapus'}</td>
          <td><a href="${app.resumeUrl}" target="_blank" class="tag tag-type" style="text-decoration:none;">Buka Resume</a></td>
          <td>${date}</td>
          <td><span class="badge badge-${app.status.toLowerCase()}">${app.status}</span></td>
          <td>
            <div class="action-buttons">
              <button class="action-btn action-btn-interview" onclick="updateStatus('${app.id}', 'Interview')">Interview</button>
              <button class="action-btn action-btn-accept" onclick="updateStatus('${app.id}', 'Accepted')">Accept</button>
              <button class="action-btn action-btn-reject" onclick="updateStatus('${app.id}', 'Rejected')">Reject</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {}
}

async function createNewJob(e) {
  e.preventDefault();
  const title = document.getElementById('job-title').value;
  const company = document.getElementById('job-company').value;
  const location = document.getElementById('job-location').value;
  const salary = document.getElementById('job-salary').value;
  const category = document.getElementById('job-category-input').value;
  const type = document.getElementById('job-type-input').value;
  const description = document.getElementById('job-description').value;

  const mutation = `
    mutation CreateJob($input: JobInput!) {
      createJob(input: $input) {
        id
        title
        company
      }
    }
  `;

  try {
    await graphqlRequest(mutation, {
      input: { title, company, description, location, salary, category, type }
    });
    alert('Lowongan pekerjaan baru berhasil ditambahkan!');
    document.getElementById('create-job-form').reset();
    // Reload drop downs and applicants
    await fetchJobsDropdown();
    await fetchAndRenderApplicants();
  } catch (err) {
    alert(`Gagal memposting lowongan kerja: ${err.message}`);
  }
}

window.updateStatus = async function(appId, status) {
  const mutation = `
    mutation UpdateStatus($id: ID!, $status: String!) {
      updateApplicationStatus(id: $id, status: $status) {
        id
        status
      }
    }
  `;

  try {
    await graphqlRequest(mutation, { id: appId, status });
    alert(`Status lamaran berhasil diubah menjadi ${status}`);
    await fetchAndRenderApplicants();
  } catch (err) {
    alert(`Gagal memperbarui status: ${err.message}`);
  }
};
