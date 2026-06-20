<?php

declare(strict_types=1);

use Illuminate\Encryption\Encrypter;

function fail(string $message): void
{
    fwrite(STDERR, 'opensid-db-config: ' . $message . PHP_EOL);
    exit(1);
}

function repo_root(): string
{
    $root = realpath(dirname(__DIR__, 3));
    if ($root === false) {
        fail('cannot resolve repository root');
    }

    return $root;
}

function app_key_bytes(string $root): string
{
    $keyPath = $root . DIRECTORY_SEPARATOR . 'desa' . DIRECTORY_SEPARATOR . 'app_key';
    if (! is_file($keyPath)) {
        fail('desa/app_key not found');
    }

    $key = trim((string) file_get_contents($keyPath));
    if (str_starts_with($key, 'base64:')) {
        $decoded = base64_decode(substr($key, 7), true);
        if ($decoded === false) {
            fail('desa/app_key is not valid base64');
        }

        return $decoded;
    }

    return $key;
}

function read_database_config(string $root): array
{
    $configPath = $root . DIRECTORY_SEPARATOR . 'desa' . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'database.php';
    if (! is_file($configPath)) {
        fail('desa/config/database.php not found');
    }

    $db = [];
    include $configPath;

    if (! isset($db['default']) || ! is_array($db['default'])) {
        fail('default database config not found');
    }

    return $db['default'];
}

function decrypted_password(string $root, mixed $password): string
{
    $password = (string) $password;
    if ($password === '' || strlen($password) <= 80) {
        return $password;
    }

    $autoload = $root . DIRECTORY_SEPARATOR . 'vendor' . DIRECTORY_SEPARATOR . 'autoload.php';
    if (! is_file($autoload)) {
        fail('vendor/autoload.php not found');
    }
    require_once $autoload;

    try {
        return (new Encrypter(app_key_bytes($root), 'AES-256-CBC'))->decrypt($password);
    } catch (Throwable $error) {
        fail('cannot decrypt database password: ' . $error->getMessage());
    }
}

function output_format(array $argv): string
{
    foreach ($argv as $arg) {
        if (str_starts_with($arg, '--format=')) {
            return substr($arg, strlen('--format='));
        }
    }

    return 'check';
}

$root = repo_root();
$config = read_database_config($root);
$collation = (string) ($config['dbcollat'] ?? 'utf8mb4_general_ci');
$charset = trim(strtok($collation, '_') ?: 'utf8mb4');

$payload = [
    'hostname' => (string) ($config['hostname'] ?? '127.0.0.1'),
    'username' => (string) ($config['username'] ?? ''),
    'password' => decrypted_password($root, $config['password'] ?? ''),
    'port' => (int) ($config['port'] ?? 3306),
    'database' => (string) ($config['database'] ?? ''),
    'charset' => $charset,
    'collation' => $collation,
];

if ($payload['username'] === '' || $payload['database'] === '') {
    fail('database username or database name is empty');
}

if (output_format($argv) === 'json') {
    echo json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit(0);
}

echo 'ok: ' . $payload['username'] . '@' . $payload['hostname'] . ':' . $payload['port'] . '/' . $payload['database'];
echo ' password_length=' . strlen($payload['password']) . PHP_EOL;
