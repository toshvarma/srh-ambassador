<?php

declare(strict_types=1);

namespace SRH\Component\Ambassador\Api\Controller;

use Joomla\Database\DatabaseInterface;
use SRH\Component\Ambassador\Api\Helper\DbHelper;
use SRH\Component\Ambassador\Api\Helper\ResponseHelper;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * GET /v1/ambassador/news-tags
 * Returns all Joomla core tags (com_tags).
 */
class TagsController
{
    private DatabaseInterface $db;

    public function __construct()
    {
        $this->db = DbHelper::db();
    }

    public function index(): void
    {
        $query = $this->db->getQuery(true)
            ->select(['id', 'title'])
            ->from($this->db->quoteName('#__tags'))
            ->where($this->db->quoteName('published') . ' = 1')
            ->order('title ASC');
        $this->db->setQuery($query);
        $rows = $this->db->loadAssocList() ?: [];

        $items = array_map(fn($r) => [
            'id'         => (int) $r['id'],
            'documentId' => (string) $r['id'],
            'name'       => $r['title'],
        ], $rows);

        ResponseHelper::collection($items);
    }
}
