<?php

declare(strict_types=1);

namespace SRH\Component\Ambassador\Api\Helper;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * Standardised JSON response helper.
 *
 * All responses follow the Strapi-compatible shape the frontend expects:
 *   - List:   { "data": [ {..., id, documentId}, ... ] }
 *   - Single: { "data": {..., id, documentId} }
 *   - Error:  { "error": { "status": N, "message": "..." } }
 */
class ResponseHelper
{
    public static function collection(array $items, int $status = 200): void
    {
        self::send(['data' => array_values($items)], $status);
    }

    public static function single(array $item, int $status = 200): void
    {
        self::send(['data' => $item], $status);
    }

    public static function error(int $status, string $message): void
    {
        self::send(['error' => ['status' => $status, 'message' => $message, 'name' => 'ApplicationError']], $status);
    }

    private static function send(array $payload, int $status): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
