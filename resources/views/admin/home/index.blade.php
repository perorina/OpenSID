@extends('admin.layouts.index')

@push('css')
    <style>
        .catatan-scroll {
            height: 400px;
            overflow-y: scroll;
        }

        .yamansari-dashboard {
            color: #24313d;
        }

        .yamansari-dashboard a {
            color: inherit;
        }

        .yamansari-overview {
            display: flex;
            flex-wrap: wrap;
            gap: 14px;
            align-items: stretch;
            margin-bottom: 18px;
        }

        .yamansari-overview-main {
            flex: 1 1 360px;
            min-height: 132px;
            padding: 18px 20px;
            border-left: 4px solid #1f8a70;
            background: #ffffff;
            box-shadow: 0 1px 2px rgba(0, 0, 0, .06);
        }

        .yamansari-overview-main h2 {
            margin: 0 0 8px;
            font-size: 24px;
            font-weight: 700;
        }

        .yamansari-overview-main p {
            max-width: 760px;
            margin: 0;
            color: #586674;
            line-height: 1.55;
        }

        .yamansari-status-strip {
            display: flex;
            flex: 0 1 360px;
            flex-wrap: wrap;
            gap: 8px;
            align-content: flex-start;
            padding: 16px;
            background: #ffffff;
            box-shadow: 0 1px 2px rgba(0, 0, 0, .06);
        }

        .yamansari-status-pill {
            display: inline-flex;
            gap: 7px;
            align-items: center;
            min-height: 32px;
            padding: 6px 10px;
            border: 1px solid #dce4ea;
            border-radius: 4px;
            color: #34495e;
            background: #f9fbfc;
            font-size: 12px;
            font-weight: 700;
        }

        .yamansari-status-pill.is-good {
            border-color: #b7dfce;
            color: #176a55;
            background: #effaf5;
        }

        .yamansari-section-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 22px 0 12px;
            border-bottom: 1px solid #d9e0e6;
        }

        .yamansari-section-title h3 {
            margin: 0;
            padding-bottom: 8px;
            font-size: 18px;
            font-weight: 700;
        }

        .yamansari-stats-grid,
        .yamansari-feature-grid,
        .yamansari-workflow-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
        }

        .yamansari-stat,
        .yamansari-feature,
        .yamansari-workflow-step {
            display: flex;
            min-height: 104px;
            padding: 14px;
            border: 1px solid #dce4ea;
            border-radius: 6px;
            background: #ffffff;
            box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
        }

        .yamansari-stat:hover,
        .yamansari-feature:hover {
            border-color: #92b8d4;
            text-decoration: none;
        }

        .yamansari-stat {
            align-items: center;
            gap: 12px;
        }

        .yamansari-stat-icon,
        .yamansari-feature-icon,
        .yamansari-workflow-icon {
            display: inline-flex;
            flex: 0 0 38px;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 6px;
            color: #ffffff;
            background: #2f6f9f;
        }

        .yamansari-stat:nth-child(2n) .yamansari-stat-icon,
        .yamansari-feature:nth-child(2n) .yamansari-feature-icon,
        .yamansari-workflow-step:nth-child(2n) .yamansari-workflow-icon {
            background: #1f8a70;
        }

        .yamansari-stat:nth-child(3n) .yamansari-stat-icon,
        .yamansari-feature:nth-child(3n) .yamansari-feature-icon,
        .yamansari-workflow-step:nth-child(3n) .yamansari-workflow-icon {
            background: #a66a20;
        }

        .yamansari-stat-count {
            display: block;
            font-size: 25px;
            line-height: 1;
            font-weight: 700;
        }

        .yamansari-stat-label {
            display: block;
            margin-top: 4px;
            color: #2f3b45;
            font-weight: 700;
        }

        .yamansari-stat-context {
            display: block;
            margin-top: 2px;
            color: #6c7a86;
            font-size: 12px;
        }

        .yamansari-workstream {
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px solid #d9e0e6;
        }

        .yamansari-workstream-header {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 12px;
        }

        .yamansari-workstream-header h4 {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
        }

        .yamansari-workstream-header p {
            margin: 2px 0 0;
            color: #6c7a86;
        }

        .yamansari-feature {
            gap: 12px;
        }

        .yamansari-feature-copy strong,
        .yamansari-workflow-copy strong {
            display: block;
            margin-bottom: 4px;
            font-size: 15px;
        }

        .yamansari-feature-copy span,
        .yamansari-workflow-copy span {
            display: block;
            color: #637381;
            line-height: 1.45;
        }

        .yamansari-feature-output {
            display: inline-block;
            margin-top: 8px;
            padding: 3px 7px;
            border-radius: 4px;
            color: #176a55;
            background: #effaf5;
            font-size: 12px;
            font-style: normal;
            font-weight: 700;
        }

        .yamansari-workflow-step {
            gap: 12px;
            min-height: 92px;
        }

        .yamansari-parked {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }

        .yamansari-parked span {
            padding: 5px 8px;
            border: 1px solid #d9e0e6;
            border-radius: 4px;
            color: #667481;
            background: #ffffff;
            font-size: 12px;
        }

        @media (max-width: 576px) {
            .komunikasi-opendk {
                display: none !important;
            }
        }

        @media (max-width: 1199px) {
            .yamansari-stats-grid,
            .yamansari-feature-grid,
            .yamansari-workflow-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 640px) {
            .yamansari-overview-main,
            .yamansari-status-strip {
                flex-basis: 100%;
            }

            .yamansari-stats-grid,
            .yamansari-feature-grid,
            .yamansari-workflow-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
@endpush

@section('title')
    <h1>
        @if (config_item('yamansari_core_dashboard'))
            Dashboard Yamansari
            <small>Operasional desa</small>
        @else
            Tentang
            <?= config_item('nama_aplikasi') ?>
        @endif
    </h1>
@endsection

@section('breadcrumb')
    <li class="active">Beranda</li>
@endsection

@section('content')
    @include('admin.layouts.components.notifikasi')

    @if ($coreDashboard)
        <div class="yamansari-dashboard">
            <div class="yamansari-overview">
                <div class="yamansari-overview-main">
                    <h2>Ruang Kerja Internal Yamansari</h2>
                    <p>Data dasar, layanan warga, program desa, publikasi, dan administrasi sistem disusun sebagai pekerjaan inti tahap 1.</p>
                </div>
                <div class="yamansari-status-strip">
                    <span class="yamansari-status-pill is-good"><i class="fa fa-check-circle"></i> Mode inti aktif</span>
                    <span class="yamansari-status-pill is-good"><i class="fa fa-shield"></i> Tracking mati</span>
                    <span class="yamansari-status-pill is-good"><i class="fa fa-plug"></i> Cek OpenDesa mati</span>
                    <span class="yamansari-status-pill"><i class="fa fa-map"></i> IDM {{ config_item('status_desa_external_checks') ? 'real' : 'lokal' }}</span>
                </div>
            </div>

            <div class="yamansari-section-title">
                <h3>Ringkasan Inti</h3>
            </div>
            <div class="yamansari-stats-grid">
                @foreach ($coreScopeStats as $stat)
                    @can("{$stat['akses']}:baca")
                        <a class="yamansari-stat" href="{{ ci_route($stat['link']) }}">
                            <span class="yamansari-stat-icon"><i class="fa {{ $stat['icon'] }}"></i></span>
                            <span>
                                <span class="yamansari-stat-count">{{ number_format($stat['count'], 0, ',', '.') }}</span>
                                <span class="yamansari-stat-label">{{ $stat['label'] }}</span>
                                <span class="yamansari-stat-context">{{ $stat['context'] }}</span>
                            </span>
                        </a>
                    @endcan
                @endforeach
            </div>

            <div class="yamansari-section-title">
                <h3>Alur Operasional</h3>
            </div>
            <div class="yamansari-workflow-grid">
                @foreach ($coreWorkflow as $item)
                    <div class="yamansari-workflow-step">
                        <span class="yamansari-workflow-icon"><i class="fa {{ $item['icon'] }}"></i></span>
                        <span class="yamansari-workflow-copy">
                            <strong>{{ $item['title'] }}</strong>
                            <span>{{ $item['body'] }}</span>
                        </span>
                    </div>
                @endforeach
            </div>

            <div class="yamansari-section-title">
                <h3>Fitur Inti Tahap 1</h3>
            </div>

            @foreach ($coreScopeCards as $group => $cards)
                <div class="yamansari-workstream">
                    <div class="yamansari-workstream-header">
                        <span class="yamansari-feature-icon"><i class="fa fa-folder-open-o"></i></span>
                        <span>
                            <h4>{{ $group }}</h4>
                            <p>{{ count($cards) }} modul kerja utama</p>
                        </span>
                    </div>
                    <div class="yamansari-feature-grid">
                        @foreach ($cards as $card)
                            @can("{$card['akses']}:baca")
                                <a class="yamansari-feature" href="{{ ci_route($card['link']) }}">
                                    <span class="yamansari-feature-icon"><i class="fa {{ $card['icon'] }}"></i></span>
                                    <span class="yamansari-feature-copy">
                                        <strong>{{ $card['title'] }}</strong>
                                        <span>{{ $card['summary'] }}</span>
                                        <em class="yamansari-feature-output">{{ $card['output'] }}</em>
                                    </span>
                                </a>
                            @endcan
                        @endforeach
                    </div>
                </div>
            @endforeach

            <div class="yamansari-section-title">
                <h3>Diparkir Dulu</h3>
            </div>
            <div class="yamansari-parked">
                @foreach ($coreParkingLot as $parked)
                    <span>{{ $parked }}</span>
                @endforeach
            </div>
        </div>

    @else
        @include('admin.home.saas')

        @include('admin.home.premium')

        @include('admin.home.rilis')

        @include('admin.home.percobaan')

        <div class="row">
            @foreach ($shortcut as $sc)
                @can("{$sc['akses']}:baca")
                    <div class="col-lg-3 col-sm-6 col-xs-12">
                        <div class="small-box" style="background-color: {!! $sc['warna'] !!}; border-radius: 5px;">
                            <div class="inner">
                                <h3 class="text-white">{{ $sc['count'] ?? '0' }}</h3>
                                <p class="text-white">{{ SebutanDesa($sc['judul']) }}</p>
                            </div>
                            <div class="icon">
                                <i class="faa {!! $sc['icon'] !!}"></i>
                            </div>
                            <a href="{{ ci_route($sc['link'] ?? '#') }}" class="small-box-footer text-white" style="border-radius:  0 0 5px 5px">Lihat Detail <i class="fa fa-arrow-circle-right"></i></a>
                        </div>
                    </div>
                @endcan
            @endforeach
        </div>
    @endif
@endsection
