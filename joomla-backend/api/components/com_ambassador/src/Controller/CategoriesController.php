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
 * GET /v1/ambassador/news-categories
 * Returns Joomla categories where extension = 'com_ambassador'.
 */
class CategoriesController
{
    private DatabaseInterface $db;

    public function __construct()
    {
        $this->db = DbHelper::db();
    }

    public function index(): void
    {
        $query = $this->db->getQuery(true)
            ->select(['id', 'title', 'description'])
            ->from($this->db->quoteName('#__categories'))
            ->where($this->db->quoteName('extension') . ' = ' . $this->db->quote('com_ambassador'))
            ->where($this->db->quoteName('published') . ' = 1')
            ->order('title ASC');
        $this->db->setQuery($query);
        $rows = $this->db->loadAssocList() ?: [];

        $items = array_map(fn($r) => [
            'id'          => (int) $r['id'],
            'documentId'  => (string) $r['id'],
            'name'        => $r['title'],
            'description' => $r['description'],
        ], $rows);

        ResponseHelper::collection($items);
    }
}
