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
 * Clubs REST endpoints:
 *
 *   GET    /v1/ambassador/clubs          – list (public)
 *   GET    /v1/ambassador/clubs/:id      – detail (public)
 *   POST   /v1/ambassador/clubs          – create (auth; Student/ExchangeStudent/Admin/SuperAdmin)
 *   PUT    /v1/ambassador/clubs/:id      – update members OR approval status (auth; role-gated)
 */
class ClubsController
{
    private const CAN_SUBMIT  = ['Student', 'ExchangeStudent', 'Admin', 'SuperAdmin'];
    private const CAN_APPROVE = ['Ambassador', 'Admin', 'SuperAdmin'];

    private DatabaseInterface $db;

    public function __construct()
    {
        $this->db = DbHelper::db();
    }

    // ── GET /v1/ambassador/clubs ──────────────────────────────────────────────

    public function index(): void
    {
        $filters = $_GET['filters'] ?? [];
        $limit   = max(1, min(500, (int) ($_GET['pagination']['limit'] ?? 100)));

        $query = $this->db->getQuery(true)
            ->select('c.*')
            ->from($this->db->quoteName('#__ambassador_clubs', 'c'))
            ->where('c.state = 1');

        // Filter: approvalStatus
        if (!empty($filters['approvalStatus']['$eq'])) {
            $query->where('c.approval_status = ' . $this->db->quote($filters['approvalStatus']['$eq']));
        }
        // Filter: slug
        if (!empty($filters['slug']['$eq'])) {
            $query->where('c.slug = ' . $this->db->quote($filters['slug']['$eq']));
        }
        // Filter: documentId
        if (!empty($filters['documentId']['$eq'])) {
            $query->where('c.document_id = ' . $this->db->quote($filters['documentId']['$eq']));
        }
        // Filter: submittedBy.documentId  (profile page: my submissions)
        if (!empty($filters['submittedBy']['documentId']['$eq'])) {
            $query->where('c.submitted_by = ' . (int) $filters['submittedBy']['documentId']['$eq']);
        }
        // Filter: members.documentId  (profile page: my memberships)
        if (!empty($filters['members']['documentId']['$eq'])) {
            $memberId = (int) $filters['members']['documentId']['$eq'];
            $query->join('INNER',
                $this->db->quoteName('#__ambassador_club_members', 'cm_filter') .
                ' ON cm_filter.club_id = c.id AND cm_filter.user_id = ' . $memberId
            );
        }

        // Sort
        $sortParam = $_GET['sort'][0] ?? 'title:asc';
        [$sortField, $sortDir] = explode(':', $sortParam . ':asc');
        $allowedSort = ['title' => 'c.title', 'createdAt' => 'c.created', 'updatedAt' => 'c.modified'];
        $sortCol = $allowedSort[$sortField] ?? 'c.title';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $query->order("{$sortCol} {$sortDir}")->setLimit($limit);

        $this->db->setQuery($query);
        $rows = $this->db->loadAssocList() ?: [];

        $populate = $this->parsePopulate();
        $items    = array_map(fn($r) => $this->formatClub($r, $populate), $rows);

        ResponseHelper::collection($items);
    }

    // ── GET /v1/ambassador/clubs/:documentId ──────────────────────────────────

    public function show(string $documentId): void
    {
        $row = $this->findByDocumentId($documentId);
        if (!$row) {
            ResponseHelper::error(404, 'Club not found.');
        }

        $populate = $this->parsePopulate();
        ResponseHelper::single($this->formatClub($row, $populate));
    }

    // ── POST /v1/ambassador/clubs ─────────────────────────────────────────────

    public function create(): void
    {
        $jwt = JwtHelper::requireAuth();
        JwtHelper::requireRole($jwt, self::CAN_SUBMIT);

        $body = (array) json_decode(file_get_contents('php://input') ?: '{}', true);
        $data = (array) ($body['data'] ?? $body);

        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            ResponseHelper::error(400, 'title is required.');
        }

        $documentId = DbHelper::uuid();
        $slug       = DbHelper::uniqueSlug($title, '#__ambassador_clubs');

