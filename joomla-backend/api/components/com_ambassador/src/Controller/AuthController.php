<?php

declare(strict_types=1);

namespace SRH\Component\Ambassador\Api\Controller;

use Joomla\CMS\Factory;
use Joomla\Database\DatabaseInterface;
use SRH\Component\Ambassador\Api\Helper\DbHelper;
use SRH\Component\Ambassador\Api\Helper\JwtHelper;
use SRH\Component\Ambassador\Api\Helper\ResponseHelper;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * Handles POST /v1/ambassador/auth/login
 * and    GET  /v1/ambassador/users/me
 */
class AuthController
{
    private DatabaseInterface $db;

    public function __construct()
    {
        $this->db = DbHelper::db();
    }

    // ── POST /v1/ambassador/auth/login ────────────────────────────────────────

    public function login(): void
    {
        $body = (array) json_decode(file_get_contents('php://input') ?: '{}', true);
        $identifier = trim((string) ($body['identifier'] ?? $body['email'] ?? ''));
        $password   = (string) ($body['password'] ?? '');

        if ($identifier === '' || $password === '') {
            ResponseHelper::error(400, 'identifier and password are required.');
        }

        // Look up user by email or username
        $query = $this->db->getQuery(true)
            ->select(['u.id', 'u.name', 'u.username', 'u.email', 'u.password', 'u.block',
                      'm.first_name', 'm.last_name', 'm.app_role', 'm.avatar_url'])
            ->from($this->db->quoteName('#__users', 'u'))
            ->leftJoin($this->db->quoteName('#__ambassador_user_meta', 'm') . ' ON m.user_id = u.id')
            ->where('(u.email = ' . $this->db->quote($identifier) .
                    ' OR u.username = ' . $this->db->quote($identifier) . ')')
            ->where('u.block = 0');
        $this->db->setQuery($query);
        $user = $this->db->loadAssoc();

        if (!$user) {
            ResponseHelper::error(401, 'Invalid credentials.');
        }

        if (!password_verify($password, $user['password'])) {
            ResponseHelper::error(401, 'Invalid credentials.');
        }

        $role = $this->resolveRole((int) $user['id'], $user['app_role'] ?? '');

        $jwt = JwtHelper::issue([
            'sub'       => (int) $user['id'],
            'email'     => $user['email'],
            'username'  => $user['username'],
            'role'      => $role,
            'firstName' => $user['first_name'] ?? '',
            'lastName'  => $user['last_name'] ?? '',
        ]);

        ResponseHelper::single([
            'jwt'  => $jwt,
            'user' => [
                'id'        => (int) $user['id'],
                'documentId'=> (string) $user['id'],
                'username'  => $user['username'],
                'email'     => $user['email'],
                'role'      => $role,
                'firstName' => $user['first_name'] ?? '',
                'lastName'  => $user['last_name'] ?? '',
                'avatar'    => $user['avatar_url'] ? ['url' => $user['avatar_url']] : null,
            ],
        ]);
    }

    // ── GET /v1/ambassador/users/me ───────────────────────────────────────────

    public function me(): void
    {
        $jwt    = JwtHelper::requireAuth();
        $userId = (int) ($jwt['sub'] ?? 0);

        $query = $this->db->getQuery(true)
            ->select(['u.id', 'u.username', 'u.email',
                      'm.first_name', 'm.last_name', 'm.app_role', 'm.avatar_url'])
            ->from($this->db->quoteName('#__users', 'u'))
            ->leftJoin($this->db->quoteName('#__ambassador_user_meta', 'm') . ' ON m.user_id = u.id')
            ->where('u.id = ' . $userId)
            ->where('u.block = 0');
        $this->db->setQuery($query);
        $user = $this->db->loadAssoc();

        if (!$user) {
            ResponseHelper::error(404, 'User not found.');
        }

        $role = $this->resolveRole($userId, $user['app_role'] ?? '');

        ResponseHelper::single([
            'id'         => (int) $user['id'],
            'documentId' => (string) $user['id'],
            'username'   => $user['username'],
            'email'      => $user['email'],
            'role'       => $role,
            'firstName'  => $user['first_name'] ?? '',
            'lastName'   => $user['last_name'] ?? '',
            'avatar'     => $user['avatar_url'] ? ['url' => $user['avatar_url']] : null,
        ]);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Resolve the user's SRH role string.
     * Primary source: #__ambassador_user_meta.app_role.
     * Fallback: derive from Joomla User Group title.
     */
    private function resolveRole(int $userId, string $metaRole): string
    {
        $validRoles = ['Student', 'ExchangeStudent', 'Professor', 'Teacher', 'Ambassador', 'Admin', 'SuperAdmin'];

        if (in_array($metaRole, $validRoles, true)) {
            return $metaRole;
        }

        // Fallback: look up group membership
        $query = $this->db->getQuery(true)
            ->select('g.title')
            ->from($this->db->quoteName('#__usergroups', 'g'))
            ->join('INNER', $this->db->quoteName('#__user_usergroup_map', 'm') . ' ON m.group_id = g.id')
            ->where('m.user_id = ' . $userId)
            ->whereIn($this->db->quoteName('g.title'), array_map([$this->db, 'quote'], $validRoles));
        $this->db->setQuery($query);
        $groupTitle = $this->db->loadResult();

        return $groupTitle ?: 'Student';
    }
}
