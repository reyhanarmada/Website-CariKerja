import pool from '../db/connection.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export const userResolvers = {
  Mutation: {
    register: async (_, { name, email, password, role }) => {
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
          INSERT INTO users (name, email, password, role)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        const { rows } = await pool.query(queryText, [name, email, hashedPassword, role]);
        const user = rows[0];

        // Generate JWT
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, name: user.name },
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

        // Generate JWT
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role, name: user.name },
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
          },
        };
      } catch (err) {
        console.error('Error during login:', err);
        throw new Error(err.message || 'Gagal melakukan login.');
      }
    },
  },
};
