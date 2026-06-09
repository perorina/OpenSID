<?php

defined('BASEPATH') || exit('No direct script access allowed');

class V1 extends Api_Controller
{
    private const DEFAULT_LIMIT = 6;
    private const MAX_LIMIT     = 24;

    public function __construct()
    {
        parent::__construct();
        $this->allowLocalViteDev();
    }

    public function index(): void
    {
        json([
            'status' => 'ok',
            'data'   => [
                'name'      => 'Yamansari Public API',
                'version'   => 'v1',
                'endpoints' => [
                    'profil'          => site_url('api/yamansari/v1/profil'),
                    'ringkasan'       => site_url('api/yamansari/v1/ringkasan'),
                    'artikel'         => site_url('api/yamansari/v1/artikel'),
                    'pembangunan'     => site_url('api/yamansari/v1/pembangunan'),
                    'program_bantuan' => site_url('api/yamansari/v1/program-bantuan'),
                    'dtks'            => site_url('api/yamansari/v1/dtks'),
                ],
            ],
            'meta' => $this->meta(),
        ]);
    }

    public function profil(): void
    {
        json([
            'status' => 'ok',
            'data'   => $this->profilDesa(),
            'meta'   => $this->meta(),
        ]);
    }

    public function ringkasan(): void
    {
        json([
            'status' => 'ok',
            'data'   => [
                'profil'    => $this->profilDesa(),
                'statistik' => [
                    ['key' => 'penduduk_aktif', 'label' => 'Penduduk aktif', 'value' => $this->countRows('tweb_penduduk', ['status_dasar' => 1])],
                    ['key' => 'keluarga', 'label' => 'Keluarga', 'value' => $this->countRows('tweb_keluarga')],
                    ['key' => 'wilayah', 'label' => 'Wilayah', 'value' => $this->countRows('tweb_wil_clusterdesa')],
                    ['key' => 'permohonan_baru', 'label' => 'Permohonan baru', 'value' => $this->countRows('permohonan_surat', ['status' => 1])],
                    ['key' => 'surat_tercetak', 'label' => 'Surat tercetak', 'value' => $this->countRows('log_surat', ['status' => 1])],
                    ['key' => 'program_bantuan', 'label' => 'Program bantuan', 'value' => $this->countRows('program', [], true)],
                    ['key' => 'dtks', 'label' => 'DTKS', 'value' => $this->countRows('dtks')],
                    ['key' => 'pembangunan', 'label' => 'Pembangunan', 'value' => $this->countRows('pembangunan')],
                    ['key' => 'artikel', 'label' => 'Artikel publik', 'value' => $this->countRows('artikel', ['enabled' => 1])],
                ],
                'dtks'      => $this->dtksRingkas(),
            ],
            'meta' => $this->meta(),
        ]);
    }

    public function artikel(): void
    {
        $limit = $this->limit();
        $items = [];

        if ($this->db->table_exists('artikel')) {
            $this->db->from('artikel');
            $this->applyConfigFilter('artikel');

            if ($this->hasField('artikel', 'enabled')) {
                $this->db->where('enabled', 1);
            }

            if ($this->hasField('artikel', 'tgl_upload')) {
                $this->db->order_by('tgl_upload', 'DESC');
            } else {
                $this->db->order_by('id', 'DESC');
            }

            $rows = $this->db->limit($limit)->get()->result_array();
            $items = array_map(fn (array $row): array => $this->mapArtikel($row), $rows);
        }

        json([
            'status' => 'ok',
            'data'   => $items,
            'meta'   => $this->meta(['limit' => $limit]),
        ]);
    }

