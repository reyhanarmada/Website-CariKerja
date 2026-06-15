import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'profiles_db',
});

// Helper to map DB row to GraphQL type
const mapProfile = (row) => ({
  id: row.id.toString(),
  userId: row.user_id,
  bio: row.bio,
  education: row.education,
  experience: row.experience,
  skills: row.skills,
  resumeUrl: row.resume_url,
  portfolioUrl: row.portfolio_url,
  updatedAt: row.updated_at.toISOString(),
});

export const profileResolvers = {
  Query: {
    getProfileByUserId: async (_, { userId }) => {
      try {
        const { rows } = await pool.query('SELECT * FROM seeker_profiles WHERE user_id = $1', [userId]);
        if (rows.length === 0) return null;
        return mapProfile(rows[0]);
      } catch (err) {
        console.error('Error fetching profile:', err);
        throw new Error('Failed to fetch profile');
      }
    },
    mySeekerProfile: async (_, __, context) => {
      if (!context.user) throw new Error('Not authenticated');
      try {
        const { rows } = await pool.query('SELECT * FROM seeker_profiles WHERE user_id = $1', [context.user.userId]);
        if (rows.length === 0) return null;
        return mapProfile(rows[0]);
      } catch (err) {
        console.error('Error fetching my profile:', err);
        throw new Error('Failed to fetch profile');
      }
    },
  },
  Mutation: {
    updateSeekerProfile: async (_, args, context) => {
      if (!context.user) throw new Error('Not authenticated');
      if (context.user.role !== 'seeker') throw new Error('Only seekers can update their profile');

      const { bio, education, experience, skills, resumeUrl, portfolioUrl } = args;
      const userId = context.user.userId;

      try {
        // Upsert logic
        const { rows } = await pool.query(
          `INSERT INTO seeker_profiles (user_id, bio, education, experience, skills, resume_url, portfolio_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id) DO UPDATE SET
             bio = EXCLUDED.bio,
             education = EXCLUDED.education,
             experience = EXCLUDED.experience,
             skills = EXCLUDED.skills,
             resume_url = EXCLUDED.resume_url,
             portfolio_url = EXCLUDED.portfolio_url,
             updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [userId, bio, education, experience, skills, resumeUrl, portfolioUrl]
        );
        return mapProfile(rows[0]);
      } catch (err) {
        console.error('Error updating profile:', err);
        throw new Error('Failed to update profile');
      }
    },
  },
};
