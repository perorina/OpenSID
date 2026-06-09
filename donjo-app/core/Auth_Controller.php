<?php

defined('BASEPATH') || exit('No direct script access allowed');

/**
 * Base controller ringan untuk halaman autentikasi admin.
 *
 * Jalur login tidak perlu menjalankan bootstrap admin penuh seperti cek migrasi,
 * tracker desa, dan pemuatan setting turunan yang mahal di MY_Controller.
 */
class Auth_Controller extends CI_Controller
{
    public $request;
    public $list_setting;
    public $setting;
    public $header = [];
    public $latar_login;

    public function __construct()
    {
        parent::__construct();

        $this->load->database();
        $this->request = $this->input->post();
        $this->header  = $this->loadIdentitasDesa();

        $this->loadLoginSettings();

        date_default_timezone_set($this->setting->timezone ?: 'Asia/Jakarta');
    }

    private function loadIdentitasDesa(): array
    {
        $defaults = [
            'id'             => null,
            'app_key'        => null,
            'nama_desa'      => '',
            'kode_pos'       => '',
            'nama_kecamatan' => '',
            'nama_kabupaten' => '',
            'alamat_kantor'  => '',
            'logo'           => '',
        ];

        $query  = $this->db->select(implode(',', array_keys($defaults)))->from('config');
        $appKey = function_exists('get_app_key') ? get_app_key() : null;

        if ($appKey) {
            $row    = clone $query;
            $config = $row->where('app_key', $appKey)->limit(1)->get()->row_array();

            if ($config) {
                return array_merge($defaults, $config);
            }
        }

        return array_merge($defaults, $query->limit(1)->get()->row_array() ?: []);
    }

    private function loadLoginSettings(): void
    {
        $settings = [
            'login_title'                 => 'OpenSID',
            'sebutan_desa'                => 'desa',
            'sebutan_kecamatan'           => 'kecamatan',
            'sebutan_kabupaten'           => 'kabupaten',
            'sebutan_kecamatan_singkat'   => 'kec',
            'latar_login'                 => '',
            'timezone'                    => 'Asia/Jakarta',
            'tte'                         => 0,
            'login_otp'                   => 0,
            'otp_expiry_minutes'          => 5,
            'otp_resend_cooldown'         => 30,
            'email_notifikasi'            => 0,
            'telegram_notifikasi'         => 0,
            'email_protocol'              => 'smtp',
            'email_smtp_url'              => null,
            'email_smtp_host'             => null,
            'email_smtp_port'             => null,
            'email_smtp_encryption'       => 'tls',
            'email_smtp_user'             => null,
            'email_smtp_pass'             => null,
            'email_smtp_timeout'          => null,
            'email_smtp_domain'           => null,
            'telegram_token'              => null,
            'google_recaptcha_site_key'   => null,
            'google_recaptcha_secret_key' => null,
        ];

        $this->db->reset_query();
        $query = $this->db->select('key,value')->from('setting_aplikasi');

        if (! empty($this->header['id'])) {
            $query->group_start()
                ->where('config_id', $this->header['id'])
                ->or_where('config_id IS NULL', null, false)
                ->group_end()
                ->order_by('config_id', 'ASC');
        }

        $rows = $query->get()->result();

        foreach ($rows as $row) {
            $settings[$row->key] = $row->value;
        }

        $settings = $this->replaceSebutanPlaceholders($settings);

        $this->list_setting = collect(array_map(static fn ($key, $value) => (object) [
            'key'   => $key,
            'value' => $value,
        ], array_keys($settings), $settings));
        $this->setting = (object) $settings;
    }

    private function replaceSebutanPlaceholders(array $settings): array
    {
        $replace = [
            '[Desa]'            => ucwords($settings['sebutan_desa'] ?? 'desa'),
            '[desa]'            => $settings['sebutan_desa'] ?? 'desa',
            '[Pemerintah Desa]' => ucwords($settings['sebutan_pemerintah_desa'] ?? 'pemerintah desa'),
            '[dusun]'           => $settings['sebutan_dusun'] ?? 'dusun',
        ];

        foreach ($settings as $key => $value) {
            if (is_string($value)) {
                $settings[$key] = str_replace(array_keys($replace), array_values($replace), $value);
            }
        }

        return $settings;
    }
}
