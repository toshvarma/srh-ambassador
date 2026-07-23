<?php
/**
 * SRH Ambassador — Self-contained REST API
 *
 * HOW TO USE (no .htaccess rewrite needed):
 *   Access via PATH_INFO: http://joomla-cms.test/srh-api/index.php/health
 *                         http://joomla-cms.test/srh-api/index.php/clubs
 *                         http://joomla-cms.test/srh-api/index.php/auth/login
 *
 * This file only needs configuration.php from your Joomla install.
 * No Joomla framework, no Composer packages, no extra rewrite rules.
 */
declare(strict_types=1);

error_reporting(0);
ini_set('display_errors', '0');

// ── CORS ─────────────────────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Max-Age: 86400');
header('Vary: Origin');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// ── Locate Joomla root & config ───────────────────────────────────────────────
// srh-api/ lives directly inside the Joomla root, so dirname(__DIR__) = joomla root
$joomlaRoot = dirname(__DIR__);
$configFile = $joomlaRoot . '/configuration.php';

if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => "configuration.php not found at: {$configFile}",
                      'hint'  => 'srh-api/ must be inside your Joomla root folder.']);
    exit;
}

require_once $configFile;
/** @var object $jConfig */
$jConfig   = new \JConfig();
$prefix    = $jConfig->dbprefix;                                     // e.g. 'jos_'
$jwtSecret = hash('sha256', 'srh_ambassador_jwt_' . $jConfig->secret);

