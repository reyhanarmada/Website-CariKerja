import pool from '../db/connection.js';

export const applicationResolvers = {
  Query: {
    applications: async (_, { jobId }, { token }) => {
      // If jobId is provided, query only that jobId
      if (jobId) {
        try {
          const { rows } = await pool.query('SELECT * FROM applications WHERE job_id = $1 ORDER BY applied_at DESC', [jobId]);
          return rows.map((row) => ({
            id: row.id.toString(),
            jobId: row.job_id.toString(),
            applicantName: row.applicant_name,
            applicantEmail: row.applicant_email,
            resumeUrl: row.resume_url,
            status: row.status,
            feedbackMessage: row.feedback_message || null,
            interviewDate: row.interview_date || null,
            interviewTime: row.interview_time || null,
            appliedAt: row.applied_at.toISOString(),
          }));
        } catch (err) {
          console.error('Error fetching applications by jobId:', err);
          throw new Error('Gagal mengambil data pelamar.');
        }
      }

      // If jobId is not provided, fetch the recruiter's jobs from job-service using the token
      if (!token) {
        throw new Error('Anda harus login terlebih dahulu.');
      }

      try {
        const myJobsRes = await fetch('http://job-service:4002/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            query: `
              query {
                myJobs {
                  id
                }
              }
            `
          })
        });
        const myJobsJson = await myJobsRes.json();
        
        // If there's an error or no jobs, return empty list
        if (myJobsJson.errors || !myJobsJson.data || !myJobsJson.data.myJobs || myJobsJson.data.myJobs.length === 0) {
          return [];
        }

        const jobIds = myJobsJson.data.myJobs.map((job) => parseInt(job.id));
        
        // Query applications where job_id IN (jobIds)
        const { rows } = await pool.query(
          `SELECT * FROM applications WHERE job_id = ANY($1) ORDER BY applied_at DESC`,
          [jobIds]
        );
        return rows.map((row) => ({
          id: row.id.toString(),
          jobId: row.job_id.toString(),
          applicantName: row.applicant_name,
          applicantEmail: row.applicant_email,
          resumeUrl: row.resume_url,
          status: row.status,
          feedbackMessage: row.feedback_message || null,
          interviewDate: row.interview_date || null,
          interviewTime: row.interview_time || null,
          appliedAt: row.applied_at.toISOString(),
        }));
      } catch (err) {
        console.error('Error fetching applications for my jobs:', err);
        throw new Error('Gagal mengambil data pelamar.');
      }
    },
    myApplications: async (_, __, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      try {
        const { rows } = await pool.query(
          'SELECT * FROM applications WHERE applicant_email = $1 ORDER BY applied_at DESC',
          [user.email]
        );
        return rows.map((row) => ({
          id: row.id.toString(),
          jobId: row.job_id.toString(),
          applicantName: row.applicant_name,
          applicantEmail: row.applicant_email,
          resumeUrl: row.resume_url,
          status: row.status,
          feedbackMessage: row.feedback_message || null,
          interviewDate: row.interview_date || null,
          interviewTime: row.interview_time || null,
          appliedAt: row.applied_at.toISOString(),
        }));
      } catch (err) {
        console.error('Error fetching my applications:', err);
        throw new Error('Gagal mengambil riwayat lamaran Anda.');
      }
    },
    applicationCount: async (_, { jobId }) => {
      try {
        const { rows } = await pool.query(
          'SELECT COUNT(*) AS count FROM applications WHERE job_id = $1',
          [jobId]
        );
        return parseInt(rows[0].count, 10);
      } catch (err) {
        console.error('Error counting applications:', err);
        throw new Error('Gagal menghitung jumlah pelamar.');
      }
    },
    getMessages: async (_, { jobId, userId }, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      try {
        const currentUserId = parseInt(user.id, 10);
        const targetUserId = parseInt(userId, 10);
        const parsedJobId = parseInt(jobId, 10);

        const { rows } = await pool.query(
          `SELECT * FROM messages 
           WHERE job_id = $1 
             AND ((sender_id = $2 AND receiver_id = $3) OR (sender_id = $3 AND receiver_id = $2))
           ORDER BY created_at ASC`,
          [parsedJobId, currentUserId, targetUserId]
        );

        return rows.map((row) => ({
          id: row.id.toString(),
          senderId: row.sender_id.toString(),
          receiverId: row.receiver_id.toString(),
          jobId: row.job_id.toString(),
          content: row.content,
          createdAt: row.created_at.toISOString(),
        }));
      } catch (err) {
        console.error('Error fetching messages:', err);
        throw new Error('Gagal mengambil riwayat pesan.');
      }
    },
    getDailyStats: async (_, __, { token }) => {
      if (!token) {
        return [];
      }
      try {
        // Get recruiter's job list first
        const myJobsRes = await fetch('http://job-service:4002/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            query: `
              query {
                myJobs {
                  id
                }
              }
            `
          })
        });
        const myJobsJson = await myJobsRes.json();
        if (myJobsJson.errors || !myJobsJson.data || !myJobsJson.data.myJobs || myJobsJson.data.myJobs.length === 0) {
          // If recruiter has no jobs, return all zero daily stats
          return Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return {
              date: d.toISOString().split('T')[0],
              views: 0,
              applications: 0
            };
          });
        }

        const jobIds = myJobsJson.data.myJobs.map((job) => parseInt(job.id, 10));

        // Query application count grouped by day for last 7 days
        const { rows } = await pool.query(
          `SELECT DATE(applied_at) AS date, COUNT(*) AS count 
           FROM applications 
           WHERE job_id = ANY($1) 
             AND applied_at >= NOW() - INTERVAL '7 days' 
           GROUP BY DATE(applied_at)`,
          [jobIds]
        );

        const countMap = {};
        rows.forEach(r => {
          const dateStr = r.date instanceof Date ? r.date.toISOString().split('T')[0] : r.date.toString().split('T')[0];
          countMap[dateStr] = parseInt(r.count, 10);
        });

        const stats = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dateStr = d.toISOString().split('T')[0];
          return {
            date: dateStr,
            views: 0,
            applications: countMap[dateStr] || 0
          };
        });

        return stats;
      } catch (err) {
        console.error('Error in getDailyStats resolver:', err);
        return [];
      }
    },
    getRecruiterMessages: async (_, __, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      try {
        const currentUserId = parseInt(user.id, 10);
        const { rows } = await pool.query(
          `SELECT * FROM messages 
           WHERE receiver_id = $1 
           ORDER BY created_at DESC 
           LIMIT 10`,
          [currentUserId]
        );

        if (rows.length === 0) return [];

        // Get unique sender IDs and look up their names from auth-service
        const senderIds = [...new Set(rows.map(r => r.sender_id))];
        const senderNameMap = {};

        await Promise.all(senderIds.map(async (senderId) => {
          try {
            const res = await fetch('http://auth-service:4001/graphql', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `
                  query GetUserById($id: ID!) {
                    userById(id: $id) {
                      id
                      name
                    }
                  }
                `,
                variables: { id: senderId.toString() }
              })
            });
            const json = await res.json();
            if (json.data?.userById?.name) {
              senderNameMap[senderId] = json.data.userById.name;
            }
          } catch (err) {
            console.error(`Failed to fetch name for sender ${senderId}:`, err);
          }
        }));

        return rows.map((row) => ({
          id: row.id.toString(),
          senderId: row.sender_id.toString(),
          receiverId: row.receiver_id.toString(),
          jobId: row.job_id.toString(),
          content: row.content,
          createdAt: row.created_at.toISOString(),
          senderName: senderNameMap[row.sender_id] || null,
        }));
      } catch (err) {
        console.error('Error fetching recruiter messages:', err);
        return [];
      }
    },
  },
  Mutation: {
    applyJob: async (_, { input }) => {
      const { jobId, applicantName, applicantEmail, resumeUrl } = input;
      try {
        // Cek apakah lowongan kerja ada di job-service
        const jobCheckRes = await fetch('http://job-service:4002/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query GetJob($id: ID!) {
                job(id: $id) {
                  id
                  status
                }
              }
            `,
            variables: { id: jobId.toString() },
          }),
        });
        const jobCheckJson = await jobCheckRes.json();
        if (jobCheckJson.errors || !jobCheckJson.data || !jobCheckJson.data.job) {
          throw new Error('Lowongan pekerjaan tidak ditemukan.');
        }

        const job = jobCheckJson.data.job;
        const jobStatus = job.status || 'Available';
        if (jobStatus.toLowerCase() === 'closed' || jobStatus.toLowerCase() === 'full' || jobStatus.toLowerCase() === 'penuh') {
          throw new Error('Lowongan ini sudah penuh atau ditutup. Lamaran tidak dapat diproses.');
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
          feedbackMessage: null,
          interviewDate: null,
          interviewTime: null,
          appliedAt: row.applied_at.toISOString(),
        };
      } catch (err) {
        console.error('Error applying job:', err);
        throw new Error(err.message || 'Gagal mengirimkan lamaran pekerjaan.');
      }
    },
    updateApplicationStatus: async (_, { id, status, message, interviewDate, interviewTime }) => {
      const validStatuses = ['Pending', 'Interview', 'Rejected', 'Accepted'];
      if (!validStatuses.includes(status)) {
        throw new Error('Status lamaran tidak valid.');
      }

      try {
        const queryText = `
          UPDATE applications
          SET status = $1, feedback_message = $2, interview_date = $3, interview_time = $4
          WHERE id = $5
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [
          status,
          message || null,
          interviewDate || null,
          interviewTime || null,
          id
        ]);
        if (rows.length === 0) {
          throw new Error('Data lamaran tidak ditemukan.');
        }
        const row = rows[0];

        // Trigger system notification for applicant asynchronously
        try {
          const jobRes = await fetch('http://job-service:4002/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                query GetJob($id: ID!) {
                  job(id: $id) {
                    title
                    company
                  }
                }
              `,
              variables: { id: row.job_id.toString() }
            })
          });
          const jobJson = await jobRes.json();
          const jobTitle = jobJson.data?.job?.title || 'pekerjaan';
          const companyName = jobJson.data?.job?.company || 'perusahaan';

          let statusStr = status === 'Accepted' ? 'Diterima (ACC) ✅' : (status === 'Rejected' ? 'Ditolak ❌' : status);
          let notifMessage = `Lamaran Anda untuk posisi "${jobTitle}" di ${companyName} telah diperbarui menjadi: ${statusStr}.`;
          
          if (status === 'Accepted' && interviewDate && interviewTime) {
            notifMessage += ` Jadwal Interview: ${interviewDate} pukul ${interviewTime}.`;
          }
          if (message && message.trim()) {
            notifMessage += ` Pesan dari Rekruter: "${message.trim()}"`;
          }

          await fetch('http://auth-service:4001/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `
                mutation CreateNotif($email: String!, $message: String!) {
                  createNotificationByEmail(email: $email, message: $message) {
                    id
                  }
                }
              `,
              variables: {
                email: row.applicant_email,
                message: notifMessage
              }
            })
          });
        } catch (notifErr) {
          console.error('Failed to trigger notification:', notifErr);
        }

        return {
          id: row.id.toString(),
          jobId: row.job_id.toString(),
          applicantName: row.applicant_name,
          applicantEmail: row.applicant_email,
          resumeUrl: row.resume_url,
          status: row.status,
          feedbackMessage: row.feedback_message || null,
          interviewDate: row.interview_date || null,
          interviewTime: row.interview_time || null,
          appliedAt: row.applied_at.toISOString(),
        };
      } catch (err) {
        console.error('Error updating application status:', err);
        throw new Error(err.message || 'Gagal memperbarui status lamaran.');
      }
    },
    sendMessage: async (_, { jobId, receiverId, content }, { user }) => {
      if (!user) {
        throw new Error('Anda harus login terlebih dahulu.');
      }
      if (!content || !content.trim()) {
        throw new Error('Pesan tidak boleh kosong.');
      }
      try {
        const senderId = parseInt(user.id, 10);
        const parsedReceiverId = parseInt(receiverId, 10);
        const parsedJobId = parseInt(jobId, 10);

        const queryText = `
          INSERT INTO messages (sender_id, receiver_id, job_id, content)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [senderId, parsedReceiverId, parsedJobId, content.trim()]);
        const row = rows[0];

        return {
          id: row.id.toString(),
          senderId: row.sender_id.toString(),
          receiverId: row.receiver_id.toString(),
          jobId: row.job_id.toString(),
          content: row.content,
          createdAt: row.created_at.toISOString(),
        };
      } catch (err) {
        console.error('Error in sendMessage:', err);
        throw new Error('Gagal mengirim pesan.');
      }
    },
  },
  Application: {
    job: (parent) => {
      return { __typename: 'Job', id: parent.jobId };
    },
    applicantId: async (parent) => {
      try {
        const res = await fetch('http://auth-service:4001/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              query GetProfile($email: String!) {
                profileByEmail(email: $email) {
                  userId
                }
              }
            `,
            variables: { email: parent.applicantEmail }
          })
        });
        const json = await res.json();
        return json.data?.profileByEmail?.userId || null;
      } catch (err) {
        console.error('Error fetching applicant ID:', err);
        return null;
      }
    }
  },
};
