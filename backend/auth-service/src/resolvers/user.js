import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const userResolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) return null;
      try {
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
        if (rows.length === 0) return null;
        const row = rows[0];
        return {
          id: row.id.toString(),
          name: row.name,
          email: row.email,
          role: row.role,
          companyName: row.company_name,
          logoUrl: row.logo_url,
        };
      } catch (err) {
        console.error('Error fetching current user profile:', err);
        return null;
      }
    },
    myNotifications: async (_, __, { user }) => {
      if (!user) throw new Error('Anda harus login terlebih dahulu.');
      try {
        const { rows } = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [user.id]);
        return rows.map(row => ({
          id: row.id.toString(),
          userId: row.user_id.toString(),
          message: row.message,
          isRead: row.is_read,
          createdAt: row.created_at.toISOString(),
        }));
      } catch (err) {
        console.error('Error fetching notifications:', err);
        throw new Error('Gagal mengambil data notifikasi.');
      }
    },
    myProfile: async (_, __, { user }) => {
      if (!user) throw new Error('Anda harus login terlebih dahulu.');
      try {
        const { rows: pRows } = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [user.id]);
        const { rows: uRows } = await pool.query('SELECT name, email FROM users WHERE id = $1', [user.id]);
        const uRow = uRows[0] || {};
        if (pRows.length === 0) return { userId: user.id.toString(), name: uRow.name, email: uRow.email, bio: null, pengalamanKerja: null, skill: null, portofolioUrl: null };
        const row = pRows[0];
        return {
          userId: row.user_id.toString(),
          name: uRow.name,
          email: uRow.email,
          bio: row.bio,
          pengalamanKerja: row.pengalaman_kerja,
          skill: row.skill,
          portofolioUrl: row.portofolio_url,
        };
      } catch (err) {
        console.error('Error fetching profile:', err);
        throw new Error('Gagal mengambil data profil.');
      }
    },
    profileByEmail: async (_, { email }) => {
      try {
        const { rows: uRows } = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
        if (uRows.length === 0) return null;
        const uRow = uRows[0];
        const { rows: pRows } = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [uRow.id]);
        const pRow = pRows[0] || {};
        return {
          userId: uRow.id.toString(),
          name: uRow.name,
          email: uRow.email,
          bio: pRow.bio || null,
          pengalamanKerja: pRow.pengalaman_kerja || null,
          skill: pRow.skill || null,
          portofolioUrl: pRow.portofolio_url || null,
        };
      } catch (err) {
        console.error('Error fetching profile by email:', err);
        throw new Error('Gagal mengambil data profil pelamar.');
      }
    },
    userById: async (_, { id }) => {
      try {
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [parseInt(id, 10)]);
        if (rows.length === 0) return null;
        const row = rows[0];
        return {
          id: row.id.toString(),
          name: row.name,
          email: row.email,
          role: row.role,
          companyName: row.company_name,
          logoUrl: row.logo_url,
        };
      } catch (err) {
        console.error('Error fetching user by ID:', err);
        return null;
      }
    }
  },
  Mutation: {
    register: async (_, { name, email, password, role, companyName }) => {
      // Validate role
      const validRoles = ['seeker', 'recruiter'];
      if (!validRoles.includes(role)) {
        throw new Error('Role tidak valid. Harus "seeker" atau "recruiter".');
      }

      try {
        // Check if email already registered
        const { rows: existingUsers } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUsers.length > 0) {
          throw new Error('Email sudah terdaftar.');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const queryText = `
          INSERT INTO users (name, email, password, role, company_name)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [name, email, hashedPassword, role, companyName || null]);
        const user = rows[0];

        // Generate JWT with companyName
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, name: user.name, companyName: user.company_name },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return {
          token,
          user: {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            companyName: user.company_name,
            logoUrl: user.logo_url,
          },
        };
      } catch (err) {
        console.error('Error during registration:', err);
        throw new Error(err.message || 'Gagal melakukan registrasi user.');
      }
    },

    login: async (_, { email, password }) => {
      try {
        // Find user by email
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (rows.length === 0) {
          throw new Error('Email atau password salah.');
        }

        const user = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          throw new Error('Email atau password salah.');
        }

        // Generate JWT with companyName
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, name: user.name, companyName: user.company_name },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return {
          token,
          user: {
            id: user.id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            companyName: user.company_name,
            logoUrl: user.logo_url,
          },
        };
      } catch (err) {
        console.error('Error during login:', err);
        throw new Error(err.message || 'Gagal melakukan login.');
      }
    },

    updateName: async (_, { name }, { user }) => {
      if (!user) throw new Error('Anda harus login terlebih dahulu.');
      if (!name || !name.trim()) throw new Error('Nama tidak boleh kosong.');
      try {
        const { rows } = await pool.query(
          'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
          [name.trim(), user.id]
        );
        if (rows.length === 0) throw new Error('User tidak ditemukan.');
        const u = rows[0];
        return {
          id: u.id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          companyName: u.company_name,
          logoUrl: u.logo_url,
        };
      } catch (err) {
        console.error('Error updating name:', err);
        throw new Error(err.message || 'Gagal memperbarui nama.');
      }
    },

    updateProfile: async (_, { bio, pengalamanKerja, skill, portofolioUrl }, { user }) => {
      if (!user) throw new Error('Anda harus login terlebih dahulu.');
      try {
        const checkText = 'SELECT * FROM profiles WHERE user_id = $1';
        const { rows: existing } = await pool.query(checkText, [user.id]);
        
        let queryText = '';
        let params = [];
        if (existing.length > 0) {
          queryText = `
            UPDATE profiles
            SET bio = $1, pengalaman_kerja = $2, skill = $3, portofolio_url = $4
            WHERE user_id = $5
            RETURNING *
          `;
          params = [bio, pengalamanKerja, skill, portofolioUrl, user.id];
        } else {
          queryText = `
            INSERT INTO profiles (user_id, bio, pengalaman_kerja, skill, portofolio_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          params = [user.id, bio, pengalamanKerja, skill, portofolioUrl];
        }
        
        const { rows } = await pool.query(queryText, params);
        const row = rows[0];
        return {
          userId: row.user_id.toString(),
          bio: row.bio,
          pengalamanKerja: row.pengalaman_kerja,
          skill: row.skill,
          portofolioUrl: row.portofolio_url,
        };
      } catch (err) {
        console.error('Error updating profile:', err);
        throw new Error('Gagal memperbarui profil.');
      }
    },

    markAsRead: async (_, { id }, { user }) => {
      if (!user) throw new Error('Anda harus login terlebih dahulu.');
      try {
        const { rows } = await pool.query(
          'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
          [id, user.id]
        );
        return rows.length > 0;
      } catch (err) {
        console.error('Error marking notification as read:', err);
        throw new Error('Gagal memperbarui status notifikasi.');
      }
    },

    markAllAsRead: async (_, __, { user }) => {
      if (!user) throw new Error('Anda harus login terlebih dahulu.');
      try {
        await pool.query(
          'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
          [user.id]
        );
        return true;
      } catch (err) {
        console.error('Error marking all notifications as read:', err);
        throw new Error('Gagal memperbarui semua status notifikasi.');
      }
    },

    createNotificationByEmail: async (_, { email, message }) => {
      try {
        const userQuery = 'SELECT id FROM users WHERE email = $1';
        const { rows: users } = await pool.query(userQuery, [email]);
        if (users.length === 0) {
          throw new Error('User dengan email tersebut tidak ditemukan.');
        }
        const userId = users[0].id;
        const queryText = `
          INSERT INTO notifications (user_id, message)
          VALUES ($1, $2)
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [userId, message]);
        const row = rows[0];
        return {
          id: row.id.toString(),
          userId: row.user_id.toString(),
          message: row.message,
          isRead: row.is_read,
          createdAt: row.created_at.toISOString(),
        };
      } catch (err) {
        console.error('Error creating notification by email:', err);
        throw new Error('Gagal membuat notifikasi.');
      }
    },

    updateRecruiterProfile: async (_, { name, companyName, logoUrl }, { user }) => {
      if (!user) throw new Error('Anda harus login terlebih dahulu.');
      if (user.role !== 'recruiter') throw new Error('Hanya recruiter yang dapat memperbarui profil recruiter.');
      if (!name || !name.trim()) throw new Error('Nama tidak boleh kosong.');
      if (!companyName || !companyName.trim()) throw new Error('Nama perusahaan tidak boleh kosong.');

      try {
        const { rows } = await pool.query(
          'UPDATE users SET name = $1, company_name = $2, logo_url = $3 WHERE id = $4 RETURNING *',
          [name.trim(), companyName.trim(), logoUrl ? logoUrl.trim() : null, user.id]
        );
        if (rows.length === 0) throw new Error('User tidak ditemukan.');
        const u = rows[0];
        return {
          id: u.id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          companyName: u.company_name,
          logoUrl: u.logo_url,
        };
      } catch (err) {
        console.error('Error updating recruiter profile:', err);
        throw new Error(err.message || 'Gagal memperbarui profil rekruter.');
      }
    }
  },
  User: {
    profile: async (parent) => {
      try {
        const { rows } = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [parseInt(parent.id)]);
        if (rows.length === 0) return null;
        const row = rows[0];
        return {
          userId: row.user_id.toString(),
          bio: row.bio,
          pengalamanKerja: row.pengalaman_kerja,
          skill: row.skill,
          portofolioUrl: row.portofolio_url,
        };
      } catch (err) {
        console.error('Error fetching user profile:', err);
        return null;
      }
    }
  }
};
