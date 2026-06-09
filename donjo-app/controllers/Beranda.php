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
            'coreScopeCards'  => $this->coreScopeCards(),
            'shortcut'        => Shortcut::querys()['data'],
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
                ['title' => 'Identitas Desa', 'link' => 'identitas_desa', 'akses' => 'identitas-desa', 'icon' => 'fa-id-card', 'tone' => 'bg-aqua'],
                ['title' => 'Wilayah', 'link' => 'wilayah', 'akses' => 'wilayah-administratif', 'icon' => 'fa-map', 'tone' => 'bg-green'],
                ['title' => 'Penduduk', 'link' => 'penduduk', 'akses' => 'penduduk', 'icon' => 'fa-user', 'tone' => 'bg-blue'],
                ['title' => 'Keluarga', 'link' => 'keluarga', 'akses' => 'keluarga', 'icon' => 'fa-users', 'tone' => 'bg-teal'],
            ],
            'Layanan Warga' => [
                ['title' => 'Cetak Surat', 'link' => 'surat', 'akses' => 'cetak-surat', 'icon' => 'fa-files-o', 'tone' => 'bg-purple'],
                ['title' => 'Permohonan Surat', 'link' => 'permohonan_surat_admin', 'akses' => 'permohonan-surat', 'icon' => 'fa-inbox', 'tone' => 'bg-orange'],
                ['title' => 'Arsip Layanan', 'link' => 'keluar', 'akses' => 'arsip-layanan', 'icon' => 'fa-folder-open', 'tone' => 'bg-navy'],
                ['title' => 'Layanan Mandiri', 'link' => 'mandiri', 'akses' => 'pendaftar-layanan-mandiri', 'icon' => 'fa-mobile', 'tone' => 'bg-maroon'],
            ],
            'Program Desa' => [
                ['title' => 'Bantuan', 'link' => 'program_bantuan', 'akses' => 'bantuan', 'icon' => 'fa-heart', 'tone' => 'bg-red'],
                ['title' => 'Pembangunan', 'link' => 'admin_pembangunan', 'akses' => 'pembangunan', 'icon' => 'fa-building', 'tone' => 'bg-yellow'],
                ['title' => 'Pengaduan', 'link' => 'pengaduan_admin', 'akses' => 'pengaduan', 'icon' => 'fa-comments', 'tone' => 'bg-light-blue'],
                ['title' => 'Peta Desa', 'link' => 'gis', 'akses' => 'peta', 'icon' => 'fa-globe', 'tone' => 'bg-olive'],
            ],
            'Publikasi Website' => [
                ['title' => 'Artikel', 'link' => 'web', 'akses' => 'artikel', 'icon' => 'fa-file-text', 'tone' => 'bg-blue'],
                ['title' => 'Galeri', 'link' => 'gallery', 'akses' => 'galeri', 'icon' => 'fa-image', 'tone' => 'bg-purple'],
                ['title' => 'Menu Website', 'link' => 'menu', 'akses' => 'menu', 'icon' => 'fa-bars', 'tone' => 'bg-aqua'],
                ['title' => 'Tema', 'link' => 'theme', 'akses' => 'tema', 'icon' => 'fa-paint-brush', 'tone' => 'bg-green'],
            ],
            'Administrasi Sistem' => [
                ['title' => 'Pengguna', 'link' => 'man_user', 'akses' => 'pengguna', 'icon' => 'fa-user-circle', 'tone' => 'bg-navy'],
                ['title' => 'Aplikasi', 'link' => 'setting', 'akses' => 'aplikasi', 'icon' => 'fa-cog', 'tone' => 'bg-teal'],
                ['title' => 'Database', 'link' => 'database', 'akses' => 'database', 'icon' => 'fa-database', 'tone' => 'bg-orange'],
                ['title' => 'Info Sistem', 'link' => 'info_sistem', 'akses' => 'info-sistem', 'icon' => 'fa-server', 'tone' => 'bg-gray'],
            ],
        ];
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
