<?php

/*
 *
 * File ini bagian dari:
 *
 * OpenSID
 *
 * Sistem informasi desa sumber terbuka untuk memajukan desa
 *
 * Aplikasi dan source code ini dirilis berdasarkan lisensi GPL V3
 *
 * Hak Cipta 2009 - 2015 Combine Resource Institution (http://lumbungkomunitas.net/)
 * Hak Cipta 2016 - 2025 Perkumpulan Desa Digital Terbuka (https://opendesa.id)
 *
 * Dengan ini diberikan izin, secara gratis, kepada siapa pun yang mendapatkan salinan
 * dari perangkat lunak ini dan file dokumentasi terkait ("Aplikasi Ini"), untuk diperlakukan
 * tanpa batasan, termasuk hak untuk menggunakan, menyalin, mengubah dan/atau mendistribusikan,
 * asal tunduk pada syarat berikut:
 *
 * Pemberitahuan hak cipta di atas dan pemberitahuan izin ini harus disertakan dalam
 * setiap salinan atau bagian penting Aplikasi Ini. Barang siapa yang menghapus atau menghilangkan
 * pemberitahuan ini melanggar ketentuan lisensi Aplikasi Ini.
 *
 * PERANGKAT LUNAK INI DISEDIAKAN "SEBAGAIMANA ADANYA", TANPA JAMINAN APA PUN, BAIK TERSURAT MAUPUN
 * TERSIRAT. PENULIS ATAU PEMEGANG HAK CIPTA SAMA SEKALI TIDAK BERTANGGUNG JAWAB ATAS KLAIM, KERUSAKAN ATAU
 * KEWAJIBAN APAPUN ATAS PENGGUNAAN ATAU LAINNYA TERKAIT APLIKASI INI.
 *
 * @package   OpenSID
 * @author    Tim Pengembang OpenDesa
 * @copyright Hak Cipta 2009 - 2015 Combine Resource Institution (http://lumbungkomunitas.net/)
 * @copyright Hak Cipta 2016 - 2025 Perkumpulan Desa Digital Terbuka (https://opendesa.id)
 * @license   http://www.gnu.org/licenses/gpl.html GPL V3
 * @link      https://github.com/OpenSID/OpenSID
 *
 */

use App\Libraries\Release;
use App\Libraries\Saas;
use App\Models\Shortcut;
use Modules\Pelanggan\Services\CekService;
use Modules\Pelanggan\Services\PelangganService;

defined('BASEPATH') || exit('No direct script access allowed');

class Beranda extends Admin_Controller
{
    public $isAdmin;
    public $modul_ini           = 'beranda';
    public $kategori_pengaturan = 'Beranda';

    public function __construct()
    {
        parent::__construct();
        $this->isAdmin = $this->session->isAdmin->pamong;
    }

    public function index()
    {
        $rilis           = [];
        $notif_langganan = null;
        $notif_percobaan = null;
        $saas            = collect();
        $coreDashboard   = (bool) config_item('yamansari_core_dashboard');

        if ($this->shouldLoadExternalDashboardChecks()) {
            get_pesan_opendk();

            $notif_langganan = PelangganService::statusLangganan();

            if (empty($notif_langganan)) {
                $notif_percobaan = PelangganService::statusPercobaan();
            }

            $rilis = $this->getUpdate();
            $saas  = Saas::peringatan();
        }

        $data = [
            'rilis'           => $rilis,
            'coreDashboard'   => $coreDashboard,
            'coreScopeStats'  => $coreDashboard ? $this->coreScopeStats() : [],
            'coreScopeCards'  => $this->coreScopeCards(),
            'coreWorkflow'    => $coreDashboard ? $this->coreWorkflow() : [],
            'coreParkingLot'  => $coreDashboard ? $this->coreParkingLot() : [],
            'shortcut'        => $coreDashboard ? [] : Shortcut::querys()['data'],
            'saas'            => $saas,
            'notif_langganan' => $notif_langganan,
            'notif_percobaan' => $notif_percobaan,
        ];

        return view('admin.home.index', $data);
    }

    private function shouldLoadExternalDashboardChecks(): bool
    {
        return (bool) config_item('opendesa_service_checks') && (bool) config_item('dashboard_external_checks');
    }

