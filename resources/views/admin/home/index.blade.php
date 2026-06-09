@extends('admin.layouts.index')

@push('css')
    <style>
        .catatan-scroll {
            height: 400px;
            overflow-y: scroll;
        }

        .yamansari-dashboard-title {
            margin-bottom: 18px;
        }

        .yamansari-group-title {
            margin: 8px 0 12px;
            font-size: 15px;
            font-weight: 700;
            color: #2f3b45;
        }

        .yamansari-action-box {
            min-height: 112px;
            border-radius: 6px;
        }

        .yamansari-action-box .inner h3 {
            margin: 0;
            font-size: 19px;
            line-height: 1.25;
            white-space: normal;
        }

        .yamansari-action-box .icon {
            top: 12px;
        }

        .yamansari-action-box .small-box-footer {
            border-radius: 0 0 6px 6px;
        }

        @media (max-width: 576px) {
            .komunikasi-opendk {
                display: none !important;
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

    @if (config_item('yamansari_core_dashboard'))
        <div class="yamansari-dashboard-title">
            <h4>Fitur Inti</h4>
        </div>

        @foreach ($coreScopeCards as $group => $cards)
            <div class="row">
                <div class="col-xs-12">
                    <div class="yamansari-group-title">{{ $group }}</div>
                </div>

                @foreach ($cards as $card)
                    @can("{$card['akses']}:baca")
                        <div class="col-lg-3 col-sm-6 col-xs-12">
                            <div class="small-box yamansari-action-box {{ $card['tone'] }}">
                                <div class="inner">
                                    <h3>{{ $card['title'] }}</h3>
                                </div>
                                <div class="icon">
                                    <i class="fa {{ $card['icon'] }}"></i>
                                </div>
                                <a href="{{ ci_route($card['link']) }}" class="small-box-footer">Buka <i class="fa fa-arrow-circle-right"></i></a>
                            </div>
                        </div>
                    @endcan
                @endforeach
            </div>
        @endforeach

        @if (count($shortcut))
            <div class="row">
                <div class="col-xs-12">
                    <div class="yamansari-group-title">Ringkasan Data</div>
                </div>
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
                                <a href="{{ ci_route($sc['link'] ?? '#') }}" class="small-box-footer text-white" style="border-radius: 0 0 5px 5px">Lihat Detail <i class="fa fa-arrow-circle-right"></i></a>
                            </div>
                        </div>
                    @endcan
                @endforeach
            </div>
        @endif

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
