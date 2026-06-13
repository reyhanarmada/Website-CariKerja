import pool, { appDbPool, authDbPool } from '../db/connection.js';

const formatDate = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const mapJobRow = (row) => {
  if (!row) return null;
  return {
    id: row.id.toString(),
    title: row.title,
    company: row.company,
    description: row.description,
    location: row.location,
    salary: row.salary,
    category: row.category,
    type: row.type,
    createdAt: row.created_at ? formatDate(row.created_at) : null,
    recruiterId: row.recruiter_id ? row.recruiter_id.toString() : null,
    deadline: row.deadline ? formatDate(row.deadline) : null,
    status: row.status,
    minEducation: row.min_education,
  };
};

export const jobResolvers = {
  Query: {
    jobs: async (_, { search, location, category }) => {
      let queryText = 'SELECT * FROM jobs WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (search) {
        queryText += ` AND (title ILIKE $${paramCount} OR company ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      if (location) {
        queryText += ` AND location ILIKE $${paramCount}`;
        params.push(`%${location}%`);
        paramCount++;
      }

      if (category) {
        queryText += ` AND category = $${paramCount}`;
        params.push(category);
        paramCount++;
      }

      queryText += ' ORDER BY created_at DESC';

      try {
        const { rows } = await pool.query(queryText, params);
        return rows.map(mapJobRow);
      } catch (err) {
        console.error('Error fetching jobs:', err);
        throw new Error('Gagal mengambil data lowongan pekerjaan.');
      }
    },
    job: async (_, { id }) => {
      try {
        const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
        if (rows.length === 0) return null;
        return mapJobRow(rows[0]);
      } catch (err) {
        console.error('Error fetching job detail:', err);
        throw new Error('Gagal mengambil detail lowongan pekerjaan.');
      }
    },
    myJobs: async (_, __, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      if (user.role !== 'recruiter') {
        throw new Error('Hanya recruiter yang dapat melihat lowongan miliknya.');
      }
      try {
        const { rows } = await pool.query('SELECT * FROM jobs WHERE recruiter_id = $1 ORDER BY created_at DESC', [user.id]);
        return rows.map(mapJobRow);
      } catch (err) {
        console.error('Error fetching my jobs:', err);
        throw new Error('Gagal mengambil data lowongan pekerjaan Anda.');
      }
    },
    mySavedJobs: async (_, __, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      try {
        const { rows } = await pool.query(
          `SELECT j.* FROM jobs j 
           JOIN saved_jobs sj ON j.id = sj.job_id 
           WHERE sj.user_id = $1 
           ORDER BY sj.created_at DESC`,
          [user.id]
        );
        return rows.map(mapJobRow);
      } catch (err) {
        console.error('Error fetching saved jobs:', err);
        throw new Error('Gagal mengambil daftar lowongan tersimpan.');
      }
    }
  },
  Mutation: {
    createJob: async (_, { input }, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      if (user.role !== 'recruiter') {
        throw new Error('Hanya recruiter yang dapat memposting lowongan.');
      }

      const { title, description, location, salary, category, type, deadline, status, minEducation } = input;
      const companyName = user.companyName || 'Perusahaan Tidak Dikenal';
      const recruiterId = user.id;

      try {
        const queryText = `
          INSERT INTO jobs (title, company, description, location, salary, category, type, recruiter_id, deadline, status, min_education)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [
          title,
          companyName,
          description,
          location,
          salary,
          category,
          type,
          recruiterId,
          deadline,
          status || 'Available',
          minEducation || null
        ]);
        return mapJobRow(rows[0]);
      } catch (err) {
        console.error('Error creating job:', err);
        throw new Error(err.message || 'Gagal menambahkan lowongan pekerjaan baru.');
      }
    },
    updateJobStatus: async (_, { id, status }, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      if (user.role !== 'recruiter') {
        throw new Error('Hanya recruiter yang dapat mengubah status lowongan.');
      }

      const validStatuses = ['Available', 'Full', 'Active', 'Open', 'Closed', 'Penuh'];
      if (!validStatuses.includes(status)) {
        throw new Error('Status lowongan tidak valid.');
      }

      try {
        const queryText = `
          UPDATE jobs
          SET status = $1
          WHERE id = $2 AND recruiter_id = $3
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [status, id, user.id]);
        if (rows.length === 0) {
          throw new Error('Lowongan tidak ditemukan atau Anda tidak memiliki akses.');
        }
        return mapJobRow(rows[0]);
      } catch (err) {
        console.error('Error updating job status:', err);
        throw new Error(err.message || 'Gagal memperbarui status lowongan.');
      }
    },
    toggleSaveJob: async (_, { jobId }, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      try {
        const checkQuery = 'SELECT * FROM saved_jobs WHERE user_id = $1 AND job_id = $2';
        const { rows: existing } = await pool.query(checkQuery, [user.id, parseInt(jobId)]);
        if (existing.length > 0) {
          await pool.query('DELETE FROM saved_jobs WHERE user_id = $1 AND job_id = $2', [user.id, parseInt(jobId)]);
          return false;
        } else {
          await pool.query('INSERT INTO saved_jobs (user_id, job_id) VALUES ($1, $2)', [user.id, parseInt(jobId)]);
          return true;
        }
      } catch (err) {
        console.error('Error toggling save job:', err);
        throw new Error('Gagal menyimpan/membatalkan simpan lowongan.');
      }
    }
  },
  Job: {
    __resolveReference: async (reference) => {
      try {
        const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [reference.id]);
        if (rows.length === 0) return null;
        return mapJobRow(rows[0]);
      } catch (err) {
        console.error('Error in job reference resolver:', err);
        return null;
      }
    },
    applicantCount: async (parent) => {
      try {
        const { rows } = await appDbPool.query('SELECT COUNT(*) FROM applications WHERE job_id = $1', [parseInt(parent.id)]);
        return parseInt(rows[0].count);
      } catch (err) {
        console.error('Error in applicantCount resolver:', err);
        return 0;
      }
    },
    savedCount: async (parent) => {
      try {
        const { rows } = await pool.query('SELECT COUNT(*) FROM saved_jobs WHERE job_id = $1', [parseInt(parent.id)]);
        return parseInt(rows[0].count);
      } catch (err) {
        console.error('Error in savedCount resolver:', err);
        return 0;
      }
    },
    logoUrl: async (parent) => {
      try {
        if (!parent.recruiterId) return null;
        const { rows } = await authDbPool.query('SELECT logo_url FROM users WHERE id = $1', [parseInt(parent.recruiterId)]);
        if (rows.length === 0) return null;
        return rows[0].logo_url;
      } catch (err) {
        console.error('Error in logoUrl resolver for Job:', err);
        return null;
      }
    }
  }
};
