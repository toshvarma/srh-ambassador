<?php

/**
 * package.php — Creates com_ambassador.zip for Joomla installation.
 *
 * Run from the joomla-backend/ directory:
 *   php package.php
 *
 * Output: joomla-backend/com_ambassador.zip
 */

$baseDir  = __DIR__;
$zipPath  = $baseDir . '/com_ambassador.zip';
$include  = ['administrator', 'api', 'components', 'vendor', 'com_ambassador.xml'];

if (file_exists($zipPath)) {
    unlink($zipPath);
}

$zip = new ZipArchive();
if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    fwrite(STDERR, "Cannot create $zipPath\n");
    exit(1);
}

foreach ($include as $item) {
    $fullPath = $baseDir . '/' . $item;
    if (!file_exists($fullPath)) {
        echo "SKIP (not found): $item\n";
        continue;
    }
    if (is_file($fullPath)) {
        $zip->addFile($fullPath, $item);
        echo "ADD file: $item\n";
    } else {
        addDir($zip, $fullPath, $item);
    }
}

$zip->close();
echo "\nPackaged: $zipPath\n";
echo "Size: " . round(filesize($zipPath) / 1024, 1) . " KB\n";

function addDir(ZipArchive $zip, string $realPath, string $zipPath): void
{
    $zip->addEmptyDir($zipPath);
    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($realPath, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($items as $file) {
        if (!$file->isFile()) {
            continue;
        }
        $filePath = $file->getRealPath();
        $relative = $zipPath . '/' . ltrim(str_replace($realPath, '', $filePath), '/\\');
        $relative = str_replace('\\', '/', $relative);
        $zip->addFile($filePath, $relative);
        echo "ADD: $relative\n";
    }
}
