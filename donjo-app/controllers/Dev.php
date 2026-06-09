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

use Illuminate\Support\Facades\DB;

defined('BASEPATH') || exit('No direct script access allowed');

class Dev extends CI_Controller
{
    private const DUMMY_MARKER = 'DUMMY_YAMANSARI';
    private const DUMMY_KK_PREFIX = '3328069900';
    private const DUMMY_PAMONG_NIK_PREFIX = '33280688';
    private const DUMMY_DUSUNS = ['KRAJAN DUMMY', 'KALISOKA DUMMY', 'JATISARI DUMMY', 'KARANGANYAR DUMMY'];

    private array $dummyTableColumns = [];

    public function yamansari_dummy(): void
    {
        if (! $this->canRunYamansariDummySeeder()) {
            show_error('Seeder dummy Yamansari hanya untuk development lokal.', 403);

            return;
        }

        try {
            $result = DB::transaction(fn (): array => $this->seedYamansariDummyData());

            $this->jsonResponse([
                'status'  => 'ok',
                'message' => 'Dummy data Yamansari berhasil dibuat ulang.',
                'data'    => $result,
            ]);
        } catch (Throwable $e) {
            $this->jsonResponse([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function canRunYamansariDummySeeder(): bool
    {
        $remoteAddress = $_SERVER['REMOTE_ADDR'] ?? '';

        return (bool) config_item('yamansari_dev_dummy_enabled')
            && in_array($remoteAddress, ['127.0.0.1', '::1'], true);
    }

    private function seedYamansariDummyData(): array
    {
        $config = DB::table('config')->where('kode_desa', '3328062005')->first()
            ?: DB::table('config')->orderBy('id')->first();

        if (! $config) {
            throw new RuntimeException('Data config desa belum tersedia.');
        }

        $configId = (int) $config->id;
        $userId   = (int) (DB::table('user')->value('id') ?: 1);

        $this->clearYamansariDummyData($configId);

        $clusterIds = $this->seedDummyWilayah($configId);
        $people     = $this->seedDummyFamilies($configId, $clusterIds, $userId);
        $pamong     = $this->seedDummyPamong($configId, $userId);
        $surat      = $this->ensureDummySuratFormat($configId, $userId);

        $this->seedDummyPermohonanSurat($configId, $people['penduduk'], $surat, $userId);
        $this->seedDummyLogSurat($configId, $people['penduduk'], $surat, $pamong, $userId);
        $this->seedDummyPrograms($configId, $people['penduduk'], $userId);
        $this->seedDummyPembangunan($configId, $clusterIds, $userId);
        $this->seedDummyArticles($configId, $userId);

        return [
            'config_id' => $configId,
            'counts'    => $this->dummyCoreCounts($configId),
        ];
    }

    private function clearYamansariDummyData(int $configId): void
    {
        $dummyPendudukIds = DB::table('tweb_penduduk')
            ->where('config_id', $configId)
            ->where('ket', self::DUMMY_MARKER)
            ->pluck('id')
            ->all();

        $dummyKeluargaIds = DB::table('tweb_keluarga')
            ->where('config_id', $configId)
            ->where('no_kk', 'like', self::DUMMY_KK_PREFIX . '%')
            ->pluck('id')
            ->all();

        $dummyProgramIds = DB::table('program')
            ->where('config_id', $configId)
            ->where('slug', 'like', 'dummy-yamansari-%')
            ->pluck('id')
            ->all();

        if ($dummyProgramIds !== []) {
            DB::table('program_peserta')->where('config_id', $configId)->whereIn('program_id', $dummyProgramIds)->delete();
        }

        if ($dummyPendudukIds !== []) {
            DB::table('program_peserta')->where('config_id', $configId)->whereIn('kartu_id_pend', $dummyPendudukIds)->delete();
            DB::table('permohonan_surat')->where('config_id', $configId)->whereIn('id_pemohon', $dummyPendudukIds)->delete();
            DB::table('log_surat')->where('config_id', $configId)->whereIn('id_pend', $dummyPendudukIds)->delete();
            DB::table('log_penduduk')->where('config_id', $configId)->whereIn('id_pend', $dummyPendudukIds)->delete();
        }

        if ($dummyKeluargaIds !== []) {
            DB::table('log_keluarga')->where('config_id', $configId)->whereIn('id_kk', $dummyKeluargaIds)->delete();
        }

        DB::table('artikel')->where('config_id', $configId)->where('slug', 'like', 'dummy-yamansari-%')->delete();
        DB::table('kategori')->where('config_id', $configId)->where('slug', 'like', 'dummy-yamansari-%')->delete();
        DB::table('pembangunan')->where('config_id', $configId)->where('slug', 'like', 'dummy-yamansari-%')->delete();
        DB::table('program')->where('config_id', $configId)->where('slug', 'like', 'dummy-yamansari-%')->delete();
        DB::table('tweb_desa_pamong')->where('config_id', $configId)->where('pamong_nik', 'like', self::DUMMY_PAMONG_NIK_PREFIX . '%')->delete();

        if ($dummyPendudukIds !== []) {
            DB::table('tweb_penduduk')->where('config_id', $configId)->whereIn('id', $dummyPendudukIds)->delete();
        }

        if ($dummyKeluargaIds !== []) {
            DB::table('tweb_keluarga')->where('config_id', $configId)->whereIn('id', $dummyKeluargaIds)->delete();
        }

        DB::table('tweb_wil_clusterdesa')
            ->where('config_id', $configId)
            ->whereIn('dusun', self::DUMMY_DUSUNS)
            ->delete();
    }

    private function seedDummyWilayah(int $configId): array
    {
        $leafClusterIds = [];

        foreach (self::DUMMY_DUSUNS as $dusunIndex => $dusun) {
            $this->insertDummy('tweb_wil_clusterdesa', [
                'config_id' => $configId,
                'rt'        => '0',
                'rw'        => '0',
                'dusun'     => $dusun,
                'urut'      => $dusunIndex + 1,
            ]);

            for ($rw = 1; $rw <= 2; $rw++) {
                $rwLabel = str_pad((string) $rw, 3, '0', STR_PAD_LEFT);

                $this->insertDummy('tweb_wil_clusterdesa', [
                    'config_id' => $configId,
                    'rt'        => '0',
                    'rw'        => $rwLabel,
                    'dusun'     => $dusun,
                    'urut'      => $rw,
                ]);

                for ($rt = 1; $rt <= 3; $rt++) {
                    $leafClusterIds[] = $this->insertDummyGetId('tweb_wil_clusterdesa', [
                        'config_id' => $configId,
                        'rt'        => str_pad((string) $rt, 3, '0', STR_PAD_LEFT),
                        'rw'        => $rwLabel,
                        'dusun'     => $dusun,
                        'urut'      => $rt,
                    ]);
                }
            }
        }

        return $leafClusterIds;
    }

    private function seedDummyFamilies(int $configId, array $clusterIds, int $userId): array
    {
        $families = [];
        $people   = [];

        for ($familyIndex = 1; $familyIndex <= 36; $familyIndex++) {
            $clusterId = $clusterIds[($familyIndex - 1) % count($clusterIds)];
            $noKk      = self::DUMMY_KK_PREFIX . str_pad((string) $familyIndex, 6, '0', STR_PAD_LEFT);
            $alamat    = 'RT ' . str_pad((string) ((($familyIndex - 1) % 3) + 1), 3, '0', STR_PAD_LEFT)
                . ' RW ' . str_pad((string) ((($familyIndex - 1) % 2) + 1), 3, '0', STR_PAD_LEFT)
                . ', Yamansari';

            $head = $this->insertDummyPenduduk($configId, $clusterId, null, 1, 1, $familyIndex, 0, $alamat, $userId);

            $familyId = $this->insertDummyGetId('tweb_keluarga', [
                'config_id'   => $configId,
                'no_kk'       => $noKk,
                'nik_kepala'  => $head['id'],
                'tgl_daftar'  => '2026-01-10 08:00:00',
                'alamat'      => $alamat,
                'id_cluster'  => $clusterId,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $userId,
            ]);

            DB::table('tweb_penduduk')->where('id', $head['id'])->update(['id_kk' => $familyId]);

            $head['id_kk'] = $familyId;
            $families[]    = ['id' => $familyId, 'no_kk' => $noKk, 'head_id' => $head['id']];
            $people[]      = $head;

            $this->insertDummyLogPenduduk($configId, $head, $noKk, $userId);

            if ($familyIndex % 5 !== 0) {
                $spouse = $this->insertDummyPenduduk($configId, $clusterId, $familyId, 3, 2, $familyIndex, 1, $alamat, $userId);
                $people[] = $spouse;
                $this->insertDummyLogPenduduk($configId, $spouse, $noKk, $userId);
            }

            $childCount = 1 + ($familyIndex % 3);

            for ($child = 1; $child <= $childCount; $child++) {
                $childData = $this->insertDummyPenduduk($configId, $clusterId, $familyId, 4, $child % 2 === 0 ? 2 : 1, $familyIndex, $child + 1, $alamat, $userId);
                $people[]  = $childData;
                $this->insertDummyLogPenduduk($configId, $childData, $noKk, $userId);
            }

            $this->insertDummy('log_keluarga', [
                'config_id'      => $configId,
                'id_kk'          => $familyId,
                'id_peristiwa'   => 1,
                'tgl_peristiwa'  => '2026-01-10 08:00:00',
                'id_pend'        => $head['id'],
                'updated_by'     => $userId,
            ]);
        }

        return ['keluarga' => $families, 'penduduk' => $people];
    }

    private function insertDummyPenduduk(int $configId, int $clusterId, ?int $familyId, int $kkLevel, int $sex, int $familyIndex, int $memberIndex, string $alamat, int $userId): array
    {
        $birthDate = $this->dummyBirthDate($kkLevel, $familyIndex, $memberIndex);
        $nik       = $this->dummyNik($sex, $birthDate, ($familyIndex * 10) + $memberIndex);
        $name      = $this->dummyName($sex, $familyIndex, $memberIndex);

        $id = $this->insertDummyGetId('tweb_penduduk', [
            'config_id'            => $configId,
            'nik'                  => $nik,
            'nama'                 => $name,
            'id_kk'                => $familyId,
            'kk_level'             => $kkLevel,
            'id_rtm'               => '0',
            'rtm_level'            => 0,
            'sex'                  => $sex,
            'tempatlahir'          => 'Tegal',
            'tanggallahir'         => $birthDate,
            'agama_id'             => 1,
            'golongan_darah_id'    => 13,
            'pendidikan_kk_id'     => $kkLevel === 4 ? 4 : 6,
            'pendidikan_sedang_id' => $kkLevel === 4 ? 4 : 1,
            'pekerjaan_id'         => $kkLevel === 4 ? 1 : 2,
            'status_kawin'         => $kkLevel === 4 ? 1 : 2,
            'warganegara_id'       => 1,
            'hamil'                => 0,
            'cacat_id'             => 7,
            'sakit_menahun_id'     => 13,
            'cara_kb_id'           => $kkLevel === 4 ? null : 1,
            'ktp_el'               => 1,
            'status_rekam'         => 2,
            'id_asuransi'          => 1,
            'bahasa_id'            => 1,
            'id_cluster'           => $clusterId,
            'status'               => 1,
            'alamat_sekarang'      => $alamat,
            'status_dasar'         => 1,
            'telepon'              => '08' . str_pad((string) (1200000000 + ($familyIndex * 100) + $memberIndex), 10, '0', STR_PAD_LEFT),
            'email'                => 'dummy' . $familyIndex . '-' . $memberIndex . '@yamansari.local',
            'ket'                  => self::DUMMY_MARKER,
            'created_at'           => date('Y-m-d H:i:s'),
            'updated_at'           => date('Y-m-d H:i:s'),
            'created_by'           => $userId,
            'updated_by'           => $userId,
        ]);

        return [
            'id'            => $id,
            'nik'           => $nik,
            'nama'          => $name,
            'tanggallahir'  => $birthDate,
            'alamat'        => $alamat,
            'id_kk'         => $familyId,
        ];
    }

    private function insertDummyLogPenduduk(int $configId, array $person, string $noKk, int $userId): void
    {
        $this->insertDummy('log_penduduk', [
            'config_id'       => $configId,
            'id_pend'         => $person['id'],
            'kode_peristiwa'  => 5,
            'tgl_lapor'       => '2026-01-10 08:00:00',
            'tgl_peristiwa'   => '2026-01-10 08:00:00',
            'catatan'         => self::DUMMY_MARKER,
            'no_kk'           => $noKk,
            'nama_kk'         => $person['nama'],
            'created_at'      => date('Y-m-d H:i:s'),
            'updated_at'      => date('Y-m-d H:i:s'),
            'created_by'      => $userId,
            'updated_by'      => $userId,
        ]);
    }

    private function seedDummyPamong(int $configId, int $userId): object
    {
        $jabatanIds = DB::table('ref_jabatan')->orderBy('id')->pluck('id')->all();
        $fallbackId = (int) ($jabatanIds[0] ?? 1);
        $pamongRows = [
            ['nama' => 'Arif Wibowo', 'jabatan' => $jabatanIds[0] ?? $fallbackId, 'ttd' => 1],
            ['nama' => 'Dwi Lestari', 'jabatan' => $jabatanIds[1] ?? $fallbackId, 'ttd' => 1],
            ['nama' => 'Hendra Prasetyo', 'jabatan' => $jabatanIds[2] ?? $fallbackId, 'ttd' => 0],
            ['nama' => 'Rina Kartika', 'jabatan' => $jabatanIds[3] ?? $fallbackId, 'ttd' => 0],
            ['nama' => 'Slamet Riyadi', 'jabatan' => $jabatanIds[4] ?? $fallbackId, 'ttd' => 0],
        ];

        foreach ($pamongRows as $index => $row) {
            $this->insertDummy('tweb_desa_pamong', [
                'config_id'              => $configId,
                'pamong_nama'            => $row['nama'],
                'pamong_nik'             => self::DUMMY_PAMONG_NIK_PREFIX . str_pad((string) ($index + 1), 8, '0', STR_PAD_LEFT),
                'pamong_status'          => 1,
                'pamong_tgl_terdaftar'   => '2026-01-10',
                'pamong_ttd'             => $row['ttd'],
                'pamong_tempatlahir'     => 'Tegal',
                'pamong_tanggallahir'    => '1985-02-15',
                'pamong_sex'             => $index % 2 === 0 ? 1 : 2,
                'pamong_pendidikan'      => 6,
                'pamong_agama'           => 1,
                'pamong_nosk'            => 'SK-DUMMY-' . str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT),
                'pamong_tglsk'           => '2026-01-10',
                'urut'                   => $index + 1,
                'pamong_niap'            => 'NIAP-DUMMY-' . ($index + 1),
                'kehadiran'              => 1,
                'jabatan_id'             => $row['jabatan'],
            ]);
        }

        return DB::table('tweb_desa_pamong')
            ->where('config_id', $configId)
            ->where('pamong_nik', 'like', self::DUMMY_PAMONG_NIK_PREFIX . '%')
            ->orderBy('urut')
            ->first();
    }

    private function ensureDummySuratFormat(int $configId, int $userId): object
    {
        $surat = DB::table('tweb_surat_format')->where('config_id', $configId)->orderBy('id')->first();

        if ($surat) {
            return $surat;
        }

        $id = $this->insertDummyGetId('tweb_surat_format', [
            'config_id'     => $configId,
            'nama'          => 'Surat Keterangan Domisili',
            'url_surat'     => 'surat-keterangan-domisili-dummy',
            'kode_surat'    => '470',
            'kunci'         => 0,
            'favorit'       => 1,
            'jenis'         => 3,
            'mandiri'       => 1,
            'template'      => '<p>Surat keterangan domisili dummy Yamansari.</p>',
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s'),
            'created_by'    => $userId,
            'updated_by'    => $userId,
        ]);

        return DB::table('tweb_surat_format')->where('id', $id)->first();
    }

    private function seedDummyPermohonanSurat(int $configId, array $people, object $surat, int $userId): void
    {
        foreach (array_slice($people, 0, 12) as $index => $person) {
            $this->insertDummy('permohonan_surat', [
                'config_id'    => $configId,
                'id_pemohon'   => $person['id'],
                'id_surat'     => $surat->id,
                'isian_form'   => json_encode(['keperluan' => 'Keperluan dummy development Yamansari']),
                'status'       => $index < 8 ? 1 : 3,
                'keterangan'   => self::DUMMY_MARKER,
                'no_hp_aktif'  => '08123456' . str_pad((string) $index, 4, '0', STR_PAD_LEFT),
                'syarat'       => json_encode([]),
                'created_at'   => date('Y-m-d H:i:s', strtotime('-' . ($index + 1) . ' day')),
                'updated_at'   => date('Y-m-d H:i:s'),
                'no_antrian'   => 'YM-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
            ]);
        }
    }

    private function seedDummyLogSurat(int $configId, array $people, object $surat, object $pamong, int $userId): void
    {
        foreach (array_slice($people, 12, 18) as $index => $person) {
            $tanggal = strtotime('-' . ($index + 2) . ' day');

            $this->insertDummy('log_surat', [
                'config_id'              => $configId,
                'id_format_surat'        => $surat->id,
                'id_pend'                => $person['id'],
                'id_pamong'              => $pamong->pamong_id,
                'nama_pamong'            => $pamong->pamong_nama,
                'nama_jabatan'           => 'Pemerintah Desa',
                'id_user'                => $userId,
                'tanggal'                => date('Y-m-d H:i:s', $tanggal),
                'bulan'                  => date('m', $tanggal),
                'tahun'                  => date('Y', $tanggal),
                'no_surat'               => str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT) . '/YM/VI/2026',
                'nama_surat'             => 'Surat Keterangan Domisili',
                'keterangan'             => self::DUMMY_MARKER,
                'lokasi_arsip'           => 'dummy/yamansari',
                'status'                 => 1,
                'verifikasi_operator'    => 1,
                'verifikasi_kades'       => 1,
                'isi_surat'              => '<p>Isi surat dummy untuk ' . $person['nama'] . '.</p>',
                'kecamatan'              => 1,
                'pemohon'                => json_encode(['id_pend' => $person['id'], 'nik' => $person['nik'], 'nama' => $person['nama']]),
            ]);
        }
    }

    private function seedDummyPrograms(int $configId, array $people, int $userId): void
    {
        $programs = [
            ['Dummy - Bantuan Pangan Yamansari', 'dummy-yamansari-bantuan-pangan', 'Ketahanan pangan keluarga rentan'],
            ['Dummy - BLT Dana Desa', 'dummy-yamansari-blt-dana-desa', 'Bantuan tunai untuk warga prioritas'],
            ['Dummy - Bantuan Lansia', 'dummy-yamansari-bantuan-lansia', 'Pendampingan warga lanjut usia'],
            ['Dummy - Pelatihan UMKM', 'dummy-yamansari-pelatihan-umkm', 'Pelatihan usaha kecil warga'],
            ['Dummy - Rumah Layak Huni', 'dummy-yamansari-rumah-layak-huni', 'Pendataan rumah tidak layak huni'],
        ];

        foreach ($programs as $programIndex => $program) {
            $programId = $this->insertDummyGetId('program', [
                'config_id'  => $configId,
                'nama'       => $program[0],
                'slug'       => $program[1],
                'sasaran'    => 1,
                'ndesc'      => $program[2],
                'sdate'      => '2026-01-01',
                'edate'      => '2026-12-31',
                'userid'     => $userId,
                'status'     => 1,
                'asaldana'   => 'APBDes',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            foreach (array_slice($people, $programIndex * 6, 10) as $person) {
                $this->insertDummy('program_peserta', [
                    'config_id'            => $configId,
                    'peserta'              => (string) $person['id'],
                    'program_id'           => $programId,
                    'no_id_kartu'          => 'KRT-YM-' . $programId . '-' . $person['id'],
                    'kartu_nik'            => $person['nik'],
                    'kartu_nama'           => $person['nama'],
                    'kartu_tempat_lahir'   => 'Tegal',
                    'kartu_tanggal_lahir'  => $person['tanggallahir'],
                    'kartu_alamat'         => $person['alamat'],
                    'kartu_id_pend'        => $person['id'],
                    'created_at'           => date('Y-m-d H:i:s'),
                    'updated_at'           => date('Y-m-d H:i:s'),
                    'created_by'           => $userId,
                    'updated_by'           => $userId,
                ]);
            }
        }
    }

    private function seedDummyPembangunan(int $configId, array $clusterIds, int $userId): void
    {
        $items = [
            ['Perbaikan Jalan Lingkungan RT 001', 'dummy-yamansari-jalan-rt-001', 180000000],
            ['Drainase Lingkungan Kalisoka', 'dummy-yamansari-drainase-kalisoka', 95000000],
            ['Rehab Posyandu Yamansari', 'dummy-yamansari-rehab-posyandu', 75000000],
            ['Lampu Penerangan Jalan Desa', 'dummy-yamansari-lampu-jalan', 62000000],
            ['Ruang Arsip Pelayanan Desa', 'dummy-yamansari-ruang-arsip', 120000000],
        ];

        foreach ($items as $index => $item) {
            $this->insertDummy('pembangunan', [
                'config_id'                 => $configId,
                'id_lokasi'                 => $clusterIds[$index % count($clusterIds)],
                'sumber_dana'               => 'APBDes 2026',
                'judul'                     => 'Dummy - ' . $item[0],
                'slug'                      => $item[1],
                'keterangan'                => 'Data pembangunan dummy untuk validasi dashboard Yamansari.',
                'lokasi'                    => 'Desa Yamansari',
                'volume'                    => ($index + 1) . ' paket',
                'tahun_anggaran'            => 2026,
                'pelaksana_kegiatan'        => 'TPK Yamansari',
                'status'                    => 1,
                'created_at'                => date('Y-m-d H:i:s'),
                'updated_at'                => date('Y-m-d H:i:s'),
                'anggaran'                  => $item[2],
                'sumber_biaya_pemerintah'   => $item[2],
                'sumber_biaya_jumlah'       => $item[2],
                'manfaat'                   => 'Memudahkan pelayanan dan aktivitas warga.',
                'waktu'                     => 90,
                'satuan_waktu'              => 3,
                'sifat_proyek'              => 'BARU',
            ]);
        }
    }

    private function seedDummyArticles(int $configId, int $userId): void
    {
        $categoryId = $this->insertDummyGetId('kategori', [
            'config_id' => $configId,
            'kategori'  => 'Dummy Yamansari',
            'tipe'      => 1,
            'urut'      => 1,
            'enabled'   => 1,
            'parrent'   => 0,
            'slug'      => 'dummy-yamansari-kabar',
        ]);

        $titles = [
            'Agenda Musyawarah Perencanaan Desa Yamansari',
            'Pengumuman Pelayanan Administrasi Kependudukan',
            'Kegiatan Posyandu dan Pemeriksaan Kesehatan Warga',
            'Informasi Program Bantuan Pangan Tahun 2026',
            'Dokumentasi Pembangunan Jalan Lingkungan',
            'Jadwal Pelayanan Surat di Kantor Desa',
        ];

        foreach ($titles as $index => $title) {
            $this->insertDummy('artikel', [
                'config_id'       => $configId,
                'isi'             => '<p>Konten dummy development untuk menguji publikasi website Yamansari.</p>',
                'enabled'         => 1,
                'tgl_upload'      => date('Y-m-d H:i:s', strtotime('-' . ($index + 1) . ' day')),
                'id_kategori'     => $categoryId,
                'id_user'         => $userId,
                'judul'           => 'Dummy - ' . $title,
                'headline'        => $index === 0 ? 1 : 0,
                'boleh_komentar'  => 0,
                'slug'            => 'dummy-yamansari-artikel-' . ($index + 1),
                'hit'             => 12 + $index,
                'slider'          => $index < 2 ? 1 : 0,
            ]);
        }
    }

    private function dummyCoreCounts(int $configId): array
    {
        return [
            'wilayah'          => DB::table('tweb_wil_clusterdesa')->where('config_id', $configId)->count(),
            'penduduk_aktif'   => DB::table('tweb_penduduk')->where('config_id', $configId)->where('status_dasar', 1)->count(),
            'keluarga'         => DB::table('tweb_keluarga')->where('config_id', $configId)->count(),
            'pamong'           => DB::table('tweb_desa_pamong')->where('config_id', $configId)->count(),
            'permohonan_baru'  => DB::table('permohonan_surat')->where('config_id', $configId)->where('status', 1)->count(),
            'surat_tercetak'   => DB::table('log_surat')->where('config_id', $configId)->where('status', 1)->count(),
            'program_bantuan'  => DB::table('program')->where('config_id', $configId)->count(),
            'peserta_bantuan'  => DB::table('program_peserta')->where('config_id', $configId)->count(),
            'pembangunan'      => DB::table('pembangunan')->where('config_id', $configId)->count(),
            'artikel'          => DB::table('artikel')->where('config_id', $configId)->count(),
        ];
    }

    private function dummyBirthDate(int $kkLevel, int $familyIndex, int $memberIndex): string
    {
        $year = match ($kkLevel) {
            1       => 1968 + ($familyIndex % 18),
            3       => 1970 + ($familyIndex % 18),
            default => 2004 + (($familyIndex + $memberIndex) % 15),
        };

        $month = str_pad((string) ((($familyIndex + $memberIndex) % 12) + 1), 2, '0', STR_PAD_LEFT);
        $day   = str_pad((string) ((($familyIndex * 2 + $memberIndex) % 27) + 1), 2, '0', STR_PAD_LEFT);

        return $year . '-' . $month . '-' . $day;
    }

    private function dummyNik(int $sex, string $birthDate, int $sequence): string
    {
        [$year, $month, $day] = explode('-', $birthDate);
        $dayNumber = (int) $day + ($sex === 2 ? 40 : 0);

        return '332806'
            . str_pad((string) $dayNumber, 2, '0', STR_PAD_LEFT)
            . $month
            . substr($year, -2)
            . str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }

    private function dummyName(int $sex, int $familyIndex, int $memberIndex): string
    {
        $maleNames = ['Ahmad', 'Budi', 'Dedi', 'Eko', 'Fajar', 'Hendra', 'Joko', 'Miftah', 'Rudi', 'Slamet', 'Agus', 'Wawan'];
        $femaleNames = ['Siti', 'Dewi', 'Rina', 'Nur', 'Lestari', 'Sri', 'Ayu', 'Wulan', 'Fitri', 'Lina', 'Rahayu', 'Kartika'];
        $lastNames = ['Prasetyo', 'Santoso', 'Hidayat', 'Saputra', 'Kurniawan', 'Purnomo', 'Wijaya', 'Nugroho'];
        $firstNames = $sex === 2 ? $femaleNames : $maleNames;

        return $firstNames[($familyIndex + $memberIndex) % count($firstNames)] . ' '
            . $lastNames[($familyIndex * 2 + $memberIndex) % count($lastNames)];
    }

    private function insertDummy(string $table, array $data): void
    {
        DB::table($table)->insert($this->filterDummyTableData($table, $data));
    }

    private function insertDummyGetId(string $table, array $data): int
    {
        return (int) DB::table($table)->insertGetId($this->filterDummyTableData($table, $data));
    }

    private function filterDummyTableData(string $table, array $data): array
    {
        return array_intersect_key($data, array_flip($this->dummyTableColumns($table)));
    }

    private function dummyTableColumns(string $table): array
    {
        if (! isset($this->dummyTableColumns[$table])) {
            $escapedTable = str_replace('`', '``', $table);

            $this->dummyTableColumns[$table] = array_map(
                static fn (object $column): string => $column->Field,
                DB::select("SHOW COLUMNS FROM `{$escapedTable}`")
            );
        }

        return $this->dummyTableColumns[$table];
    }

    private function jsonResponse(array $payload, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }
}
