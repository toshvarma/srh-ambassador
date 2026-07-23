<?php

declare(strict_types=1);

namespace SRH\Component\Ambassador\Api\Controller;

use Joomla\Database\DatabaseInterface;
use SRH\Component\Ambassador\Api\Helper\DbHelper;
use SRH\Component\Ambassador\Api\Helper\JwtHelper;
use SRH\Component\Ambassador\Api\Helper\ResponseHelper;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * GET /v1/ambassador/users
 *
 * Supports:
 *   ?filters[email][$eq]=X
 *   ?filters[documentId][$eq]=X   (documentId = stringified user id)
 *   ?pagination[limit]=N
 *   ?sort[0]=firstName:asc
 */
class UsersController
{
    private DatabaseInterface $db;

    public function __construct()
    {
        $this->db = DbHelper::db();
    }

    public function index(): void
    {
        JwtHelper::requireAuth();

        $filters = $_GET['filters'] ?? [];
        $limit   = max(1, min(200, (int) ($_GET['pagination']['limit'] ?? 20)));

        $query = $this->db->getQuery(true)
            ->select(['u.id', 'u.email', 'u.username',
                      'm.first_name', 'm.last_name', 'm.app_role', 'm.avatar_url'])
            ->from($this->db->quoteName('#__users', 'u'))
            ->leftJoin($this->db->quoteName('#__ambassador_user_meta', 'm') . ' ON m.user_id = u.id')
            ->where('u.block = 0');

        // Filter by email
        if (!empty($filters['email']['$eq'])) {
            $query->where('u.email = ' . $this->db->quote($filters['email']['$eq']));
        }
        // Filter by documentId (= stringified user id)
        if (!empty($filters['documentId']['$eq'])) {
            $query->where('u.id = ' . (int) $filters['documentId']['$eq']);
        }

        $query->setLimit($limit);

        // Sort
        $sortParam = $_GET['sort'][0] ?? 'u.id:asc';
        [$sortField, $sortDir] = explode(':', $sortParam . ':asc');
        $allowedSort = ['firstName' => 'm.first_name', 'lastName' => 'm.last_name', 'email' => 'u.email'];
        $sortCol = $allowedSort[$sortField] ?? 'u.id';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $query->order("{$sortCol} {$sortDir}");

        $this->db->setQuery($query);
        $rows = $this->db->loadAssocList() ?: [];

        $items = array_map(fn($r) => [
            'id'         => (int) $r['id'],
            'documentId' => (string) $r['id'],
            'username'   => $r['username'],
            'email'      => $r['email'],
            'firstName'  => $r['first_name'] ?? '',
            'lastName'   => $r['last_name'] ?? '',
            'role'       => $r['app_role'] ?? 'Student',
            'avatar'     => $r['avatar_url'] ? ['url' => $r['avatar_url']] : null,
        ], $rows);

        ResponseHelper::collection($items);
    }
}
