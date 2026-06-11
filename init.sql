-- Database Initialization for Jobstreet Clone

CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    salary VARCHAR(100),
    category VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- Full-time, Part-time, Remote, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    resume_url TEXT,
    status VARCHAR(50) DEFAULT 'Pending', -- Pending, Interview, Rejected, Accepted
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data (Optional but extremely useful for testing)
INSERT INTO jobs (title, company, description, location, salary, category, type) VALUES
('Senior Full Stack Developer', 'GoTo Group', 'Kami sedang mencari Senior Full Stack Developer berpengalaman dengan spesialisasi Node.js dan React. Anda bertanggung jawab untuk merancang, mengembangkan, dan memelihara aplikasi berkinerja tinggi serta mengintegrasikan API dengan lancar.', 'Jakarta, Indonesia', 'Rp 20.000.000 - Rp 30.000.000', 'Teknologi Informasi', 'Full-time'),
('UI/UX Designer', 'Bukalapak', 'Bergabunglah bersama kami sebagai UI/UX Designer untuk menciptakan antarmuka digital yang intuitif dan menyenangkan bagi jutaan pengguna di Indonesia. Anda akan merancang alur pengguna, wireframe, dan prototype interaktif.', 'Bandung, Indonesia', 'Rp 10.000.000 - Rp 15.000.000', 'Desain Kreatif', 'Full-time'),
('Backend Engineer (Go)', 'Traveloka', 'Membangun microservices tangguh dan efisien menggunakan bahasa pemrograman Go. Pengalaman dengan PostgreSQL, Redis, dan Docker sangat diutamakan.', 'Tangerang, Indonesia', 'Rp 18.000.000 - Rp 25.000.000', 'Teknologi Informasi', 'Full-time'),
('Digital Marketing Specialist', 'Shopee Indonesia', 'Merancang dan mengeksekusi kampanye pemasaran digital, menganalisis performa iklan (Google Ads, Facebook Ads), serta mengoptimalkan strategi SEO/SEM.', 'Jakarta, Indonesia', 'Rp 8.000.000 - Rp 12.000.000', 'Pemasaran & Penjualan', 'Full-time'),
('Technical Writer (Contract)', 'Tech Startup', 'Menyusun dokumentasi teknis, petunjuk penggunaan API, dan panduan integrasi sistem. Posisi ini dilakukan secara remote (WFH).', 'Remote, Indonesia', 'Rp 6.000.000 - Rp 9.000.000', 'Penulisan & Konten', 'Remote');

INSERT INTO applications (job_id, applicant_name, applicant_email, resume_url, status) VALUES
(1, 'Aditya Pratama', 'aditya@example.com', 'https://drive.google.com/file/d/aditya-resume/view', 'Pending'),
(1, 'Siti Rahma', 'siti.rahma@example.com', 'https://drive.google.com/file/d/siti-resume/view', 'Interview'),
(2, 'Rian Hidayat', 'rian@example.com', 'https://drive.google.com/file/d/rian-resume/view', 'Pending');