        $row = (object) [
            'document_id'          => $documentId,
            'title'                => $title,
            'slug'                 => $slug,
            'short_description'    => $data['shortDescription'] ?? null,
            'description'          => $data['description'] ?? null,
            'detailed_description' => $data['detailedDescription'] ?? null,
            'cover_image_url'      => $data['coverImageUrl'] ?? null,
            'contact_email'        => $data['contact_email'] ?? null,
            'min_members'          => isset($data['minimumMembers']) ? (int) $data['minimumMembers'] : 5,
            'max_members'          => isset($data['maximumMembers']) ? (int) $data['maximumMembers'] : 30,
            'meeting_frequency'    => $data['meetingFrequency'] ?? null,
            'recommended_for'      => $data['recommendedFor'] ?? null,
            'special_equipment'    => $data['specialEquipmentRequired'] ?? null,
            'signup_notes'         => $data['signupNotes'] ?? null,
            'approval_status'      => 'pending',
            'submitted_by'         => isset($data['submittedBy']) ? (int) $data['submittedBy'] : (int) $jwt['sub'],
            'state'                => 1,
        ];

        $this->db->insertObject('#__ambassador_clubs', $row);
        $newId = (int) $this->db->insertid();

        $inserted = $this->findById($newId);
        ResponseHelper::single($this->formatClub($inserted, []));
    }

    // ── PUT /v1/ambassador/clubs/:documentId ──────────────────────────────────

    public function update(string $documentId): void
    {
        $jwt    = JwtHelper::requireAuth();
        $userId = (int) $jwt['sub'];
        $role   = $jwt['role'] ?? 'Student';

        $existing = $this->findByDocumentId($documentId);
        if (!$existing) {
            ResponseHelper::error(404, 'Club not found.');
        }

        $clubId = (int) $existing['id'];
        $body   = (array) json_decode(file_get_contents('php://input') ?: '{}', true);
        $data   = (array) ($body['data'] ?? $body);

        // ── Case A: updating members list (join club) ──────────────────────────
        if (array_key_exists('members', $data)) {
            $memberDocIds = (array) $data['members'];
            // Replace all members with the new list (each entry = documentId = user id as string)
            $this->db->getQuery(true); // reset
            $deleteQ = $this->db->getQuery(true)
                ->delete($this->db->quoteName('#__ambassador_club_members'))
                ->where('club_id = ' . $clubId);
            $this->db->setQuery($deleteQ)->execute();

            foreach ($memberDocIds as $memberDocId) {
                $memberId = (int) $memberDocId;
                if ($memberId <= 0) {
                    continue;
                }
                $this->db->insertObject('#__ambassador_club_members', (object) [
                    'club_id' => $clubId,
                    'user_id' => $memberId,
                ]);
            }

            $updated = $this->findById($clubId);
            ResponseHelper::single($this->formatClub($updated, ['members']));
            return;
        }

        // ── Case B: approval workflow (approve / reject / feedback) ───────────
        if (array_key_exists('approvalStatus', $data)) {
            JwtHelper::requireRole($jwt, self::CAN_APPROVE);

            $update = $this->db->getQuery(true)
                ->update($this->db->quoteName('#__ambassador_clubs'))
                ->where('id = ' . $clubId);

            $update->set('approval_status = ' . $this->db->quote($data['approvalStatus']));
            $update->set('reviewed_by = ' . (int) ($data['reviewedBy'] ?? $userId));

            if (array_key_exists('ambassadorFeedback', $data)) {
                $update->set('ambassador_feedback = ' . ($data['ambassadorFeedback']
                    ? $this->db->quote($data['ambassadorFeedback']) : 'NULL'));
            }
            if (array_key_exists('rejectionReason', $data)) {
                $update->set('rejection_reason = ' . ($data['rejectionReason']
                    ? $this->db->quote($data['rejectionReason']) : 'NULL'));
            }

            $this->db->setQuery($update)->execute();

            $updated = $this->findById($clubId);
            ResponseHelper::single($this->formatClub($updated, ['submittedBy', 'reviewedBy', 'members']));
            return;
        }

        // ── Case C: general field update ──────────────────────────────────────
        $update = $this->db->getQuery(true)
            ->update($this->db->quoteName('#__ambassador_clubs'))
            ->where('id = ' . $clubId);

        $fieldMap = [
            'title'                   => 'title',
            'shortDescription'        => 'short_description',
            'description'             => 'description',
            'detailedDescription'     => 'detailed_description',
            'coverImageUrl'           => 'cover_image_url',
            'contact_email'           => 'contact_email',
            'minimumMembers'          => 'min_members',
            'maximumMembers'          => 'max_members',
            'meetingFrequency'        => 'meeting_frequency',
            'recommendedFor'          => 'recommended_for',
            'specialEquipmentRequired'=> 'special_equipment',
            'signupNotes'             => 'signup_notes',
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

        if ($hasSets) {
            $this->db->setQuery($update)->execute();
        }

        $updated = $this->findById($clubId);
        ResponseHelper::single($this->formatClub($updated, $this->parsePopulate()));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function findByDocumentId(string $documentId): ?array
    {
        $query = $this->db->getQuery(true)
            ->select('*')
            ->from($this->db->quoteName('#__ambassador_clubs'))
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
            ->from($this->db->quoteName('#__ambassador_clubs'))
            ->where('id = ' . $id);
        $this->db->setQuery($query);
        return $this->db->loadAssoc() ?: null;
    }

    private function parsePopulate(): array
    {
        // ?populate[0]=submittedBy&populate[1]=members etc.
        $raw = $_GET['populate'] ?? [];
        return is_array($raw) ? array_values($raw) : [];
    }

    private function fetchMembers(int $clubId): array
    {
        $query = $this->db->getQuery(true)
            ->select(['u.id', 'u.email', 'm.first_name', 'm.last_name', 'm.avatar_url'])
            ->from($this->db->quoteName('#__ambassador_club_members', 'cm'))
            ->join('INNER', $this->db->quoteName('#__users', 'u') . ' ON u.id = cm.user_id')
            ->leftJoin($this->db->quoteName('#__ambassador_user_meta', 'm') . ' ON m.user_id = u.id')
            ->where('cm.club_id = ' . $clubId);
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

    private function formatClub(array $r, array $populate): array
    {
        $clubId = (int) $r['id'];

        $item = [
            'id'                   => $clubId,
            'documentId'           => $r['document_id'] ?: (string) $clubId,
            'slug'                 => $r['slug'],
            'title'                => $r['title'],
            'shortDescription'     => $r['short_description'],
            'description'          => $r['description'],
            'detailedDescription'  => $r['detailed_description'],
            'coverImageUrl'        => $r['cover_image_url'],
            'contact_email'        => $r['contact_email'],
            'minimumMembers'       => (int) ($r['min_members'] ?? 5),
            'maximumMembers'       => (int) ($r['max_members'] ?? 30),
            'meetingFrequency'     => $r['meeting_frequency'],
            'recommendedFor'       => $r['recommended_for'],
            'specialEquipmentRequired' => $r['special_equipment'],
            'signupNotes'          => $r['signup_notes'],
            'ambassadorFeedback'   => $r['ambassador_feedback'],
            'rejectionReason'      => $r['rejection_reason'],
            'approvalStatus'       => $r['approval_status'],
            'createdAt'            => $r['created'],
            'updatedAt'            => $r['modified'],
            'publishedAt'          => $r['created'],
            'submittedBy'          => null,
            'reviewedBy'           => null,
            'members'              => [],
            'gallery'              => [],
        ];

        if (in_array('submittedBy', $populate, true) || in_array('0', $populate, true)) {
            $item['submittedBy'] = DbHelper::fetchUserPartial((int) ($r['submitted_by'] ?? 0));
        }
        if (in_array('reviewedBy', $populate, true) || in_array('2', $populate, true)) {
            $item['reviewedBy'] = DbHelper::fetchUserPartial((int) ($r['reviewed_by'] ?? 0));
        }
        if (in_array('members', $populate, true) || in_array('1', $populate, true)) {
            $item['members'] = $this->fetchMembers($clubId);
        }

        return $item;
    }
}
