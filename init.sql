-- Create separate databases inside the same PostgreSQL container
CREATE DATABASE auth_db;
CREATE DATABASE jobs_db;
CREATE DATABASE applications_db;
CREATE DATABASE profiles_db;
CREATE DATABASE companies_db;
CREATE DATABASE interviews_db;

-- ==========================================
-- 1. SETUP AUTH DATABASE
-- ==========================================
\c auth_db

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    logo_url TEXT
);

-- Seed Recruiter (password: password123, bcrypt hashed)
--INSERT INTO users (id, name, email, password, role, company_name) VALUES
--(1, 'GoTo Recruiter', 'recruiter@goto.com', '$2a$10$XOKXb0IuwTNdhXK5V.2Y8ezsppSbp.yYvY6wsHV5IYfrPSeE.aPDO', 'recruiter', 'GoTo Group')
--ON CONFLICT (email) DO NOTHING;

-- Seed Seeker (password: password123, bcrypt hashed)
--INSERT INTO users (id, name, email, password, role) VALUES
--(2, 'Aditya Pratama', 'aditya@example.com', '$2a$10$XOKXb0IuwTNdhXK5V.2Y8ezsppSbp.yYvY6wsHV5IYfrPSeE.aPDO', 'seeker')
--ON CONFLICT (email) DO NOTHING;

-- Reset sequence
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));

-- Setup Seeker Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    pengalaman_kerja TEXT,
    skill TEXT,
    portofolio_url TEXT
);

-- Setup Seeker Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. SETUP JOBS DATABASE
-- ==========================================
\c jobs_db

CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    salary VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    recruiter_id INT, -- references owner recruiter in auth_db
    deadline DATE,
    status VARCHAR(50) DEFAULT 'Available',
    min_education VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Job listings, all owned by recruiter 1
--INSERT INTO jobs (id, title, company, description, location, salary, category, type, recruiter_id, deadline, status) VALUES
--(1, 'Senior Full Stack Developer', 'GoTo Group', 'Kami sedang mencari Senior Full Stack Developer berpengalaman dengan spesialisasi Node.js dan React. Anda bertanggung jawab untuk merancang, mengembangkan, dan memelihara aplikasi berkinerja tinggi serta mengintegrasikan API dengan lancar.', 'Jakarta, Indonesia', 'Rp 20.000.000 - Rp 30.000.000', 'Teknologi Informasi', 'Full-time', 1, '2026-08-31', 'Available'),
--(2, 'UI/UX Designer', 'Bukalapak', 'Bergabunglah bersama kami sebagai UI/UX Designer untuk menciptakan antarmuka digital yang intuitif dan menyenangkan bagi jutaan pengguna di Indonesia. Anda akan merancang alur pengguna, wireframe, dan prototype interaktif.', 'Bandung, Indonesia', 'Rp 10.000.000 - Rp 15.000.000', 'Desain Kreatif', 'Full-time', 1, '2026-09-15', 'Available'),
--(3, 'Backend Engineer (Go)', 'Traveloka', 'Membangun microservices tangguh dan efisien menggunakan bahasa pemrograman Go. Pengalaman dengan PostgreSQL, Redis, dan Docker sangat diutamakan.', 'Tangerang, Indonesia', 'Rp 18.000.000 - Rp 25.000.000', 'Teknologi Informasi', 'Full-time', 1, '2026-07-20', 'Available'),
--(4, 'Digital Marketing Specialist', 'Shopee Indonesia', 'Merancang dan mengeksekusi kampanye pemasaran digital, menganalisis performa iklan (Google Ads, Facebook Ads), serta mengoptimalkan strategi SEO/SEM.', 'Jakarta, Indonesia', 'Rp 8.000.000 - Rp 12.000.000', 'Pemasaran & Penjualan', 'Full-time', 1, '2026-08-10', 'Available'),
--(5, 'Technical Writer (Contract)', 'Tech Startup', 'Menyusun dokumentasi teknis, petunjuk penggunaan API, dan panduan integrasi sistem. Posisi ini dilakukan secara remote (WFH).', 'Remote, Indonesia', 'Rp 6.000.000 - Rp 9.000.000', 'Penulisan & Konten', 'Remote', 1, '2026-06-30', 'Available')
--ON CONFLICT (id) DO NOTHING;

-- Reset sequence
SELECT setval('jobs_id_seq', COALESCE((SELECT MAX(id) FROM jobs), 1));

-- Setup Seeker Saved Jobs Table
CREATE TABLE IF NOT EXISTS saved_jobs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_id)
);

-- ==========================================
-- 3. SETUP APPLICATIONS DATABASE
-- ==========================================
\c applications_db

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    job_id INT, -- cross-db FK simulation
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    resume_url TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    feedback_message TEXT,
    interview_date VARCHAR(100),
    interview_time VARCHAR(100),
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    job_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--INSERT INTO applications (id, job_id, applicant_name, applicant_email, resume_url, status) VALUES
--(1, 1, 'Aditya Pratama', 'aditya@example.com', 'https://drive.google.com/file/d/aditya-resume/view', 'Pending'),
--(2, 1, 'Siti Rahma', 'siti.rahma@example.com', 'https://drive.google.com/file/d/siti-resume/view', 'Interview'),
--(3, 2, 'Rian Hidayat', 'rian@example.com', 'https://drive.google.com/file/d/rian-resume/view', 'Pending')
--ON CONFLICT (id) DO NOTHING;

-- Reset sequence
SELECT setval('applications_id_seq', COALESCE((SELECT MAX(id) FROM applications), 1));

-- ==========================================
-- 4. SETUP PROFILES DATABASE
-- ==========================================
\c profiles_db

CREATE TABLE IF NOT EXISTS seeker_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    bio TEXT,
    education TEXT,
    experience TEXT,
    skills TEXT,
    resume_url TEXT,
    portfolio_url TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. SETUP COMPANIES DATABASE
-- ==========================================
\c companies_db

CREATE TABLE IF NOT EXISTS company_profiles (
    id SERIAL PRIMARY KEY,
    recruiter_id INT NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    description TEXT,
    industry VARCHAR(100),
    location VARCHAR(255),
    website_url TEXT,
    logo_url TEXT,
    culture_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_reviews (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES company_profiles(id) ON DELETE CASCADE,
    reviewer_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. SETUP INTERVIEWS DATABASE
-- ==========================================
\c interviews_db

CREATE TABLE IF NOT EXISTS interview_schedules (
    id SERIAL PRIMARY KEY,
    application_id INT NOT NULL,
    job_id INT NOT NULL,
    recruiter_id INT NOT NULL,
    applicant_id INT NOT NULL,
    interview_date DATE NOT NULL,
    interview_time VARCHAR(50) NOT NULL,
    meeting_link TEXT,
    status VARCHAR(50) DEFAULT 'Scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
