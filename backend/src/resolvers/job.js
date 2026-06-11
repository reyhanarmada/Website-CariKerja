import pool from '../db/connection.js';

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
        return rows.map((row) => ({
          id: row.id.toString(),
          title: row.title,
          company: row.company,
          description: row.description,
          location: row.location,
          salary: row.salary,
          category: row.category,
          type: row.type,
          createdAt: row.created_at.toISOString(),
        }));
      } catch (err) {
        console.error('Error fetching jobs:', err);
        throw new Error('Gagal mengambil data lowongan pekerjaan.');
      }
    },
    job: async (_, { id }) => {
      try {
        const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
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
        console.error('Error fetching job detail:', err);
        throw new Error('Gagal mengambil detail lowongan pekerjaan.');
      }
    },
  },
  Mutation: {
    createJob: async (_, { input }) => {
      const { title, company, description, location, salary, category, type } = input;
      try {
        const queryText = `
          INSERT INTO jobs (title, company, description, location, salary, category, type)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [title, company, description, location, salary, category, type]);
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
        console.error('Error creating job:', err);
        throw new Error('Gagal menambahkan lowongan pekerjaan baru.');
      }
    },
  },
};
