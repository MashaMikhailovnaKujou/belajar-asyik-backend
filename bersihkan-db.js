// Nama file: bersihkan-db.js
const mysql = require('mysql2/promise');

async function bersihkan() {
    console.log('⏳ Menghubungkan ke MariaDB untuk pembersihan...');
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'MahiruSan12', // 👈 Ganti dengan password MariaDB laptopmu jika berbeda
        database: 'belajar_asyik'
    });
    
    try {
        // Perintah TRUNCATE akan mengosongkan seluruh isi tabel scores dalam sekejap
        await connection.query("TRUNCATE TABLE scores");
        console.log('🧹 SUKSES: Semua data nilai lama berhasil dihapus total! Tabel sekarang kosong bersih.');
    } catch (err) {
        console.error('❌ Gagal membersihkan:', err.message);
    } finally {
        await connection.end();
    }
}

bersihkan();