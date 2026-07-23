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
 * Events REST endpoints:
 *
 *   GET  /v1/ambassador/events        – list (public)
 *   GET  /v1/ambassador/events/:id    – detail (public)
 *   POST /v1/ambassador/events        – create (auth; Ambassador/Professor/Teacher/Admin/SuperAdmin)
 *   PUT  /v1/ambassador/events/:id    – update attendees (auth)
 */
class EventsController
{
    private const CAN_CREATE = ['Ambassador', 'Professor', 'Teacher', 'Admin', 'SuperAdmin'];

    private DatabaseInterface $db;

    public function __construct()
    {
        $this->db = DbHelper::db();
    }

    public function index(): void
    {
        $filters = $_GET['filters'] ?? [];
        $limit   = max(1, min(500, (int) ($_GET['pagination']['limit'] ?? 100)));

        $query = $this->db->getQuery(true)
            ->select('e.*')
            ->from($this->db->quoteName('#__ambassador_events', 'e'))
            ->where('e.state = 1');

        // Filter: attendees.documentId (profile page: joined events)
        if (!empty($filters['attendees']['documentId']['$eq'])) {
            $uid = (int) $filters['attendees']['documentId']['$eq'];
            $query->join('INNER',
                $this->db->quoteName('#__ambassador_event_attendees', 'ea_f') .
                ' ON ea_f.event_id = e.id AND ea_f.user_id = ' . $uid
            );
        }
        // Filter: author.documentId (profile: authored events)
        if (!empty($filters['author']['documentId']['$eq'])) {
            $query->where('e.author_id = ' . (int) $filters['author']['documentId']['$eq']);
        }

        // Sort
        $sortParam = $_GET['sort'][0] ?? 'start_datetime:asc';
        [$sortField, $sortDir] = explode(':', $sortParam . ':asc');
        $allowedSort = ['start_datetime' => 'e.start_datetime', 'title' => 'e.title', 'createdAt' => 'e.created'];
        $sortCol = $allowedSort[$sortField] ?? 'e.start_datetime';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $query->order("{$sortCol} {$sortDir}")->setLimit($limit);

        $this->db->setQuery($query);
        $rows = $this->db->loadAssocList() ?: [];

        $populate = $this->parsePopulate();
        $items    = array_map(fn($r) => $this->formatEvent($r, $populate), $rows);
        ResponseHelper::collection($items);
    }

    public function show(string $documentId): void
    {
        $row = $this->findByDocumentId($documentId);
        if (!$row) {
            ResponseHelper::error(404, 'Event not found.');
        }
        ResponseHelper::single($this->formatEvent($row, $this->parsePopulate()));
    }

    public function create(): void
    {
        $jwt = JwtHelper::requireAuth();
        JwtHelper::requireRole($jwt, self::CAN_CREATE);

        $body = (array) json_decode(file_get_contents('php://input') ?: '{}', true);
        $data = (array) ($body['data'] ?? $body);

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            ResponseHelper::error(400, 'title is required.');
        }

        $documentId = DbHelper::uuid();
        $slug       = DbHelper::uniqueSlug($title, '#__ambassador_events');
        $categoryId = $this->resolveCategoryId($data['category'] ?? null);

        $row = (object) [
            'document_id'      => $documentId,
            'title'            => $title,
            'slug'             => $slug,
            'short_description'=> $data['shortDescription'] ?? null,
            'description'      => $data['description'] ?? null,
            'location'         => $data['location'] ?? null,
            'start_datetime'   => $data['start_datetime'] ?: null,
            'end_datetime'     => $data['end_datetime'] ?: null,
            'thumbnail_url'    => $data['thumbnailUrl'] ?? null,
            'author_name'      => $data['authorName'] ?? null,
            'author_id'        => isset($data['author']) ? (int) $data['author'] : (int) $jwt['sub'],
            'category_id'      => $categoryId,
            'state'            => 1,
        ];

        $this->db->insertObject('#__ambassador_events', $row);
        $newId = (int) $this->db->insertid();

        // Tags
        $this->syncTags($newId, $data['tags'] ?? [], '#__ambassador_event_tags', 'event_id');