// ── Database ──────────────────────────────────────────────────────────────────
try {
    $pdo = new \PDO(
        "mysql:host={$jConfig->host};dbname={$jConfig->db};charset=utf8mb4",
        $jConfig->user,
        $jConfig->password,
        [\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION, \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC]
    );
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

// ── Utility functions ─────────────────────────────────────────────────────────

function tbl(string $name): string {
    global $prefix;
    return "`{$prefix}{$name}`";
}

function uuid(): string {
    $d = random_bytes(16);
    $d[6] = chr(ord($d[6]) & 0x0f | 0x40);
    $d[8] = chr(ord($d[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($d), 4));
}

function uniqueSlug(string $title, string $table): string {
    global $pdo;
    $base = strtolower(trim((string)preg_replace('/[^a-zA-Z0-9]+/', '-', $title), '-')) ?: 'item';
    $slug = $base;
    for ($i = 1; ; $i++) {
        $st = $pdo->prepare('SELECT COUNT(*) FROM ' . tbl($table) . ' WHERE slug = ?');
        $st->execute([$slug]);
        if ((int)$st->fetchColumn() === 0) return $slug;
        $slug = $base . '-' . $i;
    }
}

function ok($data): void {
    echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function err(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

function body(): array {
    return json_decode((string)file_get_contents('php://input'), true) ?? [];
}

function fetchTags(string $joinTable, string $idCol, int $id): array {
    global $pdo, $prefix;
    $st = $pdo->prepare("SELECT t.id, t.title FROM `{$prefix}tags` t
        JOIN `{$prefix}{$joinTable}` j ON j.tag_id = t.id WHERE j.{$idCol} = ?");
    $st->execute([$id]);
    return array_map(fn($r) => ['id' => (int)$r['id'], 'documentId' => (string)$r['id'], 'name' => $r['title']], $st->fetchAll());
}

function fetchCategory(?int $catId): ?array {
    global $pdo, $prefix;
    if (!$catId) return null;
    $st = $pdo->prepare("SELECT id, title, description FROM `{$prefix}categories` WHERE id = ?");
    $st->execute([$catId]);
    $r = $st->fetch();
    if (!$r) return null;
    return ['id' => (int)$r['id'], 'documentId' => (string)$r['id'], 'name' => $r['title'], 'description' => $r['description'] ?? ''];
}

function fetchUser(?int $userId): ?array {
    global $pdo, $prefix;
    if (!$userId) return null;
    $st = $pdo->prepare("SELECT u.id, u.username, u.email, m.first_name, m.last_name, m.avatar_url, m.app_role
        FROM `{$prefix}users` u
        LEFT JOIN `{$prefix}ambassador_user_meta` m ON m.user_id = u.id
        WHERE u.id = ?");
    $st->execute([$userId]);
    $r = $st->fetch();
    if (!$r) return null;
    return ['id' => (int)$r['id'], 'documentId' => (string)$r['id'],
            'username' => $r['username'], 'email' => $r['email'],
            'firstName' => $r['first_name'] ?? '', 'lastName' => $r['last_name'] ?? '',
            'role' => $r['app_role'] ?? 'Student',
            'avatar' => $r['avatar_url'] ? ['url' => $r['avatar_url']] : null];
}

// ── JWT (inline HS256, no external library needed) ────────────────────────────

function jwtB64(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function jwtDec(string $d): string { $p=(4-strlen($d)%4)%4; return (string)base64_decode(strtr($d,'-_','+/').str_repeat('=',$p)); }

function jwtIssue(array $payload): string {
    global $jwtSecret;
    $h = jwtB64((string)json_encode(['typ'=>'JWT','alg'=>'HS256']));
    $b = jwtB64((string)json_encode(array_merge($payload, ['iat'=>time(),'exp'=>time()+86400*30])));
    return "{$h}.{$b}." . jwtB64(hash_hmac('sha256', "{$h}.{$b}", $jwtSecret, true));
}

function jwtVerify(): ?array {
    global $jwtSecret;
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($auth, 'Bearer ')) return null;
    $parts = explode('.', substr($auth, 7));
    if (count($parts) !== 3) return null;
    [$h,$b,$s] = $parts;
    if (!hash_equals(jwtB64(hash_hmac('sha256', "{$h}.{$b}", $jwtSecret, true)), $s)) return null;
    $claims = json_decode(jwtDec($b), true);
    if (!is_array($claims) || (isset($claims['exp']) && $claims['exp'] < time())) return null;
    return $claims;
}

function requireAuth(): array {
    $c = jwtVerify();
    if (!$c) err(401, 'Unauthorized: valid Bearer token required');
    return $c; // @phpstan-ignore-line
}

function requireRole(array $jwt, array $roles): void {
    if (!in_array($jwt['role'] ?? '', $roles, true)) err(403, "Role '{$jwt['role']}' is not permitted for this action");
}

// ── Routing ───────────────────────────────────────────────────────────────────
// Supports PATH_INFO: http://joomla-cms.test/srh-api/index.php/clubs
$sub = $_SERVER['PATH_INFO'] ?? '';
if (!$sub || $sub === '/') {
    // Fallback: extract from REQUEST_URI
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    // Strip everything up to and including index.php
    if (preg_match('#/srh-api/index\.php(.*)#', $uri, $m)) {
        $sub = $m[1];
    } elseif (preg_match('#/srh-api(.*)#', $uri, $m)) {
        $sub = $m[1];
    }
}
$sub    = '/' . ltrim($sub ?: '', '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// ── Global exception wrapper ──────────────────────────────────────────────────
// Any uncaught exception becomes a JSON 500 instead of an empty/HTML response
set_exception_handler(function (\Throwable $e): void {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => $e->getMessage(), 'type' => get_class($e)]);
    exit;
});

// ── Health check ──────────────────────────────────────────────────────────────

if ($sub === '/health') {
    ok([
        'status'       => 'ok',
        'api'          => 'srh-ambassador',
        'db'           => $jConfig->db,
        'prefix'       => $prefix,
        'time'         => date('c'),
        'path_info'    => $_SERVER['PATH_INFO'] ?? '(not set)',
        'request_uri'  => $_SERVER['REQUEST_URI'] ?? '(not set)',
        'resolved_sub' => $sub,
    ]);
}

// ── POST /auth/login ──────────────────────────────────────────────────────────

if ($sub === '/auth/login' && $method === 'POST') {
    $b          = body();
    $identifier = trim($b['identifier'] ?? '');
    $password   = $b['password'] ?? '';
    if (!$identifier || !$password) err(400, 'identifier and password are required');

    $st = $pdo->prepare("SELECT u.id, u.username, u.email, u.password,
            m.first_name, m.last_name, m.avatar_url, m.app_role
        FROM `{$prefix}users` u
        LEFT JOIN `{$prefix}ambassador_user_meta` m ON m.user_id = u.id
        WHERE (u.email = ? OR u.username = ?) AND u.block = 0 LIMIT 1");
    $st->execute([$identifier, $identifier]);
    $user = $st->fetch();

    if (!$user || !password_verify($password, (string)$user['password'])) err(401, 'Invalid email or password');

    $role = $user['app_role'] ?? 'Student';
    $jwt  = jwtIssue(['sub' => (int)$user['id'], 'email' => $user['email'],
                      'username' => $user['username'], 'role' => $role,
                      'firstName' => $user['first_name'] ?? '', 'lastName' => $user['last_name'] ?? '']);

    ok(['jwt' => $jwt, 'user' => [
        'id' => (int)$user['id'], 'documentId' => (string)$user['id'],
        'username' => $user['username'], 'email' => $user['email'], 'role' => $role,
        'firstName' => $user['first_name'] ?? '', 'lastName' => $user['last_name'] ?? '',
        'avatar' => $user['avatar_url'] ? ['url' => $user['avatar_url']] : null,
    ]]);
}

// ── GET /users/me ─────────────────────────────────────────────────────────────

if ($sub === '/users/me' && $method === 'GET') {
    $claims = requireAuth();
    $user   = fetchUser((int)$claims['sub']);
    if (!$user) err(404, 'User not found');
    ok($user);
}

// ── GET /users ────────────────────────────────────────────────────────────────

if ($sub === '/users' && $method === 'GET') {
    requireAuth();
    $filters = $_GET['filters'] ?? [];
    $where   = ['1=1'];
    $params  = [];
    if (!empty($filters['email']['$eq']))      { $where[] = 'u.email = ?';  $params[] = $filters['email']['$eq']; }
    if (!empty($filters['documentId']['$eq'])) { $where[] = 'u.id = ?';     $params[] = (int)$filters['documentId']['$eq']; }

    $st = $pdo->prepare("SELECT u.id, u.username, u.email, m.first_name, m.last_name, m.avatar_url, m.app_role
        FROM `{$prefix}users` u
        LEFT JOIN `{$prefix}ambassador_user_meta` m ON m.user_id = u.id
        WHERE " . implode(' AND ', $where));
    $st->execute($params);
    ok(array_map(fn($u) => ['id' => (int)$u['id'], 'documentId' => (string)$u['id'],
        'username' => $u['username'], 'email' => $u['email'],
        'firstName' => $u['first_name'] ?? '', 'lastName' => $u['last_name'] ?? '',
        'role' => $u['app_role'] ?? 'Student',
        'avatar' => $u['avatar_url'] ? ['url' => $u['avatar_url']] : null,
    ], $st->fetchAll()));
}

// ── Clubs helpers ─────────────────────────────────────────────────────────────

function clubMembers(int $clubId): array {
    global $pdo, $prefix;
    $st = $pdo->prepare("SELECT u.id, u.email, m.first_name, m.last_name, m.app_role
        FROM `{$prefix}ambassador_club_members` cm
        JOIN `{$prefix}users` u ON u.id = cm.user_id
        LEFT JOIN `{$prefix}ambassador_user_meta` m ON m.user_id = u.id
        WHERE cm.club_id = ?");
    $st->execute([$clubId]);
    return array_map(fn($u) => ['id' => (int)$u['id'], 'documentId' => (string)$u['id'],
        'email' => $u['email'], 'firstName' => $u['first_name'] ?? '', 'lastName' => $u['last_name'] ?? '',
        'role' => $u['app_role'] ?? 'Student'], $st->fetchAll());
}

function fmtClub(array $c): array {
    return [
        'id'                 => (int)$c['id'],
        'documentId'         => (string)$c['id'],
        'title'              => $c['title'],
        'slug'               => $c['slug'],
        'shortDescription'   => $c['short_description'] ?? '',
        'description'        => $c['description'] ?? '',
        'coverImage'         => $c['cover_image'] ? ['url' => $c['cover_image']] : null,
        'contactEmail'       => $c['contact_email'] ?? '',
        'maxMembers'         => (int)$c['max_members'],
        'maxAmbassadors'     => (int)$c['max_ambassadors'],
        'approvalStatus'     => $c['approval_status'],
        'ambassadorFeedback' => $c['ambassador_feedback'] ?? '',
        'rejectionReason'    => $c['rejection_reason'] ?? '',
        'submittedBy'        => fetchUser((int)$c['submitted_by']),
        'reviewedBy'         => fetchUser((int)$c['reviewed_by']),
        'members'            => clubMembers((int)$c['id']),
        'createdAt'          => $c['created_at'],
        'updatedAt'          => $c['updated_at'],
    ];
}

// ── GET /clubs ────────────────────────────────────────────────────────────────

if ($sub === '/clubs' && $method === 'GET') {
    $f      = $_GET['filters'] ?? [];
    $where  = ['c.state = 1'];
    $params = [];

    if (!empty($f['approvalStatus']['$eq']))             { $where[] = 'c.approval_status = ?'; $params[] = $f['approvalStatus']['$eq']; }
    if (!empty($f['slug']['$eq']))                       { $where[] = 'c.slug = ?';             $params[] = $f['slug']['$eq']; }
    if (!empty($f['documentId']['$eq']))                 { $where[] = 'c.id = ?';               $params[] = (int)$f['documentId']['$eq']; }
    if (!empty($f['submittedBy']['documentId']['$eq']))  { $where[] = 'c.submitted_by = ?';     $params[] = (int)$f['submittedBy']['documentId']['$eq']; }
    if (!empty($f['members']['documentId']['$eq']))      {
        $where[] = "EXISTS (SELECT 1 FROM `{$prefix}ambassador_club_members` cm WHERE cm.club_id = c.id AND cm.user_id = ?)";
        $params[] = (int)$f['members']['documentId']['$eq'];
    }

    $st = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_clubs` c WHERE " . implode(' AND ', $where) . " ORDER BY c.created_at DESC");
    $st->execute($params);
    ok(array_map('fmtClub', $st->fetchAll()));
}

// ── POST /clubs ───────────────────────────────────────────────────────────────

if ($sub === '/clubs' && $method === 'POST') {
    $claims = requireAuth();
    requireRole($claims, ['Student', 'ExchangeStudent', 'Admin', 'SuperAdmin']);
    $b    = body()['data'] ?? body();
    $slug = uniqueSlug($b['title'] ?? 'club', 'ambassador_clubs');
    $now  = date('Y-m-d H:i:s');

    $st = $pdo->prepare("INSERT INTO `{$prefix}ambassador_clubs`
        (document_id,title,slug,short_description,description,cover_image,contact_email,
         max_members,max_ambassadors,approval_status,submitted_by,state,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,'pending',?,1,?,?)");
    $st->execute([uuid(), $b['title'] ?? '', $slug,
        $b['shortDescription'] ?? $b['short_description'] ?? '',
        $b['description'] ?? '',
        $b['coverImage']['url'] ?? $b['cover_image'] ?? null,
        $b['contactEmail'] ?? $b['contact_email'] ?? '',
        (int)($b['maxMembers'] ?? $b['max_members'] ?? 0),
        (int)($b['maxAmbassadors'] ?? $b['max_ambassadors'] ?? 0),
        (int)$claims['sub'], $now, $now]);

    $newId = (int)$pdo->lastInsertId();
    $st2   = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_clubs` WHERE id = ?");
    $st2->execute([$newId]);
    ok(fmtClub($st2->fetch()));
}

// ── GET /clubs/:id ────────────────────────────────────────────────────────────

if (preg_match('#^/clubs/([^/]+)$#', $sub, $m) && $method === 'GET') {
    $id = $m[1];
    $st = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_clubs` WHERE (id = ? OR slug = ?) AND state = 1 LIMIT 1");
    $st->execute([(int)$id, $id]);
    $club = $st->fetch();
    if (!$club) err(404, 'Club not found');
    ok(fmtClub($club));
}

// ── PUT /clubs/:id ────────────────────────────────────────────────────────────

if (preg_match('#^/clubs/([^/]+)$#', $sub, $m) && $method === 'PUT') {
    $claims = requireAuth();
    $id     = (int)$m[1];
    $b      = body()['data'] ?? body();
    $now    = date('Y-m-d H:i:s');

    if (array_key_exists('members', $b)) {
        // Join / leave club
        $userId    = (int)$claims['sub'];
        $isJoining = !empty($b['members']);
        if ($isJoining) {
            $chk = $pdo->prepare("SELECT COUNT(*) FROM `{$prefix}ambassador_club_members` WHERE club_id=? AND user_id=?");
            $chk->execute([$id, $userId]);
            if ((int)$chk->fetchColumn() === 0) {
                $ins = $pdo->prepare("INSERT INTO `{$prefix}ambassador_club_members` (club_id,user_id,joined_at) VALUES (?,?,?)");
                $ins->execute([$id, $userId, $now]);
            }
        } else {
            $del = $pdo->prepare("DELETE FROM `{$prefix}ambassador_club_members` WHERE club_id=? AND user_id=?");
            $del->execute([$id, $userId]);
        }
    } elseif (array_key_exists('approvalStatus', $b) || array_key_exists('approval_status', $b)) {
        // Approval workflow — Ambassador/Admin only
        requireRole($claims, ['Ambassador', 'Admin', 'SuperAdmin']);
        $status   = $b['approvalStatus'] ?? $b['approval_status'];
        $feedback = $b['ambassadorFeedback'] ?? $b['ambassador_feedback'] ?? null;
        $reason   = $b['rejectionReason'] ?? $b['rejection_reason'] ?? null;
        $st       = $pdo->prepare("UPDATE `{$prefix}ambassador_clubs` SET
            approval_status=?,ambassador_feedback=?,rejection_reason=?,reviewed_by=?,updated_at=?
            WHERE id=?");
        $st->execute([$status, $feedback, $reason, (int)$claims['sub'], $now, $id]);
    }

    $st2 = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_clubs` WHERE id = ?");
    $st2->execute([$id]);
    $club = $st2->fetch();
    if (!$club) err(404, 'Club not found');
    ok(fmtClub($club));
}

// ── Events helpers ────────────────────────────────────────────────────────────

function fmtEvent(array $e): array {
    return [
        'id'          => (int)$e['id'],
        'documentId'  => (string)$e['id'],
        'title'       => $e['title'],
        'slug'        => $e['slug'],
        'description' => $e['description'] ?? '',
        'startDate'   => $e['start_date'],
        'endDate'     => $e['end_date'],
        'location'    => $e['location'] ?? '',
        'meetingLink' => $e['meeting_link'] ?? '',
        'category'    => fetchCategory((int)$e['category_id']),
        'tags'        => fetchTags('ambassador_event_tags', 'event_id', (int)$e['id']),
        'author'      => fetchUser((int)$e['author_id']),
        'createdAt'   => $e['created_at'],
        'updatedAt'   => $e['updated_at'],
    ];
}

// ── GET /events ───────────────────────────────────────────────────────────────

if ($sub === '/events' && $method === 'GET') {
    $f = $_GET['filters'] ?? [];
    $where = ['state = 1']; $params = [];
    if (!empty($f['category']['documentId']['$eq'])) { $where[] = 'category_id = ?'; $params[] = (int)$f['category']['documentId']['$eq']; }
    $st = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_events` WHERE " . implode(' AND ', $where) . " ORDER BY start_date ASC");
    $st->execute($params);
    ok(array_map('fmtEvent', $st->fetchAll()));
}

// ── POST /events ──────────────────────────────────────────────────────────────

if ($sub === '/events' && $method === 'POST') {
    $claims = requireAuth();
    requireRole($claims, ['Ambassador','Professor','Teacher','Admin','SuperAdmin']);
    $b    = body()['data'] ?? body();
    $slug = uniqueSlug($b['title'] ?? 'event', 'ambassador_events');
    $now  = date('Y-m-d H:i:s');

    $st = $pdo->prepare("INSERT INTO `{$prefix}ambassador_events`
        (document_id,title,slug,description,start_date,end_date,location,meeting_link,
         category_id,club_id,author_id,state,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)");
    $st->execute([uuid(), $b['title']??'', $slug, $b['description']??'',
        $b['startDate']??$b['start_date']??$now, $b['endDate']??$b['end_date']??$now,
        $b['location']??'', $b['meetingLink']??$b['meeting_link']??null,
        $b['category']['id']??$b['category_id']??null, $b['club']['id']??$b['club_id']??null,
        (int)$claims['sub'], $now, $now]);

    $newId = (int)$pdo->lastInsertId();
    if (!empty($b['tags'])) {
        $ins = $pdo->prepare("INSERT IGNORE INTO `{$prefix}ambassador_event_tags` (event_id,tag_id) VALUES (?,?)");
        foreach ($b['tags'] as $tag) {
            $tid = is_array($tag) ? (int)($tag['id']??0) : (int)$tag;
            if ($tid) $ins->execute([$newId, $tid]);
        }
    }
    $st2 = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_events` WHERE id=?");
    $st2->execute([$newId]);
    ok(fmtEvent($st2->fetch()));
}

// ── GET /events/:id ───────────────────────────────────────────────────────────

if (preg_match('#^/events/([^/]+)$#', $sub, $m) && $method === 'GET') {
    $id = $m[1];
    $st = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_events` WHERE (id=? OR slug=?) AND state=1 LIMIT 1");
    $st->execute([(int)$id, $id]);
    $ev = $st->fetch();
    if (!$ev) err(404, 'Event not found');
    ok(fmtEvent($ev));
}

// ── PUT /events/:id ───────────────────────────────────────────────────────────

if (preg_match('#^/events/([^/]+)$#', $sub, $m) && $method === 'PUT') {
    $claims = requireAuth();
    $id = (int)$m[1]; $b = body()['data'] ?? body(); $now = date('Y-m-d H:i:s');

    if (array_key_exists('attendees', $b)) {
        $uid = (int)$claims['sub']; $joining = !empty($b['attendees']);
        if ($joining) {
            $chk = $pdo->prepare("SELECT COUNT(*) FROM `{$prefix}ambassador_event_attendees` WHERE event_id=? AND user_id=?");
            $chk->execute([$id,$uid]);
            if ((int)$chk->fetchColumn()===0) {
                $pdo->prepare("INSERT INTO `{$prefix}ambassador_event_attendees` (event_id,user_id,joined_at) VALUES (?,?,?)")->execute([$id,$uid,$now]);
            }
        } else {
            $pdo->prepare("DELETE FROM `{$prefix}ambassador_event_attendees` WHERE event_id=? AND user_id=?")->execute([$id,$uid]);
        }
    } else {
        requireRole($claims, ['Ambassador','Professor','Teacher','Admin','SuperAdmin']);
        $pdo->prepare("UPDATE `{$prefix}ambassador_events` SET title=?,description=?,start_date=?,end_date=?,location=?,meeting_link=?,category_id=?,updated_at=? WHERE id=?")
            ->execute([$b['title']??'',$b['description']??'',$b['startDate']??$b['start_date']??null,
                       $b['endDate']??$b['end_date']??null,$b['location']??'',$b['meetingLink']??null,
                       $b['category']['id']??$b['category_id']??null,$now,$id]);
    }

    $st = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_events` WHERE id=?"); $st->execute([$id]);
    $ev = $st->fetch(); if (!$ev) err(404,'Event not found');
    ok(fmtEvent($ev));
}

// ── News helpers ──────────────────────────────────────────────────────────────

function fmtNews(array $n): array {
    return [
        'id'            => (int)$n['id'],
        'documentId'    => (string)$n['id'],
        'title'         => $n['title'],
        'slug'          => $n['slug'],
        'excerpt'       => $n['excerpt'] ?? '',
        'content'       => $n['content'] ?? '',
        'featuredImage' => $n['featured_image'] ? ['url' => $n['featured_image']] : null,
        'category'      => fetchCategory((int)$n['category_id']),
        'tags'          => fetchTags('ambassador_news_tags', 'news_id', (int)$n['id']),
        'author'        => fetchUser((int)$n['author_id']),
        'createdAt'     => $n['created_at'],
        'updatedAt'     => $n['updated_at'],
    ];
}

// ── GET /news-items ───────────────────────────────────────────────────────────

if ($sub === '/news-items' && $method === 'GET') {
    $f = $_GET['filters'] ?? [];
    $where = ['state=1']; $params = [];
    if (!empty($f['category']['documentId']['$eq'])) { $where[] = 'category_id=?'; $params[] = (int)$f['category']['documentId']['$eq']; }
    $st = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_news` WHERE " . implode(' AND ',$where) . " ORDER BY created_at DESC");
    $st->execute($params);
    ok(array_map('fmtNews', $st->fetchAll()));
}

// ── POST /news-items ──────────────────────────────────────────────────────────

if ($sub === '/news-items' && $method === 'POST') {
    $claims = requireAuth();
    requireRole($claims, ['Ambassador','Professor','Teacher','Admin','SuperAdmin']);
    $b    = body()['data'] ?? body();
    $slug = uniqueSlug($b['title'] ?? 'news', 'ambassador_news');
    $now  = date('Y-m-d H:i:s');

    $st = $pdo->prepare("INSERT INTO `{$prefix}ambassador_news`
        (document_id,title,slug,excerpt,content,featured_image,category_id,club_id,author_id,state,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,1,?,?)");
    $st->execute([uuid(),$b['title']??'',$slug,$b['excerpt']??'',$b['content']??'',
        $b['featuredImage']['url']??$b['featured_image']??null,
        $b['category']['id']??$b['category_id']??null,
        $b['club']['id']??$b['club_id']??null,
        (int)$claims['sub'],$now,$now]);

    $newId = (int)$pdo->lastInsertId();
    if (!empty($b['tags'])) {
        $ins = $pdo->prepare("INSERT IGNORE INTO `{$prefix}ambassador_news_tags` (news_id,tag_id) VALUES (?,?)");
        foreach ($b['tags'] as $tag) {
            $tid = is_array($tag) ? (int)($tag['id']??0) : (int)$tag;
            if ($tid) $ins->execute([$newId, $tid]);
        }
    }
    $st2 = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_news` WHERE id=?"); $st2->execute([$newId]);
    ok(fmtNews($st2->fetch()));
}

// ── GET /news-items/:id ───────────────────────────────────────────────────────

if (preg_match('#^/news-items/([^/]+)$#', $sub, $m) && $method === 'GET') {
    $id = $m[1];
    $st = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_news` WHERE (id=? OR slug=?) AND state=1 LIMIT 1");
    $st->execute([(int)$id,$id]);
    $news = $st->fetch(); if (!$news) err(404,'News item not found');
    ok(fmtNews($news));
}

// ── PUT /news-items/:id ───────────────────────────────────────────────────────

if (preg_match('#^/news-items/([^/]+)$#', $sub, $m) && $method === 'PUT') {
    $claims = requireAuth();
    requireRole($claims, ['Ambassador','Professor','Teacher','Admin','SuperAdmin']);
    $id = (int)$m[1]; $b = body()['data'] ?? body(); $now = date('Y-m-d H:i:s');
    $pdo->prepare("UPDATE `{$prefix}ambassador_news` SET title=?,excerpt=?,content=?,featured_image=?,category_id=?,updated_at=? WHERE id=?")
        ->execute([$b['title']??'',$b['excerpt']??'',$b['content']??'',
                   $b['featuredImage']['url']??$b['featured_image']??null,
                   $b['category']['id']??$b['category_id']??null,$now,$id]);
    $st = $pdo->prepare("SELECT * FROM `{$prefix}ambassador_news` WHERE id=?"); $st->execute([$id]);
    $n = $st->fetch(); if (!$n) err(404,'News item not found');
    ok(fmtNews($n));
}

// ── GET /news-categories ──────────────────────────────────────────────────────

if ($sub === '/news-categories' && $method === 'GET') {
    $st = $pdo->prepare("SELECT id, title, description FROM `{$prefix}categories`
        WHERE extension='com_ambassador' AND published=1 ORDER BY title");
    $st->execute();
    ok(array_map(fn($r) => ['id'=>(int)$r['id'],'documentId'=>(string)$r['id'],'name'=>$r['title'],'description'=>$r['description']??''], $st->fetchAll()));
}

// ── GET /news-tags ────────────────────────────────────────────────────────────

if ($sub === '/news-tags' && $method === 'GET') {
    $st = $pdo->query("SELECT id, title FROM `{$prefix}tags` WHERE published=1 ORDER BY title");
    ok(array_map(fn($r) => ['id'=>(int)$r['id'],'documentId'=>(string)$r['id'],'name'=>$r['title']], $st->fetchAll()));
}

// ── POST /upload ──────────────────────────────────────────────────────────────

if ($sub === '/upload' && $method === 'POST') {
    requireAuth();
    if (empty($_FILES['files'])) err(400, "No file uploaded (field name must be 'files')");
    $file    = $_FILES['files'];
    $ext     = strtolower((string)pathinfo((string)$file['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg','jpeg','png','gif','webp','svg'];
    if (!in_array($ext, $allowed, true)) err(400, "File type .{$ext} not allowed");
    $imagesDir = $joomlaRoot . '/images/ambassador';
    if (!is_dir($imagesDir)) mkdir($imagesDir, 0755, true);
    $filename = uniqid('', true) . '.' . $ext;
    if (!move_uploaded_file((string)$file['tmp_name'], $imagesDir . '/' . $filename)) err(500, 'Failed to save uploaded file');
    ok([['url' => '/images/ambassador/' . $filename, 'name' => $filename]]);
}

// ── 404 fallthrough ───────────────────────────────────────────────────────────
err(404, "No route: {$method} {$sub}. Try GET /srh-api/index.php/health to test the API.");
