<?php

/**
 * com_ambassador API entry point.
 *
 * Registered with Joomla's Web Services API via the component manifest.
 * All requests to /api/index.php/v1/ambassador/* are routed here.
 *
 * Route table:
 *   POST   /v1/ambassador/auth/login      → AuthController::login
 *   GET    /v1/ambassador/users/me        → AuthController::me
 *   GET    /v1/ambassador/users           → UsersController::index
 *   GET    /v1/ambassador/clubs           → ClubsController::index
 *   GET    /v1/ambassador/clubs/:id       → ClubsController::show
 *   POST   /v1/ambassador/clubs           → ClubsController::create
 *   PUT    /v1/ambassador/clubs/:id       → ClubsController::update
 *   GET    /v1/ambassador/events          → EventsController::index
 *   GET    /v1/ambassador/events/:id      → EventsController::show
 *   POST   /v1/ambassador/events          → EventsController::create
 *   PUT    /v1/ambassador/events/:id      → EventsController::update
 *   GET    /v1/ambassador/news-items      → NewsController::index
 *   GET    /v1/ambassador/news-items/:id  → NewsController::show
 *   POST   /v1/ambassador/news-items      → NewsController::create
 *   PUT    /v1/ambassador/news-items/:id  → NewsController::update
 *   GET    /v1/ambassador/news-categories → CategoriesController::index
 *   GET    /v1/ambassador/news-tags       → TagsController::index
 *   POST   /v1/ambassador/upload          → UploadController::upload
 */

declare(strict_types=1);

\defined('_JEXEC') or die;

// Autoload Composer dependencies (firebase/php-jwt) and our own classes
$vendorAutoload = __DIR__ . '/../../../../vendor/autoload.php';
if (file_exists($vendorAutoload)) {
    require_once $vendorAutoload;
}

use SRH\Component\Ambassador\Api\Controller\AuthController;
use SRH\Component\Ambassador\Api\Controller\CategoriesController;
use SRH\Component\Ambassador\Api\Controller\ClubsController;
use SRH\Component\Ambassador\Api\Controller\EventsController;
use SRH\Component\Ambassador\Api\Controller\NewsController;
use SRH\Component\Ambassador\Api\Controller\TagsController;
use SRH\Component\Ambassador\Api\Controller\UploadController;
use SRH\Component\Ambassador\Api\Controller\UsersController;
use SRH\Component\Ambassador\Api\Helper\ResponseHelper;

// ── Parse the path segment after /v1/ambassador/ ─────────────────────────────
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
// Strip query string
$path = parse_url($requestUri, PHP_URL_PATH) ?? '';
// Extract the part after /v1/ambassador
if (!preg_match('#/v1/ambassador(/.*)?$#', $path, $m)) {
    ResponseHelper::error(404, 'Not found.');
}
$subPath = rtrim($m[1] ?? '', '/') ?: '/';
$method  = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Handle CORS preflight
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Route dispatcher ──────────────────────────────────────────────────────────

// Auth
if ($subPath === '/auth/login' && $method === 'POST') {
    (new AuthController())->login();
}

// Users/me — must be checked before generic /users/:id
if ($subPath === '/users/me' && $method === 'GET') {
    (new AuthController())->me();
}

// Users list
if ($subPath === '/users' && $method === 'GET') {
    (new UsersController())->index();
}

// Clubs
if ($subPath === '/clubs' && $method === 'GET') {
    (new ClubsController())->index();
}
if ($subPath === '/clubs' && $method === 'POST') {
    (new ClubsController())->create();
}
if (preg_match('#^/clubs/([^/]+)$#', $subPath, $m2)) {
    $id = $m2[1];
    if ($method === 'GET') {
        (new ClubsController())->show($id);
    }
    if ($method === 'PUT') {
        (new ClubsController())->update($id);
    }
}

// Events
if ($subPath === '/events' && $method === 'GET') {
    (new EventsController())->index();
}
if ($subPath === '/events' && $method === 'POST') {
    (new EventsController())->create();
}
if (preg_match('#^/events/([^/]+)$#', $subPath, $m2)) {
    $id = $m2[1];
    if ($method === 'GET') {
        (new EventsController())->show($id);
    }
    if ($method === 'PUT') {
        (new EventsController())->update($id);
    }
}

// News items
if ($subPath === '/news-items' && $method === 'GET') {
    (new NewsController())->index();
}
if ($subPath === '/news-items' && $method === 'POST') {
    (new NewsController())->create();
}
if (preg_match('#^/news-items/([^/]+)$#', $subPath, $m2)) {
    $id = $m2[1];
    if ($method === 'GET') {
        (new NewsController())->show($id);
    }
    if ($method === 'PUT') {
        (new NewsController())->update($id);
    }
}

// Categories & Tags
if ($subPath === '/news-categories' && $method === 'GET') {
    (new CategoriesController())->index();
}
if ($subPath === '/news-tags' && $method === 'GET') {
    (new TagsController())->index();
}

// Upload
if ($subPath === '/upload' && $method === 'POST') {
    (new UploadController())->upload();
}

// Fallthrough → 404
ResponseHelper::error(404, "Route not found: {$method} /v1/ambassador{$subPath}");
