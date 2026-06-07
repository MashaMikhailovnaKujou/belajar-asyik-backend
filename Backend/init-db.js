const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        console.log('🔄 Mencoba menghubungkan ke server MariaDB...');

        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'MahiruSan12', 
            port: 3306,       
            multipleStatements: true 
        });

        console.log('🔌 Terhubung ke server! Membaca file SQL...');

        const sqlPath = path.join(__dirname, 'database.sql');
        
       
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`File tidak ditemukan di lokasi: ${sqlPath}. Pastikan folder bernama "SQL" (huruf kapital) dan di dalamnya ada file "database.sql".`);
        }

        let sqlQueries = fs.readFileSync(sqlPath, 'utf8');

        
        if (sqlQueries.includes('IF NOT EXTSTS')) {
            console.log('🛠️ Mendeteksi typo "EXTSTS", otomatis memperbaiki menjadi "EXISTS"...');
            sqlQueries = sqlQueries.replace(/IF NOT EXTSTS/g, 'IF NOT EXISTS');
        }

        console.log('🚀 Menjalankan perintah SQL untuk membuat database dan tabel...');

       
        await connection.query(sqlQueries);
        
        console.log('✨ =================================================== ✨');
        console.log('✅ SUKSES! Database "belajar_asyik" berhasil dibuat.');
        console.log('👥 Tabel "users" dan akun dummy (siswa & guru) siap digunakan.');
        console.log('📊 Tabel "scores" untuk rekap nilai kuis/latihan siap digunakan.');
        console.log('✨ =================================================== ✨');
        
        
        await connection.end();

    } catch (error) {
        console.error('\n❌ Terjadi Error Saat Inisialisasi Database:');
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('👉 Penyebab: Password MariaDB salah! Silakan periksa kembali kolom "password" di file init-db.js ini.\n');
        } 
        else if (error.code === 'ECONNREFUSED') {
            console.error('👉 Penyebab: Koneksi ditolak. Pastikan Service MariaDB/MySQL sudah hidup di laptopmu.\n');
        } 
        else {
            console.error(`👉 Detail: ${error.message}\n`);
        }
    }
}

run();