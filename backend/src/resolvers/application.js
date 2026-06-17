import pool from '../db/connection.js';

export const applicationResolvers = {
  Query: {
    applications: async (_, { jobId }) => {
      let queryText = 'SELECT * FROM applications';
      const params = [];
      if (jobId) {
        queryText += ' WHERE job_id = $1';
        params.push(jobId);
      }
      queryText += ' ORDER BY applied_at DESC';

      try {
        const { rows } = await pool.query(queryText, params);
        return rows.map((row) => ({
          id: row.id.toString(),
          jobId: row.job_id.toString(),
          applicantName: row.applicant_name,
          applicantEmail: row.applicant_email,
          resumeUrl: row.resume_url,
          status: row.status,
          appliedAt: row.applied_at.toISOString(),
        }));
      } catch (err) {
        console.error('Error fetching applications:', err);
        throw new Error('Gagal mengambil data pelamar.');
      }
    },
  },
  Mutation: {
    applyJob: async (_, { input }) => {
      const { jobId, applicantName, applicantEmail, resumeUrl } = input;
      try {
        // Cek duplicate
        const { rows: existingApps } = await pool.query(
          'SELECT id FROM applications WHERE job_id = $1 AND applicant_email = $2',
          [jobId, applicantEmail]
        );
        if (existingApps.length > 0) {
          throw new Error('Anda sudah mengirimkan lamaran untuk pekerjaan ini.');
        }
        // Cek apakah lowongan kerja ada
        const jobCheck = await pool.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
        if (jobCheck.rows.length === 0) {
          throw new Error('Lowongan pekerjaan tidak ditemukan.');
        }

        const queryText = `
          INSERT INTO applications (job_id, applicant_name, applicant_email, resume_url)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [jobId, applicantName, applicantEmail, resumeUrl]);
        const row = rows[0];
        return {
          id: row.id.toString(),
          jobId: row.job_id.toString(),
          applicantName: row.applicant_name,
          applicantEmail: row.applicant_email,
          resumeUrl: row.resume_url,
          status: row.status,
          appliedAt: row.applied_at.toISOString(),
        };
      } catch (err) {
        console.error('Error applying job:', err);
        throw new Error(err.message || 'Gagal mengirimkan lamaran pekerjaan.');
      }
    },
    updateApplicationStatus: async (_, { id, status }) => {
      const validStatuses = ['Pending', 'Interview', 'Rejected', 'Accepted'];
      if (!validStatuses.includes(status)) {
        throw new Error('Status lamaran tidak valid.');
      }

      try {
        const queryText = `
          UPDATE applications
          SET status = $1
          WHERE id = $2
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [status, id]);
        if (rows.length === 0) {
          throw new Error('Data lamaran tidak ditemukan.');
        }
        const row = rows[0];
        return {
          id: row.id.toString(),
          jobId: row.job_id.toString(),
          applicantName: row.applicant_name,
          applicantEmail: row.applicant_email,
          resumeUrl: row.resume_url,
          status: row.status,
          appliedAt: row.applied_at.toISOString(),
        };
      } catch (err) {
        console.error('Error updating application status:', err);
        throw new Error(err.message || 'Gagal memperbarui status lamaran.');
      }
    },
    deleteApplication: async (_, { id }, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      try {
        const { rows } = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
        if (rows.length === 0) {
          throw new Error('Data lamaran tidak ditemukan.');
        }
        const app = rows[0];
        if (app.applicant_email !== user.email) {
          throw new Error('Anda tidak memiliki akses untuk menghapus lamaran ini.');
        }
        const statusLower = app.status.toLowerCase();
        const isFinalized = statusLower === 'rejected' || statusLower === 'accepted' || statusLower === 'acc' || statusLower === 'diterima' || statusLower === 'ditolak';
        if (!isFinalized) {
          throw new Error('Hanya lamaran dengan status Diterima atau Ditolak yang dapat dihapus.');
        }
        await pool.query('DELETE FROM applications WHERE id = $1', [id]);
        return true;
      } catch (err) {
        console.error('Error deleting application:', err);
        throw new Error(err.message || 'Gagal menghapus lamaran.');
      }
    },
  },
  Application: {
    job: async (parent) => {
      try {
        const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [parent.jobId]);
        if (rows.length === 0) return null;
        const row = rows[0];
        return {
          id: row.id.toString(),
          title: row.title,
          company: row.company,
          description: row.description,
          location: row.location,
          salary: row.salary,
          category: row.category,
          type: row.type,
          createdAt: row.created_at.toISOString(),
        };
      } catch (err) {
        console.error('Error fetching parent job relationship:', err);
        return null;
      }
    },
  },
};
