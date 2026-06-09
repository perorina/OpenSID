@extends('admin.auth.index')

@php
    preg_match('/(\d+)/', $errors?->first('email'), $matches);
    $second = $matches[0] ?? 0;
@endphp

@section('content')
    <form id="validasi" class="login-form" action="{{ $form_action }}" method="post">
        @include('admin.auth._csrf')

        <div class="form-group">
            <input
                name="username"
                type="text"
                autocomplete="off"
                placeholder="Nama pengguna"
                @disabled($second)
                class="form-username form-control required"
                maxlength="100"
            >
        </div>
        <div class="form-group">
            <input
                id="password"
                name="password"
                type="password"
                autocomplete="off"
                placeholder="Kata sandi"
                @disabled($second)
                class="form-username form-control required"
                maxlength="100"
            >
        </div>

        <div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;">
            <input name="login_guard" type="text" tabindex="-1" autocomplete="off" value="">
        </div>

        <div class="form-group">
            <input @disabled($second) type="checkbox" id="checkbox" class="form-checkbox">
            <label for="checkbox" style="font-weight: unset">Tampilkan kata sandi</label>
            <a href="{{ site_url('siteman/lupa_sandi') }}" class="btn" role="button" aria-pressed="true">Lupa kata sandi?</a>
        </div>
        <div class="form-group">
            <button type="submit" class="btn" @disabled($second)>Masuk</button>
        </div>

        @if (setting('login_otp'))
            <div class="form-group text-center">
                <a href="{{ ci_route('siteman.otp.form_login_otp') }}" class="btn" role="button" aria-pressed="true">Masuk dengan OTP</a>
            </div>
        @endif
    </form>
@endsection

@push('js')
    <script>
        function start_countdown() {
            let totalSeconds = {{ $second }};
            const timer = setInterval(function() {
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;

                if (totalSeconds <= 0) {
                    clearInterval(timer);
                    location.reload();
                } else {
                    document.getElementById("countdown").innerHTML = `Terlalu banyak upaya masuk. Silakan coba lagi dalam ${minutes} menit ${seconds} detik.`;
                    totalSeconds--;
                }
            }, 1000);
        }

        document.addEventListener('DOMContentLoaded', function() {
            const pass = document.getElementById('password');
            const checkbox = document.getElementById('checkbox');

            checkbox.addEventListener('change', function() {
                pass.type = checkbox.checked ? 'text' : 'password';
            });

            if (document.getElementById('countdown')) {
                start_countdown();
            }

            // Hapus localStorage untuk timer OTP login setiap kali halaman login utama dimuat.
            // Ini untuk memastikan timer direset jika pengguna kembali ke halaman ini
            // setelah gagal OTP atau membatalkan proses.
            localStorage.removeItem('otpLoginExpiry');
        });
    </script>
@endpush