    private function coreScopeCards(): array
    {
        return [
            'Basis Data Desa' => [
                ['title' => 'Identitas Desa', 'link' => 'identitas_desa', 'akses' => 'identitas-desa', 'icon' => 'fa-id-card', 'summary' => 'Kode wilayah, alamat kantor, kepala desa, dan profil resmi.', 'output' => 'Profil desa valid'],
                ['title' => 'Wilayah', 'link' => 'wilayah', 'akses' => 'wilayah-administratif', 'icon' => 'fa-map', 'summary' => 'Dusun, RW, RT, titik peta, dan struktur wilayah.', 'output' => 'Wilayah terpetakan'],
                ['title' => 'Penduduk', 'link' => 'penduduk', 'akses' => 'penduduk', 'icon' => 'fa-user', 'summary' => 'Data NIK, biodata, status dasar, dan riwayat mutasi.', 'output' => 'Data warga aktif'],
                ['title' => 'Keluarga', 'link' => 'keluarga', 'akses' => 'keluarga', 'icon' => 'fa-users', 'summary' => 'Nomor KK, kepala keluarga, anggota, dan alamat keluarga.', 'output' => 'Basis KK rapi'],
            ],
            'Layanan Warga' => [
                ['title' => 'Cetak Surat', 'link' => 'surat', 'akses' => 'cetak-surat', 'icon' => 'fa-files-o', 'summary' => 'Surat keterangan warga dari template yang sudah disiapkan.', 'output' => 'Surat selesai'],
                ['title' => 'Permohonan Surat', 'link' => 'permohonan_surat_admin', 'akses' => 'permohonan-surat', 'icon' => 'fa-inbox', 'summary' => 'Antrian permohonan dari layanan mandiri warga.', 'output' => 'Antrian terkendali'],
                ['title' => 'Arsip Layanan', 'link' => 'keluar', 'akses' => 'arsip-layanan', 'icon' => 'fa-folder-open', 'summary' => 'Riwayat surat keluar dan dokumen pelayanan.', 'output' => 'Arsip terlacak'],
                ['title' => 'Layanan Mandiri', 'link' => 'mandiri', 'akses' => 'pendaftar-layanan-mandiri', 'icon' => 'fa-mobile', 'summary' => 'Akun warga, gawai layanan, kotak pesan, dan pengaturan akses.', 'output' => 'Akses warga siap'],
            ],
            'Program Desa' => [
                ['title' => 'Bantuan', 'link' => 'program_bantuan', 'akses' => 'bantuan', 'icon' => 'fa-heart', 'summary' => 'Program bantuan, sasaran, peserta, dan periode penyaluran.', 'output' => 'Penerima jelas'],
                ['title' => 'Satu Data/DTKS', 'link' => 'dtks', 'akses' => 'dtks', 'icon' => 'fa-table', 'summary' => 'Basis data sosial warga dari DTKS/Regsosek dan impor Excel.', 'output' => 'Data sosial siap impor'],
                ['title' => 'Pembangunan', 'link' => 'admin_pembangunan', 'akses' => 'pembangunan', 'icon' => 'fa-building', 'summary' => 'Kegiatan pembangunan, lokasi, anggaran, progres, dan dokumentasi.', 'output' => 'Proyek terpantau'],
                ['title' => 'Pengaduan', 'link' => 'pengaduan_admin', 'akses' => 'pengaduan', 'icon' => 'fa-comments', 'summary' => 'Masukan warga yang perlu dicatat, dijawab, dan ditindaklanjuti.', 'output' => 'Aduan tertangani'],
                ['title' => 'Peta Desa', 'link' => 'gis', 'akses' => 'peta', 'icon' => 'fa-globe', 'summary' => 'Lokasi fasilitas, wilayah, keluarga, dan titik penting desa.', 'output' => 'Peta operasional'],
            ],
            'Publikasi Website' => [
                ['title' => 'Artikel', 'link' => 'web', 'akses' => 'artikel', 'icon' => 'fa-file-text', 'summary' => 'Berita, pengumuman, agenda, dan informasi publik.', 'output' => 'Info warga terbit'],
                ['title' => 'Galeri', 'link' => 'gallery', 'akses' => 'galeri', 'icon' => 'fa-image', 'summary' => 'Foto kegiatan, dokumentasi program, dan media website.', 'output' => 'Dokumentasi siap'],
                ['title' => 'Menu Website', 'link' => 'menu', 'akses' => 'menu', 'icon' => 'fa-bars', 'summary' => 'Navigasi publik yang singkat dan tidak membingungkan warga.', 'output' => 'Website mudah dibaca'],
                ['title' => 'Tema', 'link' => 'theme', 'akses' => 'tema', 'icon' => 'fa-paint-brush', 'summary' => 'Tampilan website publik dan komponen visual utama.', 'output' => 'Tampilan konsisten'],
            ],
            'Administrasi Sistem' => [
                ['title' => 'Pengguna', 'link' => 'man_user', 'akses' => 'pengguna', 'icon' => 'fa-user-circle', 'summary' => 'Akun operator, grup akses, dan pembatasan kewenangan.', 'output' => 'Akses aman'],
                ['title' => 'Aplikasi', 'link' => 'setting', 'akses' => 'aplikasi', 'icon' => 'fa-cog', 'summary' => 'Setting utama, format, sebutan, dan preferensi operasional.', 'output' => 'Konfigurasi terkunci'],
                ['title' => 'Database', 'link' => 'database', 'akses' => 'database', 'icon' => 'fa-database', 'summary' => 'Backup, restore, dan perawatan data lokal.', 'output' => 'Data terlindungi'],
                ['title' => 'Info Sistem', 'link' => 'info_sistem', 'akses' => 'info-sistem', 'icon' => 'fa-server', 'summary' => 'Versi, server, lingkungan, dan pemeriksaan teknis dasar.', 'output' => 'Sistem terpantau'],
            ],
        ];
    }

