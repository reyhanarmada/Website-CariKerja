import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'interviews_db',
});

const mapInterview = (row) => ({
  id: row.id.toString(),
  applicationId: row.application_id,
  jobId: row.job_id,
  recruiterId: row.recruiter_id,
  applicantId: row.applicant_id,
  interviewDate: row.interview_date.toISOString().split('T')[0],
  interviewTime: row.interview_time,
  meetingLink: row.meeting_link,
  status: row.status,
  notes: row.notes,
  createdAt: row.created_at.toISOString(),
});

export const interviewResolvers = {
  Query: {
    getInterview: async (_, { id }) => {
      const { rows } = await pool.query('SELECT * FROM interview_schedules WHERE id = $1', [id]);
      if (rows.length === 0) return null;
      return mapInterview(rows[0]);
    },
    getInterviewsByJob: async (_, { jobId }, context) => {
      if (!context.user || context.user.role !== 'recruiter') throw new Error('Not authenticated as recruiter');
      const { rows } = await pool.query('SELECT * FROM interview_schedules WHERE job_id = $1 AND recruiter_id = $2', [jobId, context.user.userId]);
      return rows.map(mapInterview);
    },
    myInterviews: async (_, __, context) => {
      if (!context.user) throw new Error('Not authenticated');
      let query = '';
      if (context.user.role === 'seeker') {
        query = 'SELECT * FROM interview_schedules WHERE applicant_id = $1 ORDER BY interview_date ASC';
      } else {
        query = 'SELECT * FROM interview_schedules WHERE recruiter_id = $1 ORDER BY interview_date ASC';
      }
      const { rows } = await pool.query(query, [context.user.userId]);
      return rows.map(mapInterview);
    },
  },
  Mutation: {
    scheduleInterview: async (_, args, context) => {
      if (!context.user || context.user.role !== 'recruiter') {
        throw new Error('Only recruiters can schedule interviews');
      }

      const { applicationId, jobId, applicantId, interviewDate, interviewTime, meetingLink, notes } = args;
      const recruiterId = context.user.userId;

      try {
        const { rows } = await pool.query(
          `INSERT INTO interview_schedules (application_id, job_id, recruiter_id, applicant_id, interview_date, interview_time, meeting_link, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [applicationId, jobId, recruiterId, applicantId, interviewDate, interviewTime, meetingLink, notes]
        );
        return mapInterview(rows[0]);
      } catch (err) {
        console.error(err);
        throw new Error('Failed to schedule interview');
      }
    },
    updateInterviewStatus: async (_, { id, status }, context) => {
      if (!context.user) throw new Error('Not authenticated');
      try {
        const { rows } = await pool.query(
          `UPDATE interview_schedules SET status = $1 WHERE id = $2 RETURNING *`,
          [status, id]
        );
        return mapInterview(rows[0]);
      } catch (err) {
        console.error(err);
        throw new Error('Failed to update interview status');
      }
    }
  }
};
