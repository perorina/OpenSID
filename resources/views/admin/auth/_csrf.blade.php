@if (config_item('csrf_protection'))
    <input type="hidden" name="{{ $token_name }}" value="{{ $token_value }}">
@endif
