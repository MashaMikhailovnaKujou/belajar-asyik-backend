require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const ExcelJS = require('exceljs');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

const app = express();
app.use(express.json());
app.use(cors()); // Mengizinkan frontend mengakses backend ini

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_RAHASIA_KELAS_3_SD';

// 1. KONEKSI KE DATABASE MARIADB
const dbPool = mysql.createPool({
    host: "127.0.0.1",
    user: "root",
    password: "MahiruSan12",
    database: "belajar_asyik",
    waitForConnections: true,
    connectionLimit: 10,
    authPlugins: {
        auth_gssapi_client: () => () => Buffer.alloc(0)
    }
});

// ==================== MIDDLEWARE PENGAMAN (AUTH) ====================

// Validasi apakah user sudah login atau belum (via token)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token tidak ditemukan, akses ditolak' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token kadaluwarsa atau tidak valid' });
        req.user = user;
        next();
    });
};

// ==================== API ENDPOINT UNTUK PENGGUNA ====================

// AUTH 1: Proses Login Pengguna (Guru / Siswa)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await dbPool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Username tidak ditemukan' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Password salah' });

        const token = jwt.sign({ id_user: user.id_user, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, user: { id_user: user.id_user, username: user.username, role: user.role, avatar: user.avatar } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// KUIS 1: Menyimpan data rekap skor kuis siswa ke tabel database (DENGAN VALIDASI ABSEN)
app.post('/api/scores', async (req, res) => {
    const { id_user, nama_siswa, no_absen, jenis_ujian, topik_or_bab, skor_didapat, total_soal } = req.body;

    try {
        // 🛡️ VALIDATION ABSEN DUPLIKAT: Cek apakah nomor absen sudah dikunci oleh nama siswa lain
        const [absenCheck] = await dbPool.query(
            "SELECT nama_siswa FROM scores WHERE no_absen = ? AND nama_siswa != ? LIMIT 1",
            [no_absen, nama_siswa]
        );

        if (absenCheck.length > 0) {
            return res.status(400).json({
                error: `❌ Nomor Absen ${no_absen} sudah terdaftar atas nama siswa lain (${absenCheck[0].nama_siswa})!`
            });
        }

        const persentase = (skor_didapat / total_soal) * 100;

        await dbPool.query(
            `INSERT INTO scores (id_user, nama_siswa, no_absen, jenis_ujian, topik_or_bab, skor_didapat, total_soal, persentase) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id_user, nama_siswa, no_absen, jenis_ujian, topik_or_bab, skor_didapat, total_soal, persentase]
        );

        res.json({ message: 'Skor berhasil disimpan!' });
    } catch (error) {
        console.error('Database Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 🛡️ ENDPOINT TAMBAHAN: Cek nomor absen duplikat di awal halaman LOGIN siswa
app.post('/api/check-absen', async (req, res) => {
    const { nama_siswa, no_absen } = req.body;

    try {
        // Cek apakah nomor absen sudah dikunci oleh nama siswa lain di database
        const [absenCheck] = await dbPool.query(
            "SELECT nama_siswa FROM scores WHERE no_absen = ? AND nama_siswa != ? LIMIT 1",
            [parseInt(no_absen), nama_siswa]
        );

        if (absenCheck.length > 0) {
            return res.status(400).json({
                error: `❌ Nomor Absen ${no_absen} sudah terdaftar atas nama siswa lain (${absenCheck[0].nama_siswa})!`
            });
        }

        // Jika nomor absen aman / belum ada yang pakai
        res.json({ status: "aman", message: "Nomor absen tersedia!" });

    } catch (error) {
        console.error('Database Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==================== API ENDPOINT UTK DASHBOARD GURU ====================

app.get('/api/guru/rekap-nilai', async (req, res) => {
    try {
        const [rows] = await dbPool.query(`
            SELECT s.no_absen, s.nama_siswa AS username, COUNT(s.id_score) AS total_percobaan, 
                   MAX(s.persentase) AS nilai_tertinggi, MAX(s.tanggal_selesai) AS tanggal_terakhir
            FROM scores s GROUP BY s.no_absen, s.nama_siswa ORDER BY s.no_absen ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/guru/ekspor/excel', async (req, res) => {
    try {
        const [rows] = await dbPool.query(`
            SELECT s.no_absen, s.nama_siswa AS username, s.jenis_ujian, s.topik_or_bab, s.skor_didapat, s.total_soal, s.persentase, s.tanggal_selesai 
            FROM scores s ORDER BY s.tanggal_selesai DESC
        `);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Rekap Nilai Siswa');

        worksheet.columns = [
            { header: 'No Absen', key: 'no_absen', width: 12 },
            { header: 'Nama Siswa', key: 'username', width: 25 },
            { header: 'Jenis Ujian', key: 'jenis_ujian', width: 18 },
            { header: 'Topik / Bab', key: 'topik_or_bab', width: 25 },
            { header: 'Skor', key: 'skor_didapat', width: 10 },
            { header: 'Total Soal', key: 'total_soal', width: 12 },
            { header: 'Nilai Akhir', key: 'persentase', width: 15 },
            { header: 'Tanggal Selesai', key: 'tanggal_selesai', width: 20 }
        ];

        rows.forEach(r => {
            worksheet.addRow({
                no_absen: r.no_absen,
                username: r.username,
                jenis_ujian: r.jenis_ujian,
                topik_or_bab: r.topik_or_bab,
                skor_didapat: r.skor_didapat,
                total_soal: r.total_soal,
                persentase: `${r.persentase}%`,
                tanggal_selesai: new Date(r.tanggal_selesai).toLocaleString('id-ID')
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Rekap_Nilai_BelajarAsyik.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/guru/ekspor/pdf', async (req, res) => {
    try {
        const [rows] = await dbPool.query(`
            SELECT s.no_absen, s.nama_siswa AS username, s.jenis_ujian, s.topik_or_bab, s.skor_didapat, s.total_soal, s.persentase 
            FROM scores s ORDER BY s.tanggal_selesai DESC
        `);

        const doc = new jsPDF();
        doc.text('LAPORAN REKAP NILAI SISWA - BELAJAR ASYIK KELAS 3 SD', 14, 15);
        
        const tableBody = rows.map(r => [r.no_absen, r.username, r.jenis_ujian, r.topik_or_bab, r.skor_didapat, r.total_soal, `${r.persentase}%`]);
        
        autoTable(doc, { 
            head: [['Absen', 'Nama Siswa', 'Jenis Ujian', 'Topik/Bab', 'Skor', 'Total Soal', 'Nilai Akhir']],
            body: tableBody,
            startY: 25
        });

        const pdfBuffer = doc.output('arraybuffer');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Laporan_Nilai_Siswa.pdf');
        res.end(Buffer.from(pdfBuffer));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// RUN SERVER BACKEND
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 Server backend berjalan di port ${PORT} dan terhubung ke MariaDB!`);
});