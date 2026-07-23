<?php

declare(strict_types=1);

namespace SRH\Component\Ambassador\Api\Helper;

use Joomla\CMS\Factory;
use Joomla\Database\DatabaseInterface;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * Thin wrapper around Joomla's database for raw query convenience.
 */
class DbHelper
{
    public static function db(): DatabaseInterface
    {
        return Factory::getContainer()->get(DatabaseInterface::class);
    }

    /**
     * Generate a UUID v4 string for document_id fields.
     */
    public static function uuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0F) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    /**
     * Build a URL-friendly slug from a title, ensuring uniqueness in a table.
     *
     * @param string $table  Full table name, e.g. '#__ambassador_clubs'
     */
    public static function uniqueSlug(string $title, string $table): string
    {
        $base = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $title), '-'));
        $slug = $base;
        $db   = self::db();
        $i    = 1;

        while (true) {
            $query = $db->getQuery(true)
                ->select('COUNT(*)')
                ->from($db->quoteName($table))
                ->where($db->quoteName('slug') . ' = ' . $db->quote($slug));
            $db->setQuery($query);
            $count = (int) $db->loadResult();

            if ($count === 0) {
                return $slug;
            }

            $slug = $base . '-' . $i;
            $i++;
        }
    }

    /**
     * Fetch tag names for a given tag_id array from Joomla #__tags.
     *
     * @param  int[] $tagIds
     * @return array<array{id:int,documentId:string,name:string}>
     */
    public static function fetchTags(array $tagIds): array
    {
        if (empty($tagIds)) {
            return [];
        }

        $db    = self::db();
        $query = $db->getQuery(true)
            ->select(['id', 'title'])
            ->from($db->quoteName('#__tags'))
            ->whereIn($db->quoteName('id'), array_map('intval', $tagIds));
        $db->setQuery($query);
        $rows = $db->loadAssocList() ?: [];

        return array_map(fn($r) => [
            'id'         => (int) $r['id'],
            'documentId' => (string) $r['id'],
            'name'       => $r['title'],
        ], $rows);
    }

    /**
     * Fetch a Joomla category row as a simple array.
     */
    public static function fetchCategory(?int $categoryId): ?array
    {
        if (!$categoryId) {
            return null;
        }

        $db    = self::db();
        $query = $db->getQuery(true)
            ->select(['id', 'title', 'description'])
            ->from($db->quoteName('#__categories'))
            ->where($db->quoteName('id') . ' = ' . (int) $categoryId);
        $db->setQuery($query);
        $row = $db->loadAssoc();

        if (!$row) {
            return null;
        }

        return [
            'id'          => (int) $row['id'],
            'documentId'  => (string) $row['id'],
            'name'        => $row['title'],
            'description' => $row['description'],
        ];
    }

    /**
     * Fetch a partial user record (for populating submittedBy / reviewedBy / author).
     */
    public static function fetchUserPartial(?int $userId): ?array
    {
        if (!$userId) {
            return null;
        }

        $db    = self::db();
        $query = $db->getQuery(true)
            ->select(['u.id', 'u.email', 'm.first_name', 'm.last_name', 'm.avatar_url', 'm.app_role'])
            ->from($db->quoteName('#__users', 'u'))
            ->leftJoin($db->quoteName('#__ambassador_user_meta', 'm') . ' ON m.user_id = u.id')
            ->where('u.id = ' . (int) $userId);
        $db->setQuery($query);
        $row = $db->loadAssoc();

        if (!$row) {
            return null;
        }

        return [
            'id'         => (int) $row['id'],
            'documentId' => (string) $row['id'],
            'firstName'  => $row['first_name'] ?? '',
            'lastName'   => $row['last_name'] ?? '',
            'email'      => $row['email'],
            'role'       => $row['app_role'] ?? 'Student',
            'avatar'     => $row['avatar_url'] ? ['url' => $row['avatar_url']] : null,
        ];
    }
}