        $inserted = $this->findById($newId);
        ResponseHelper::single($this->formatEvent($inserted, ['category', 'tags']));
    }

    public function update(string $documentId): void
    {
        $jwt = JwtHelper::requireAuth();

        $existing = $this->findByDocumentId($documentId);
        if (!$existing) {
            ResponseHelper::error(404, 'Event not found.');
        }

        $eventId = (int) $existing['id'];
        $body    = (array) json_decode(file_get_contents('php://input') ?: '{}', true);
        $data    = (array) ($body['data'] ?? $body);

        // Update attendees list
        if (array_key_exists('attendees', $data)) {
            $attendeeDocIds = (array) $data['attendees'];
            $delQ = $this->db->getQuery(true)
                ->delete($this->db->quoteName('#__ambassador_event_attendees'))
                ->where('event_id = ' . $eventId);
            $this->db->setQuery($delQ)->execute();

            foreach ($attendeeDocIds as $adocId) {
                $aid = (int) $adocId;
                if ($aid > 0) {
                    $this->db->insertObject('#__ambassador_event_attendees', (object) [
                        'event_id' => $eventId,
                        'user_id'  => $aid,
                    ]);
                }
            }

            $updated = $this->findById($eventId);
            ResponseHelper::single($this->formatEvent($updated, ['attendees']));
            return;
        }

        // General field update
        $update = $this->db->getQuery(true)
            ->update($this->db->quoteName('#__ambassador_events'))
            ->where('id = ' . $eventId);

        $fieldMap = [
            'title'            => 'title',
            'shortDescription' => 'short_description',
            'description'      => 'description',
            'location'         => 'location',
            'start_datetime'   => 'start_datetime',
            'end_datetime'     => 'end_datetime',
            'thumbnailUrl'     => 'thumbnail_url',
            'authorName'       => 'author_name',
        ];

        $hasSets = false;
        foreach ($fieldMap as $jsonKey => $dbCol) {
            if (array_key_exists($jsonKey, $data)) {
                $val = $data[$jsonKey];
                $update->set($this->db->quoteName($dbCol) . ' = ' .
                    ($val === null ? 'NULL' : $this->db->quote((string) $val)));
                $hasSets = true;
            }
        }
        if (array_key_exists('category', $data)) {
            $catId = $this->resolveCategoryId($data['category']);
            $update->set('category_id = ' . ($catId ? $catId : 'NULL'));
            $hasSets = true;
        }
        if ($hasSets) {
            $this->db->setQuery($update)->execute();
        }
        if (array_key_exists('tags', $data)) {
            $this->syncTags($eventId, $data['tags'], '#__ambassador_event_tags', 'event_id');
        }

        $updated = $this->findById($eventId);
        ResponseHelper::single($this->formatEvent($updated, $this->parsePopulate()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function findByDocumentId(string $documentId): ?array
    {
        $query = $this->db->getQuery(true)
            ->select('*')
            ->from($this->db->quoteName('#__ambassador_events'))
            ->where('(document_id = ' . $this->db->quote($documentId) .
                    ' OR id = ' . (int) $documentId . ')')
            ->where('state = 1');
        $this->db->setQuery($query);
        return $this->db->loadAssoc() ?: null;
    }

    private function findById(int $id): ?array
    {
        $query = $this->db->getQuery(true)
            ->select('*')
            ->from($this->db->quoteName('#__ambassador_events'))
            ->where('id = ' . $id);
        $this->db->setQuery($query);
        return $this->db->loadAssoc() ?: null;
    }

    private function parsePopulate(): array
    {
        $raw = $_GET['populate'] ?? [];
        return is_array($raw) ? array_values($raw) : [];
    }

    /**
     * Resolve a category ID from various formats the frontend may send:
     * - null / empty string → null
     * - numeric string / int → int
     * - documentId string → treat as id
     */
    private function resolveCategoryId(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === 'null') {
            return null;
        }
        return (int) $value ?: null;
    }

    private function fetchTagIds(int $itemId, string $table, string $idCol): array
    {
        $query = $this->db->getQuery(true)
            ->select('tag_id')
            ->from($this->db->quoteName($table))
            ->where("{$idCol} = " . $itemId);
        $this->db->setQuery($query);
        return array_map('intval', $this->db->loadColumn() ?: []);
    }

    private function syncTags(int $itemId, array $tagIds, string $table, string $idCol): void
    {
        $delQ = $this->db->getQuery(true)
            ->delete($this->db->quoteName($table))
            ->where("{$idCol} = " . $itemId);
        $this->db->setQuery($delQ)->execute();

        foreach ($tagIds as $tagId) {
            $tid = (int) $tagId;
            if ($tid > 0) {
                $this->db->insertObject($table, (object) [
                    $idCol   => $itemId,
                    'tag_id' => $tid,
                ]);
            }
        }
    }

    private function fetchAttendees(int $eventId): array
    {
        $query = $this->db->getQuery(true)
            ->select(['u.id', 'u.email', 'm.first_name', 'm.last_name'])
            ->from($this->db->quoteName('#__ambassador_event_attendees', 'ea'))
            ->join('INNER', $this->db->quoteName('#__users', 'u') . ' ON u.id = ea.user_id')
            ->leftJoin($this->db->quoteName('#__ambassador_user_meta', 'm') . ' ON m.user_id = u.id')
            ->where('ea.event_id = ' . $eventId);
        $this->db->setQuery($query);
        $rows = $this->db->loadAssocList() ?: [];

        return array_map(fn($r) => [
            'id'         => (int) $r['id'],
            'documentId' => (string) $r['id'],
            'firstName'  => $r['first_name'] ?? '',
            'lastName'   => $r['last_name'] ?? '',
            'email'      => $r['email'],
        ], $rows);
    }

    private function formatEvent(array $r, array $populate): array
    {
        $eventId = (int) $r['id'];
        $tagIds  = $this->fetchTagIds($eventId, '#__ambassador_event_tags', 'event_id');

        $item = [
            'id'               => $eventId,
            'documentId'       => $r['document_id'] ?: (string) $eventId,
            'slug'             => $r['slug'],
            'title'            => $r['title'],
            'shortDescription' => $r['short_description'],
            'description'      => $r['description'],
            'location'         => $r['location'],
            'start_datetime'   => $r['start_datetime'],
            'end_datetime'     => $r['end_datetime'],
            'thumbnailUrl'     => $r['thumbnail_url'],
            'authorName'       => $r['author_name'],
            'createdAt'        => $r['created'],
            'updatedAt'        => $r['modified'],
            'publishedAt'      => $r['created'],
            'category'         => DbHelper::fetchCategory((int) ($r['category_id'] ?? 0)),
            'tags'             => DbHelper::fetchTags($tagIds),
            'author'           => DbHelper::fetchUserPartial((int) ($r['author_id'] ?? 0)),
            'attendees'        => [],
        ];

        if (in_array('attendees', $populate, true)) {
            $item['attendees'] = $this->fetchAttendees($eventId);
        }

        return $item;
    }
}
