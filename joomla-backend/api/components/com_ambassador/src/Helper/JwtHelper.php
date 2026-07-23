<?php

declare(strict_types=1);

namespace SRH\Component\Ambassador\Api\Helper;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Joomla\CMS\Factory;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * JWT helper — issues and verifies tokens for the Ambassador API.
 *
 * The secret is derived from Joomla's own $secret (configuration.php) so no
 * extra environment variable is needed.
 */
class JwtHelper
{
    private const ALGORITHM = 'HS256';
    private const TTL       = 86400 * 30; // 30 days

    private static function secret(): string
    {
        $app = Factory::getApplication();
        /** @var \Joomla\Registry\Registry $config */
        $config = $app->getConfig();
        $joomlaSecret = $config->get('secret', 'srh-ambassador-fallback');

        return hash('sha256', 'srh_ambassador_jwt_' . $joomlaSecret);
    }

    /**
     * Issue a signed JWT for the given user payload.
     *
     * @param array<string,mixed> $payload  Must include at minimum: sub (user id), email, role
     */
    public static function issue(array $payload): string
    {
        $now = time();
        $claims = array_merge($payload, [
            'iat' => $now,
            'exp' => $now + self::TTL,
        ]);

        return JWT::encode($claims, self::secret(), self::ALGORITHM);
    }

    /**
     * Verify and decode a JWT from an Authorization: Bearer header.
     *
     * @return array<string,mixed>|null  Decoded payload or null if invalid/missing.
     */
    public static function verify(): ?array
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            return null;
        }

        $token = substr($authHeader, 7);

        try {
            $decoded = JWT::decode($token, new Key(self::secret(), self::ALGORITHM));
            return (array) $decoded;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Require a valid JWT. Sends a 401 JSON response and exits if missing/invalid.
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
     * Check that the authenticated user has one of the given roles.
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
            echo json_encode(['errors' => [['title' => 'Forbidden', 'detail' => "Role '{$userRole}' is not permitted for this action."]]]);
            exit;
        }
    }
}
