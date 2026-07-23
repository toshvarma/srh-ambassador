<?php

declare(strict_types=1);

namespace SRH\Component\Ambassador\Api\Controller;

use Joomla\CMS\Factory;
use SRH\Component\Ambassador\Api\Helper\JwtHelper;
use SRH\Component\Ambassador\Api\Helper\ResponseHelper;

// phpcs:disable PSR1.Files.SideEffects
\defined('_JEXEC') or die;
// phpcs:enable PSR1.Files.SideEffects

/**
 * POST /v1/ambassador/upload
 *
 * Accepts a multipart/form-data upload with field name `files`.
 * Saves the file to /images/ambassador/ under the Joomla root.
 * Returns the same shape as Strapi's upload endpoint:
 *   [ { "url": "/images/ambassador/filename.jpg" } ]
 */
class UploadController
{
    private const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const MAX_SIZE      = 10 * 1024 * 1024; // 10 MB

    public function upload(): void
    {
        JwtHelper::requireAuth();

        if (empty($_FILES['files'])) {
            ResponseHelper::error(400, 'No file uploaded. Use field name "files".');
        }

        $file    = $_FILES['files'];
        $tmpPath = $file['tmp_name'];
        $origName = basename($file['name']);

        // Validate MIME
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime  = $finfo->file($tmpPath);
        if (!in_array($mime, self::ALLOWED_TYPES, true)) {
            ResponseHelper::error(422, "File type '{$mime}' is not allowed. Only images (JPEG, PNG, WebP, GIF).");
        }

        // Validate size
        if ($file['size'] > self::MAX_SIZE) {
            ResponseHelper::error(422, 'File exceeds 10 MB limit.');
        }

        // Build destination path
        $joomlaRoot  = JPATH_ROOT;
        $uploadDir   = $joomlaRoot . '/images/ambassador';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $ext      = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '-', pathinfo($origName, PATHINFO_FILENAME));
        $fileName = $safeName . '-' . substr(md5(uniqid('', true)), 0, 8) . '.' . $ext;
        $destPath = $uploadDir . '/' . $fileName;

        if (!move_uploaded_file($tmpPath, $destPath)) {
            ResponseHelper::error(500, 'Failed to save uploaded file.');
        }

        // Return Strapi-compatible response: array of { url }
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode([['url' => '/images/ambassador/' . $fileName]]);
        exit;
    }
}