    public function pembangunan(): void
    {
        $limit = $this->limit();
        $items = [];

        if ($this->db->table_exists('pembangunan')) {
            $this->db->from('pembangunan');
            $this->applyConfigFilter('pembangunan');

            if ($this->hasField('pembangunan', 'status')) {
                $this->db->where('status', 1);
            }

            if ($this->hasField('pembangunan', 'tahun_anggaran')) {
                $this->db->order_by('tahun_anggaran', 'DESC');
            }

            $this->db->order_by('id', 'DESC');
            $rows = $this->db->limit($limit)->get()->result_array();
            $items = array_map(fn (array $row): array => $this->mapPembangunan($row), $rows);
        }

        json([
            'status' => 'ok',
            'data'   => $items,
            'meta'   => $this->meta(['limit' => $limit]),
        ]);
    }

    public function program_bantuan(): void
    {
        $limit = $this->limit();
        $items = [];

        if ($this->db->table_exists('program')) {
            $this->db->select('program.*, COUNT(program_peserta.id) as jumlah_peserta');
            $this->db->from('program');

            if ($this->db->table_exists('program_peserta')) {
                $join = 'program_peserta.program_id = program.id';
                if ($this->configId() && $this->hasField('program_peserta', 'config_id')) {
                    $join .= ' AND program_peserta.config_id = ' . (int) $this->configId();
                }
                $this->db->join('program_peserta', $join, 'left');
            }

            $this->applyConfigFilter('program', true);

            if ($this->hasField('program', 'status')) {
                $this->db->where('program.status', 1);
            }

            $this->db->group_by('program.id');

            if ($this->hasField('program', 'edate')) {
                $this->db->order_by('program.edate', 'DESC');
            }

            $this->db->order_by('program.id', 'DESC');
            $rows = $this->db->limit($limit)->get()->result_array();
            $items = array_map(fn (array $row): array => $this->mapProgramBantuan($row), $rows);
        }

        json([
            'status' => 'ok',
            'data'   => $items,
            'meta'   => $this->meta(['limit' => $limit]),
        ]);
    }

    public function dtks(): void
    {
        json([
            'status' => 'ok',
            'data'   => $this->dtksRingkas(),
            'meta'   => $this->meta(),
        ]);
    }

    private function profilDesa(): array
    {
        $config = $this->configRow();

        return [
            'nama'       => $this->value($config, 'nama_desa', 'Yamansari'),
            'kode'       => [
                'desa'      => $this->value($config, 'kode_desa'),
                'desa_bps'  => $this->value($config, 'kode_desa_bps', $this->value($config, 'kode_desa')),
                'kecamatan' => $this->value($config, 'kode_kecamatan'),
                'kabupaten' => $this->value($config, 'kode_kabupaten'),
                'provinsi'  => $this->value($config, 'kode_propinsi'),
            ],
            'wilayah'    => [
                'kecamatan' => $this->value($config, 'nama_kecamatan'),
                'kabupaten' => $this->value($config, 'nama_kabupaten'),
                'provinsi'  => $this->value($config, 'nama_propinsi'),
            ],
            'alamat'     => $this->value($config, 'alamat_kantor'),
            'kontak'     => [
                'telepon' => $this->value($config, 'telepon'),
                'email'   => $this->value($config, 'email_desa'),
                'website' => $this->value($config, 'website'),
            ],
            'koordinat'  => [
                'lat'  => $this->value($config, 'lat'),
                'lng'  => $this->value($config, 'lng'),
                'zoom' => $this->intValue($config, 'zoom'),
            ],
            'kepalaDesa' => $this->identitasValue('nama_kepala_desa'),
            'logoUrl'    => $this->logoUrl($config),
        ];
    }

