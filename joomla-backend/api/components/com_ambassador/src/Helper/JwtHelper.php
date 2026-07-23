<?php

declare(strict_types=1);

namespace SRH\Component\Ambassador\Api\Helper;

use Joomla\CMS\Factory;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * JWT helper — issues and verifies HS256 tokens with no external dependencies.
 *
 * The HMAC secret is derived from Joomla own $secret (configuration.php) so
 * no extra environment variable is needed.
 */
class JwtHelper
{
    private const TTL = 86400 * 30; // 30 days

    // -- Minimal HS256 implementation -----------------------------------------

    private static function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64decode(string $data): string
    {
        $pad = (4 - strlen($data) % 4) % 4;
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', $pad));
    }

    private static function secret(): string
    {
        $app    = Factory::getApplication();
        $config = $app->getConfig();
        $joomlaSecret = $config->get('secret', 'srh-ambassador-fallback');
        return hash('sha256', 'srh_ambassador_jwt_' . $joomlaSecret);
    }

    // -- Public API -----------------------------------------------------------

    /**
     * Issue a signed JWT for the given user payload.
     *
     * @param array<string,mixed> $payload  Must include at minimum: sub, email, role
     */
    public static function issue(array $payload): string
    {
        $now    = time();
        $claims = array_merge($payload, ['iat' => $now, 'exp' => $now + self::TTL]);

        $header  = self::b64url((string) json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $body    = self::b64url((string) json_encode($claims));
        $sig     = self::b64url(hash_hmac('sha256', "{$header}.{$body}", self::secret(), true));

        return "{$header}.{$body}.{$sig}";
    }

    /**
     * Verify and decode a JWT from an Authorization: Bearer header.
     *
     * @return array<string,mixed>|null  Decoded payload or null if invalid/missing.
     */
    public static function verify(): ?array
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if ($authHeader === '' || !str_starts_with($authHeader, 'Bearer ')) {
            return null;
        }

        $token = substr($authHeader, 7);
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$header, $body, $sig] = $parts;

        $expected = self::b64url(hash_hmac('sha256', "{$header}.{$body}", self::secret(), true));
        if (!hash_equals($expected, $sig)) {
            return null;
        }

        $claims = json_decode(self::b64decode($body), true);
        if (!is_array($claims)) {
            return null;
        }
        if (isset($claims['exp']) && $claims['exp'] < time()) {
            return null; // expired
        }

        return $claims;
    }

    /**
     * Require a valid JWT. Sends 401 and exits if missing/invalid.
     *
     * @return array<string,mixed>  Decoded JWT payload.
     */
    public static function requireAuth(): array
    {
        $payload = self::verify();
        if ($payload === null) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['errors' => [['title' => 'Unauthorized', 'detail' => 'A valid Bearer token is required.']]]);
            exit;
        }

        return $payload;
    }

    /**
     * Require the authenticated user to have one of the given roles.
     * Sends 403 and exits if the role is not permitted.
     *
     * @param array<string,mixed> $jwt    Decoded JWT payload.
     * @param string[]            $roles  Allowed role strings.
     */
    public static function requireRole(array $jwt, array $roles): void
    {
        $userRole = $jwt['role'] ?? '';
        if (!in_array($userRole, $roles, true)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['errors' => [['title' => 'Forbidden', 'detail' => "Role '{$userRole}' is not permitted."]]]);
            exit;
        }
    }
}