    private function coreScopeStats(): array
    {
        return [
            ['label' => 'Penduduk aktif', 'count' => $this->countRows('tweb_penduduk', ['status_dasar' => 1]), 'link' => 'penduduk', 'akses' => 'penduduk', 'icon' => 'fa-user', 'context' => 'basis layanan'],
            ['label' => 'Keluarga', 'count' => $this->countRows('tweb_keluarga'), 'link' => 'keluarga', 'akses' => 'keluarga', 'icon' => 'fa-users', 'context' => 'basis KK'],
            ['label' => 'Wilayah', 'count' => $this->countRows('tweb_wil_clusterdesa'), 'link' => 'wilayah', 'akses' => 'wilayah-administratif', 'icon' => 'fa-map-marker', 'context' => 'dusun/RW/RT'],
            ['label' => 'Permohonan baru', 'count' => $this->countRows('permohonan_surat', ['status' => 1]), 'link' => 'permohonan_surat_admin', 'akses' => 'permohonan-surat', 'icon' => 'fa-inbox', 'context' => 'perlu diperiksa'],
            ['label' => 'Surat tercetak', 'count' => $this->countRows('log_surat', ['status' => 1]), 'link' => 'keluar', 'akses' => 'arsip-layanan', 'icon' => 'fa-file-text-o', 'context' => 'arsip layanan'],
            ['label' => 'Program bantuan', 'count' => $this->countRows('program'), 'link' => 'program_bantuan', 'akses' => 'bantuan', 'icon' => 'fa-heart', 'context' => 'program tercatat'],
            ['label' => 'DTKS', 'count' => $this->countRows('dtks'), 'link' => 'dtks', 'akses' => 'dtks', 'icon' => 'fa-table', 'context' => 'siap impor Excel'],
            ['label' => 'Pembangunan', 'count' => $this->countRows('pembangunan'), 'link' => 'admin_pembangunan', 'akses' => 'pembangunan', 'icon' => 'fa-building', 'context' => 'kegiatan desa'],
            ['label' => 'Artikel publik', 'count' => $this->countRows('artikel'), 'link' => 'web', 'akses' => 'artikel', 'icon' => 'fa-newspaper-o', 'context' => 'konten website'],
        ];
    }

    private function coreWorkflow(): array
    {
        return [
            ['title' => 'Validasi data dasar', 'body' => 'Identitas, wilayah, penduduk, keluarga, dan pamong desa.', 'icon' => 'fa-check-square-o'],
            ['title' => 'Layani kebutuhan warga', 'body' => 'Permohonan, cetak surat, arsip, dan akses mandiri warga.', 'icon' => 'fa-handshake-o'],
            ['title' => 'Kelola program desa', 'body' => 'Bantuan, DTKS, pembangunan, pengaduan, peta, dan transparansi.', 'icon' => 'fa-line-chart'],
            ['title' => 'Publikasikan informasi', 'body' => 'Artikel, galeri, menu website, tema, dan kanal publik.', 'icon' => 'fa-bullhorn'],
        ];
    }

    private function coreParkingLot(): array
    {
        return [
            'Lapak',
            'OpenDK',
            'Anjungan',
            'Buku Tamu',
            'Kehadiran',
            'Kesehatan Covid',
            'Layanan Pelanggan OpenDesa',
        ];
    }

    private function countRows(string $table, array $where = []): int
    {
        if (! $this->db->table_exists($table)) {
            return 0;
        }

        $this->db->from($table);

        if ($this->db->field_exists('config_id', $table)) {
            $this->db->where('config_id', identitas('id'));
        }

        foreach ($where as $field => $value) {
            $this->db->where($field, $value);
        }

        return (int) $this->db->count_all_results();
    }

    private function getUpdate(): array
    {
        $info = [];

        if (cek_koneksi_internet() && !config_item('demo_mode')) {
            $url_rilis = config_item('rilis_umum');

            $release = new Release();
            $release->setApiUrl($url_rilis)->setCurrentVersion();

            if ($release->isAvailable()) {
                $info['update_available'] = $release->isAvailable();
                $info['current_version'] = 'v' . AmbilVersi();
                $info['latest_version'] = $release->getLatestVersion();
                $info['release_name'] = $release->getReleaseName();
                $info['release_body'] = $release->getReleaseBody();
                $info['url_download'] = $release->getReleaseDownload();
            } else {
                $info['update_available'] = false;
            }
        }

        return $info;
    }
}