    private function dtksRingkas(): array
    {
        $versions = [];

        if ($this->db->table_exists('dtks') && $this->hasField('dtks', 'versi_kuisioner')) {
            $this->db->select('versi_kuisioner, COUNT(id) as jumlah');
            $this->db->from('dtks');
            $this->applyConfigFilter('dtks');
            $this->db->group_by('versi_kuisioner');
            $versions = array_map(static fn (array $row): array => [
                'versi'  => $row['versi_kuisioner'],
                'jumlah' => (int) $row['jumlah'],
            ], $this->db->get()->result_array());
        }

        $ruta = $this->countRows('dtks');

        return [
            'status'                => $ruta > 0 ? 'tersedia' : 'menunggu_impor',
            'ruta'                  => $ruta,
            'anggota'               => $this->countRows('dtks_anggota'),
            'lampiran'              => $this->countRows('dtks_lampiran'),
            'rtm_terdaftar_dtks'    => $this->countRows('tweb_rtm', ['terdaftar_dtks' => 1]),
            'versi_kuisioner'       => $versions,
            'catatan'               => $ruta > 0 ? null : 'Data DTKS lokal belum diimpor dari Excel.',
        ];
    }

    private function mapArtikel(array $row): array
    {
        $slug = $this->value($row, 'slug') ?: $this->value($row, 'id');

        return [
            'id'          => $this->intValue($row, 'id'),
            'judul'       => $this->value($row, 'judul'),
            'slug'        => $this->value($row, 'slug'),
            'ringkasan'   => $this->excerpt($this->value($row, 'isi')),
            'tanggal'     => $this->value($row, 'tgl_upload'),
            'gambarUrl'   => $this->articleImageUrl($this->value($row, 'gambar')),
            'url'         => site_url('artikel/' . $slug),
            'jumlahDilihat' => $this->intValue($row, 'hit'),
        ];
    }

    private function mapPembangunan(array $row): array
    {
        $slug = $this->value($row, 'slug') ?: $this->value($row, 'id');

        return [
            'id'               => $this->intValue($row, 'id'),
            'judul'            => $this->value($row, 'judul'),
            'slug'             => $this->value($row, 'slug'),
            'ringkasan'        => $this->excerpt($this->value($row, 'keterangan'), 140),
            'lokasi'           => $this->value($row, 'lokasi'),
            'tahunAnggaran'    => $this->value($row, 'tahun_anggaran'),
            'anggaran'         => $this->intValue($row, 'anggaran'),
            'pelaksana'        => $this->value($row, 'pelaksana_kegiatan'),
            'status'           => $this->intValue($row, 'status') === 1 ? 'aktif' : 'nonaktif',
            'fotoUrl'          => $this->pembangunanImageUrl($this->value($row, 'foto')),
            'url'              => site_url('pembangunan/' . $slug),
        ];
    }

    private function mapProgramBantuan(array $row): array
    {
        return [
            'id'             => $this->intValue($row, 'id'),
            'nama'           => $this->value($row, 'nama'),
            'slug'           => $this->value($row, 'slug'),
            'sasaran'        => [
                'kode'  => $this->intValue($row, 'sasaran'),
                'label' => $this->sasaranLabel($this->intValue($row, 'sasaran')),
            ],
            'deskripsi'      => $this->value($row, 'ndesc'),
            'mulai'          => $this->value($row, 'sdate'),
            'selesai'        => $this->value($row, 'edate'),
            'asalDana'       => $this->value($row, 'asaldana'),
            'jumlahPeserta'  => $this->intValue($row, 'jumlah_peserta'),
            'status'         => $this->intValue($row, 'status') === 1 ? 'aktif' : 'nonaktif',
        ];
    }

    private function countRows(string $table, array $where = [], bool $allowNullConfig = false): int
    {
        if (! $this->db->table_exists($table)) {
            return 0;
        }

        $this->db->from($table);
        $this->applyConfigFilter($table, $allowNullConfig);

        foreach ($where as $field => $value) {
            if ($this->hasField($table, $field)) {
                $this->db->where($field, $value);
            }
        }

        return (int) $this->db->count_all_results();
    }

