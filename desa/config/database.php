<?php
// -------------------------------------------------------------------------
//
// Letakkan username, password dan database sebetulnya di file ini.
// File ini JANGAN di-commit ke GIT. TAMBAHKAN di .gitignore
// -------------------------------------------------------------------------

// Data Konfigurasi MySQL yang disesuaikan

$db['default']['hostname'] = '127.0.0.1';
$db['default']['username'] = 'opensid';
$db['default']['password'] = 'eyJpdiI6IkNPMXpZdURTcXRCY3V6MHpWSnZOcGc9PSIsInZhbHVlIjoiMWlUS00rdWRSVWJYb0xBQnArN0pVY2toRFBjN09OVXJjcWJvV1NrNlpHdz0iLCJtYWMiOiI0ODkwMTYxZmM5MjczZWNlYzdlNzkwNTkxZTQ2MTVkOTA0YjUyMzM0NjY4OTcwZTMxMDU4OTU0Y2ExNGVmMjJmIiwidGFnIjoiIn0=';
$db['default']['port']     = 3307;
$db['default']['database'] = 'opensid_local';
$db['default']['dbcollat'] = 'utf8mb4_general_ci';

/*
| Untuk setting koneksi database 'Strict Mode'
| Sesuaikan dengan ketentuan hosting
*/
$db['default']['stricton'] = true;

/*
| Konfigurasi options digunakan untuk menyisipkan opsi tambahan
| saat mengatur koneksi ke database.
*/
$db['default']['options'] = [
    // PDO::ATTR_EMULATE_PREPARES => true,
];