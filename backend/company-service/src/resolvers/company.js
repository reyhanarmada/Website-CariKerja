import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'companies_db',
});

const mapCompany = (row) => ({
  id: row.id.toString(),
  recruiterId: row.recruiter_id,
  companyName: row.company_name,
  description: row.description,
  industry: row.industry,
  location: row.location,
  websiteUrl: row.website_url,
  logoUrl: row.logo_url,
  cultureDescription: row.culture_description,
  createdAt: row.created_at.toISOString(),
});

const mapReview = (row) => ({
  id: row.id.toString(),
  companyId: row.company_id,
  reviewerId: row.reviewer_id,
  rating: row.rating,
  reviewText: row.review_text,
  createdAt: row.created_at.toISOString(),
});

export const companyResolvers = {
  Query: {
    getCompany: async (_, { id }) => {
      const { rows } = await pool.query('SELECT * FROM company_profiles WHERE id = $1', [id]);
      if (rows.length === 0) return null;
      return mapCompany(rows[0]);
    },
    getAllCompanies: async () => {
      const { rows } = await pool.query('SELECT * FROM company_profiles');
      return rows.map(mapCompany);
    },
    myCompanyProfile: async (_, __, context) => {
      if (!context.user) throw new Error('Not authenticated');
      const { rows } = await pool.query('SELECT * FROM company_profiles WHERE recruiter_id = $1', [context.user.userId]);
      if (rows.length === 0) return null;
      return mapCompany(rows[0]);
    },
  },
  Mutation: {
    updateCompanyProfile: async (_, args, context) => {
      if (!context.user || context.user.role !== 'recruiter') {
        throw new Error('Only recruiters can update company profiles');
      }

      const { companyName, description, industry, location, websiteUrl, logoUrl, cultureDescription } = args;
      const recruiterId = context.user.userId;

      try {
        const { rows } = await pool.query(
          `INSERT INTO company_profiles (recruiter_id, company_name, description, industry, location, website_url, logo_url, culture_description)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (recruiter_id) DO UPDATE SET
             company_name = EXCLUDED.company_name,
             description = EXCLUDED.description,
             industry = EXCLUDED.industry,
             location = EXCLUDED.location,
             website_url = EXCLUDED.website_url,
             logo_url = EXCLUDED.logo_url,
             culture_description = EXCLUDED.culture_description
           RETURNING *`,
          [recruiterId, companyName, description, industry, location, websiteUrl, logoUrl, cultureDescription]
        );
        return mapCompany(rows[0]);
      } catch (err) {
        console.error(err);
        throw new Error('Failed to update company profile');
      }
    },
    addCompanyReview: async (_, args, context) => {
      if (!context.user || context.user.role !== 'seeker') {
        throw new Error('Only seekers can add reviews');
      }

      const { companyId, rating, reviewText } = args;
      try {
        const { rows } = await pool.query(
          `INSERT INTO company_reviews (company_id, reviewer_id, rating, review_text) VALUES ($1, $2, $3, $4) RETURNING *`,
          [companyId, context.user.userId, rating, reviewText]
        );
        return mapReview(rows[0]);
      } catch (err) {
        console.error(err);
        throw new Error('Failed to add review');
      }
    }
  },
  CompanyProfile: {
    reviews: async (parent) => {
      const { rows } = await pool.query('SELECT * FROM company_reviews WHERE company_id = $1', [parent.id]);
      return rows.map(mapReview);
    }
  }
};