    private function applyConfigFilter(string $table, bool $allowNull = false): void
    {
        $configId = $this->configId();

        if (! $configId || ! $this->hasField($table, 'config_id')) {
            return;
        }

        if ($allowNull) {
            $this->db->group_start();
            $this->db->where("{$table}.config_id", $configId);
            $this->db->or_where("{$table}.config_id IS NULL", null, false);
            $this->db->group_end();

            return;
        }

        $this->db->where("{$table}.config_id", $configId);
    }

    private function configRow(): ?array
    {
        if (! $this->db->table_exists('config')) {
            return null;
        }

        $configId = $this->configId();
        if ($configId) {
            $this->db->where('id', $configId);
        }

        return $this->db->limit(1)->get('config')->row_array() ?: null;
    }

    private function configId(): ?int
    {
        $id = $this->identitasValue('id');

        return $id ? (int) $id : null;
    }

    private function identitasValue(?string $key = null, mixed $default = null): mixed
    {
        if (! function_exists('identitas')) {
            return $default;
        }

        try {
            $value = $key === null ? identitas() : identitas($key);

            return $value ?: $default;
        } catch (Throwable) {
            return $default;
        }
    }

    private function hasField(string $table, string $field): bool
    {
        static $fields = [];

        if (! isset($fields[$table])) {
            $fields[$table] = $this->db->table_exists($table) ? array_flip($this->db->list_fields($table)) : [];
        }

        return isset($fields[$table][$field]);
    }

    private function value(?array $row, string $key, mixed $default = null): mixed
    {
        if (! $row || ! array_key_exists($key, $row) || $row[$key] === '') {
            return $default;
        }

        return $row[$key];
    }

    private function intValue(?array $row, string $key): int
    {
        return (int) ($this->value($row, $key, 0));
    }

    private function limit(): int
    {
        $limit = (int) ($this->input->get('limit') ?: self::DEFAULT_LIMIT);

        return max(1, min($limit, self::MAX_LIMIT));
    }

    private function excerpt(?string $html, int $length = 180): string
    {
        $text = trim(preg_replace('/\s+/', ' ', strip_tags(html_entity_decode((string) $html, ENT_QUOTES, 'UTF-8'))));

        if (function_exists('mb_strlen') && function_exists('mb_substr')) {
            return mb_strlen($text) > $length ? mb_substr($text, 0, $length - 3) . '...' : $text;
        }

        return strlen($text) > $length ? substr($text, 0, $length - 3) . '...' : $text;
    }

    private function logoUrl(?array $config): ?string
    {
        $logo = $this->value($config, 'logo');

        if (! $logo) {
            return null;
        }

        $base = defined('LOKASI_LOGO_DESA') ? LOKASI_LOGO_DESA : 'desa/logo/';

        return base_url($base . $logo);
    }

    private function articleImageUrl(?string $image): ?string
    {
        if (! $image) {
            return null;
        }

        $base = defined('LOKASI_FOTO_ARTIKEL') ? LOKASI_FOTO_ARTIKEL : 'desa/upload/artikel/';

        return base_url($base . 'sedang_' . $image);
    }

    private function pembangunanImageUrl(?string $image): ?string
    {
        if (! $image) {
            return null;
        }

        $base = defined('LOKASI_GALERI') ? LOKASI_GALERI : 'desa/upload/galeri/';

        return base_url($base . $image);
    }

    private function sasaranLabel(int $code): string
    {
        return match ($code) {
            1       => 'Penduduk',
            2       => 'Keluarga',
            3       => 'Rumah tangga',
            4       => 'Kelompok',
            default => 'Tidak diketahui',
        };
    }

    private function meta(array $extra = []): array
    {
        return array_merge([
            'generated_at' => date(DATE_ATOM),
            'source'       => 'OpenSID Yamansari backend',
        ], $extra);
    }

    private function allowLocalViteDev(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (preg_match('#^http://(127\.0\.0\.1|localhost):(5173|5174|3000)$#', $origin)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET');
            header('Access-Control-Allow-Headers: Content-Type');
        }
    }
}
