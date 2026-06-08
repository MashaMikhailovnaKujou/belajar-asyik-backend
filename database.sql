CREATE DATABASE IF NOT EXISTS belajar_asyik;
USE belajar_asyik;

-- 1. Tabel Users (Menampung Akun Siswa & Guru)
CREATE TABLE IF NOT EXISTS users (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('siswa', 'guru') NOT NULL DEFAULT 'siswa',
    avatar VARCHAR(10) DEFAULT '🐰',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Scores (Merekap Nilai Ujian Siswa dengan Tipe VARCHAR agar Fleksibel)
CREATE TABLE IF NOT EXISTS scores (
    id_score INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT NOT NULL,
    nama_siswa VARCHAR(50) NOT NULL DEFAULT 'Siswa',
    no_absen INT NOT NULL DEFAULT 0,
    jenis_ujian VARCHAR(50) NOT NULL, 
    topik_or_bab VARCHAR(100) NOT NULL, 
    skor_didapat INT NOT NULL,
    total_soal INT NOT NULL,
    persentase DECIMAL(5,2) NOT NULL,
    tanggal_selesai TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE CASCADE
);



-- 3. Memasukkan Akun Dummy untuk Bahan Uji Coba (Password: password123)
INSERT INTO users (username, password, role, avatar) VALUES 
('pak_guru', '$2b$10$wR6C.h.Z8l.aO24C9E7VeuZkF27F2pC3a5E1XgS7BwZ7A3X3W2C1.', 'guru', '🦉')
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO users (username, password, role, avatar) VALUES 
('budi_siswa', '$2b$10$wR6C.h.Z8l.aO24C9E7VeuZkF27F2pC3a5E1XgS7BwZ7A3X3W2C1.', 'siswa', '🐰')
ON DUPLICATE KEY UPDATE username=username;