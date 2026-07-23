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
 * News-items REST endpoints:
 *
 *   GET  /v1/ambassador/news-items        – list (public)
 *   GET  /v1/ambassador/news-items/:id    – detail (public)
 *   POST /v1/ambassador/news-items        – create (auth; Ambassador/Professor/Teacher/Admin/SuperAdmin)
 *   PUT  /v1/ambassador/news-items/:id    – update (same roles)
 */
class NewsController
{
    private const CAN_MANAGE = ['Ambassador', 'Professor', 'Teacher', 'Admin', 'SuperAdmin'];

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
            ->select('n.*')
            ->from($this->db->quoteName('#__ambassador_news', 'n'));

        // Filter: author.documentId (profile page: authored news)
        if (!empty($filters['author']['documentId']['$eq'])) {
            $query->where('n.author_id = ' . (int) $filters['author']['documentId']['$eq']);
        }

        // Sort
        $sortParam = $_GET['sort'][0] ?? 'createdAt:desc';
        [$sortField, $sortDir] = explode(':', $sortParam . ':desc');
        $allowedSort = ['createdAt' => 'n.created', 'title' => 'n.title', 'publishedAt' => 'n.published_at'];
        $sortCol = $allowedSort[$sortField] ?? 'n.created';
        $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';
        $query->order("{$sortCol} {$sortDir}")->setLimit($limit);

        $this->db->setQuery($query);
        $rows  = $this->db->loadAssocList() ?: [];
        $items = array_map(fn($r) => $this->formatNews($r), $rows);
        ResponseHelper::collection($items);
    }

    public function show(string $documentId): void
    {
        $row = $this->findByDocumentId($documentId);
        if (!$row) {
            ResponseHelper::error(404, 'News item not found.');
        }
        ResponseHelper::single($this->formatNews($row));
    }

    public function create(): void
    {
        $jwt = JwtHelper::requireAuth();
        JwtHelper::requireRole($jwt, self::CAN_MANAGE);

        $body = (array) json_decode(file_get_contents('php://input') ?: '{}', true);
        $data = (array) ($body['data'] ?? $body);

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            ResponseHelper::error(400, 'title is required.');
        }

        $documentId = DbHelper::uuid();
        $slug       = DbHelper::uniqueSlug($title, '#__ambassador_news');
        $categoryId = $this->resolveCategoryId($data['category'] ?? null);
        $status     = in_array($data['status'] ?? '', ['draft', 'published', 'archived'], true)
            ? $data['status'] : 'draft';
        $publishedAt = ($status === 'published')
            ? ($data['publishedAt'] ?? date('Y-m-d H:i:s'))
            : null;

        $row = (object) [
            'document_id'        => $documentId,
            'title'              => $title,
            'slug'               => $slug,
            'excerpt'            => $data['excerpt'] ?? null,
            'content'            => $data['content'] ?? null,
            'featured_image_url' => $data['featuredImageUrl'] ?? null,
            'category_id'        => $categoryId,
            'author_id'          => isset($data['author']) ? (int) $data['author'] : (int) $jwt['sub'],
            'status'             => $status,
            'visibility'         => in_array($data['visibility'] ?? '', ['all', 'student', 'professor'], true)
                                    ? $data['visibility'] : 'all',
            'course_label'       => $data['courseLabel'] ?? null,
            'published_at'       => $publishedAt,
        ];

        $this->db->insertObject('#__ambassador_news', $row);
        $newId = (int) $this->db->insertid();

        $this->syncTags($newId, $data['tags'] ?? []);

        $inserted = $this->findById($newId);
        ResponseHelper::single($this->formatNews($inserted));
    }

    public function update(string $documentId): void
    {
        $jwt = JwtHelper::requireAuth();
        JwtHelper::requireRole($jwt, self::CAN_MANAGE);

        $existing = $this->findByDocumentId($documentId);
        if (!$existing) {
            ResponseHelper::error(404, 'News item not found.');
        }

        $newsId = (int) $existing['id'];
        $body   = (array) json_decode(file_get_contents('php://input') ?: '{}', true);
        $data   = (array) ($body['data'] ?? $body);

        $update = $this->db->getQuery(true)
            ->update($this->db->quoteName('#__ambassador_news'))
            ->where('id = ' . $newsId);

        $fieldMap = [
            'title'           => 'title',
            'excerpt'         => 'excerpt',
            'content'         => 'content',
            'featuredImageUrl'=> 'featured_image_url',
            'status'          => 'status',
            'visibility'      => 'visibility',
            'courseLabel'     => 'course_label',
            'publishedAt'     => 'published_at',
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
            $this->syncTags($newsId, $data['tags']);
        }

        $updated = $this->findById($newsId);
        ResponseHelper::single($this->formatNews($updated));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function findByDocumentId(string $documentId): ?array
    {
        $query = $this->db->getQuery(true)
            ->select('*')
            ->from($this->db->quoteName('#__ambassador_news'))
            ->where('(document_id = ' . $this->db->quote($documentId) .
                    ' OR id = ' . (int) $documentId . ')');
        $this->db->setQuery($query);
        return $this->db->loadAssoc() ?: null;
    }

    private function findById(int $id): ?array
    {
        $query = $this->db->getQuery(true)
            ->select('*')
            ->from($this->db->quoteName('#__ambassador_news'))
            ->where('id = ' . $id);
        $this->db->setQuery($query);
        return $this->db->loadAssoc() ?: null;
    }

    private function resolveCategoryId(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === 'null') {
            return null;
        }
        return (int) $value ?: null;
    }

    private function syncTags(int $newsId, array $tagIds): void
    {
        $delQ = $this->db->getQuery(true)
            ->delete($this->db->quoteName('#__ambassador_news_tags'))
            ->where('news_id = ' . $newsId);
        $this->db->setQuery($delQ)->execute();

        foreach ($tagIds as $tagId) {
            $tid = (int) $tagId;
            if ($tid > 0) {
                $this->db->insertObject('#__ambassador_news_tags', (object) [
                    'news_id' => $newsId,
                    'tag_id'  => $tid,
                ]);
            }
        }
    }

    private function fetchTagIds(int $newsId): array
    {
        $query = $this->db->getQuery(true)
            ->select('tag_id')
            ->from($this->db->quoteName('#__ambassador_news_tags'))
            ->where('news_id = ' . $newsId);
        $this->db->setQuery($query);
        return array_map('intval', $this->db->loadColumn() ?: []);
    }

    private function formatNews(array $r): array
    {
        $newsId = (int) $r['id'];
        $tagIds = $this->fetchTagIds($newsId);

        return [
            'id'              => $newsId,
            'documentId'      => $r['document_id'] ?: (string) $newsId,
            'slug'            => $r['slug'],
            'title'           => $r['title'],
            'excerpt'         => $r['excerpt'],
            'content'         => $r['content'],
            'featuredImageUrl'=> $r['featured_image_url'],
            'status'          => $r['status'],
            'visibility'      => $r['visibility'],
            'courseLabel'     => $r['course_label'],
            'publishedAt'     => $r['published_at'],
            'createdAt'       => $r['created'],
            'updatedAt'       => $r['modified'],
            'category'        => DbHelper::fetchCategory((int) ($r['category_id'] ?? 0)),
            'tags'            => DbHelper::fetchTags($tagIds),
            'author'          => DbHelper::fetchUserPartial((int) ($r['author_id'] ?? 0)),
        ];
    }
}
