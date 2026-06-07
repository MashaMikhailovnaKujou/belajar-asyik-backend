// Nama file: add-column.js
const mysql = require('mysql2/promise');

async function run() {
    console.log('⏳ Mencoba menghubungkan ke MariaDB...');
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'root', // 👈 Pastikan ini sesuai dengan password MariaDB laptopmu
        database: 'belajar_asyik'
    });
    
    try {
        // Eksekusi penambahan kolom baru
        await connection.query("ALTER TABLE scores ADD COLUMN nama_siswa VARCHAR(50) NOT NULL DEFAULT 'Siswa'");
        console.log('✅ SUKSES: Kolom "nama_siswa" berhasil ditambahkan ke tabel scores!');
    } catch (err) {
        // Jika kolomnya ternyata sudah terbuat sebelumnya, dia tidak akan eror, cuma kasih info
        console.log('ℹ️ Info:', err.message);
    } finally {
        await connection.end();
        console.log('🔌 Koneksi database ditutup.');
    }
}

run().catch(error => console.error('❌ Terjadi kesalahan:', error.message));