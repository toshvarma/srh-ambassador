<?php

/**
 * SRH Ambassador Standalone API Entry Point
 *
 * INSTALLATION:
 *   1. Copy this file to:  [joomla-root]/srh-api/index.php
 *   2. In [joomla-root]/.htaccess, add ONE line BEFORE the existing catch-all:
 *
 *        RewriteRule ^srh-api(/.*)?$ srh-api/index.php [L,QSA]
 *
 *   3. Visit http://joomla-cms.test/srh-api/health to confirm it's working.
 *
 * Routes (base: http://joomla-cms.test/srh-api):
 *   POST   /auth/login         → log in, returns JWT
 *   GET    /users/me           → current user (auth required)
 *   GET    /users              → list users
 *   GET    /clubs              → list clubs (public)
 *   GET    /clubs/:id          → club detail (public)
 *   POST   /clubs              → create club (auth)
 *   PUT    /clubs/:id          → update club / join / approve (auth)
 *   GET    /events             → list events (public)
 *   GET    /events/:id         → event detail (public)
 *   POST   /events             → create event (auth)
 *   PUT    /events/:id         → update event (auth)
 *   GET    /news-items         → list news (public)
 *   GET    /news-items/:id     → news detail (public)
 *   POST   /news-items         → create news (auth)
 *   PUT    /news-items/:id     → update news (auth)
 *   GET    /news-categories    → list categories
 *   GET    /news-tags          → list tags
 *   POST   /upload             → upload file (auth)
 *   GET    /health             → diagnostic check
 */

declare(strict_types=1);

// ── 1. CORS ──────────────────────────────────────────────────────────────────
// Reflect the requesting Origin back so Authorization headers work on any port.
$origin = $_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:3000';
header("Access-Control-Allow-Origin: {$origin}");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Max-Age: 86400');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── 2. Bootstrap Joomla ───────────────────────────────────────────────────────
// This gives us Factory::getContainer() → DatabaseInterface and
// Factory::getApplication()->get('secret') for the JWT secret.
$joomlaRoot = \dirname(__DIR__);   // [joomla-root]/srh-api/../  =  [joomla-root]/

\define('_JEXEC', 1);
\define('JPATH_BASE', $joomlaRoot);

if (!file_exists($joomlaRoot . '/includes/defines.php')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Joomla root not found. Check that srh-api/ is inside your Joomla installation folder.']);
    exit;
}

require_once $joomlaRoot . '/includes/defines.php';
require_once $joomlaRoot . '/includes/framework.php';

ob_start();
try {
    $app = \Joomla\CMS\Factory::getApplication('site');
} catch (\Throwable $e) {
    ob_end_clean();
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Joomla bootstrap failed: ' . $e->getMessage()]);
    exit;
}
ob_end_clean();

header('Content-Type: application/json; charset=utf-8');

// ── 3. Autoload our component classes ────────────────────────────────────────
// Maps SRH\Component\Ambassador\Api\* → [joomla-root]/api/components/com_ambassador/src/*
spl_autoload_register(function (string $class) use ($joomlaRoot): void {
    $prefix = 'SRH\\Component\\Ambassador\\Api\\';
    $len    = \strlen($prefix);
    if (\strncmp($class, $prefix, $len) !== 0) {
        return;
    }
    $relative = str_replace('\\', '/', substr($class, $len));
    $file     = $joomlaRoot . '/api/components/com_ambassador/src/' . $relative . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});

// ── 4. Parse the sub-path ────────────────────────────────────────────────────
$uri     = $_SERVER['REQUEST_URI'] ?? '/';
$path    = parse_url($uri, PHP_URL_PATH) ?? '/';
// Strip /srh-api prefix (works even if Joomla is installed in a subdirectory)
$subPath = (string) preg_replace('#.*/srh-api#', '', $path);
$subPath = '/' . ltrim($subPath, '/');
if ($subPath === '/') {
    $subPath = '';
}
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// ── 5. Route dispatcher ───────────────────────────────────────────────────────
use SRH\Component\Ambassador\Api\Controller\AuthController;
use SRH\Component\Ambassador\Api\Controller\CategoriesController;
use SRH\Component\Ambassador\Api\Controller\ClubsController;
use SRH\Component\Ambassador\Api\Controller\EventsController;
use SRH\Component\Ambassador\Api\Controller\NewsController;
use SRH\Component\Ambassador\Api\Controller\TagsController;
use SRH\Component\Ambassador\Api\Controller\UploadController;
use SRH\Component\Ambassador\Api\Controller\UsersController;
use SRH\Component\Ambassador\Api\Helper\ResponseHelper;

// Diagnostic health check — visit /srh-api/health first to verify setup
if ($subPath === '/health' && $method === 'GET') {
    echo json_encode([
        'status'      => 'ok',
        'api'         => 'com_ambassador',
        'joomla_root' => $joomlaRoot,
        'time'        => date('c'),
    ]);
    exit;
}

// Auth
if ($subPath === '/auth/login' && $method === 'POST') {
    (new AuthController())->login();
    exit;
}
if ($subPath === '/users/me' && $method === 'GET') {
    (new AuthController())->me();
    exit;
}

// Users
if ($subPath === '/users' && $method === 'GET') {
    (new UsersController())->index();
    exit;
}

// Clubs
if ($subPath === '/clubs' && $method === 'GET') {
    (new ClubsController())->index();
    exit;
}
if ($subPath === '/clubs' && $method === 'POST') {
    (new ClubsController())->create();
    exit;
}
if (preg_match('#^/clubs/([^/]+)$#', $subPath, $m)) {
    $id = $m[1];
    if ($method === 'GET') { (new ClubsController())->show($id); exit; }
    if ($method === 'PUT') { (new ClubsController())->update($id); exit; }
}

// Events
if ($subPath === '/events' && $method === 'GET') {
    (new EventsController())->index();
    exit;
}
if ($subPath === '/events' && $method === 'POST') {
    (new EventsController())->create();
    exit;
}
if (preg_match('#^/events/([^/]+)$#', $subPath, $m)) {
    $id = $m[1];
    if ($method === 'GET') { (new EventsController())->show($id); exit; }
    if ($method === 'PUT') { (new EventsController())->update($id); exit; }
}

// News items
if ($subPath === '/news-items' && $method === 'GET') {
    (new NewsController())->index();
    exit;
}
if ($subPath === '/news-items' && $method === 'POST') {
    (new NewsController())->create();
    exit;
}
if (preg_match('#^/news-items/([^/]+)$#', $subPath, $m)) {
    $id = $m[1];
    if ($method === 'GET') { (new NewsController())->show($id); exit; }
    if ($method === 'PUT') { (new NewsController())->update($id); exit; }
}

// Categories & Tags
if ($subPath === '/news-categories' && $method === 'GET') {
    (new CategoriesController())->index();
    exit;
}
if ($subPath === '/news-tags' && $method === 'GET') {
    (new TagsController())->index();
    exit;
}

// File upload
if ($subPath === '/upload' && $method === 'POST') {
    (new UploadController())->upload();
    exit;
}

ResponseHelper::error(404, "Route not found: {$method} /srh-api{$subPath}");
