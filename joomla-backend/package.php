<?php

/**
 * package.php — Creates com_ambassador.zip for Joomla installation.
 *
 * Run from the joomla-backend/ directory:
 *   php package.php
 *
 * Output: joomla-backend/com_ambassador.zip
 */

$baseDir = __DIR__;
$zipPath = $baseDir . '/com_ambassador.zip';

$folderMap = [
    'administrator' => $baseDir . '/administrator/components/com_ambassador',
    'api'           => $baseDir . '/api/components/com_ambassador',
    'vendor'        => $baseDir . '/vendor',
];

$manifestFile = $baseDir . '/administrator/com_ambassador.xml';
$manifestBasename = basename($manifestFile); // com_ambassador.xml — used to skip it during sweep

if (file_exists($zipPath)) {
    unlink($zipPath);
}

$zip = new ZipArchive();
if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    fwrite(STDERR, "Cannot create $zipPath\n");
    exit(1);
}

foreach ($folderMap as $zipFolderName => $localPath) {
    if (!is_dir($localPath)) {
        echo "SKIP (not found): $localPath\n";
        continue;
    }
    addDir($zip, $localPath, $zipFolderName, $manifestBasename);
}

if (!file_exists($manifestFile)) {
    fwrite(STDERR, "Manifest not found at $manifestFile\n");
    exit(1);
}
$zip->addFile($manifestFile, 'com_ambassador.xml');
echo "ADD file (root manifest): com_ambassador.xml\n";

$zip->close();
echo "\nPackaged: $zipPath\n";
echo "Size: " . round(filesize($zipPath) / 1024, 1) . " KB\n";

function addDir(ZipArchive $zip, string $realPath, string $zipPath, string $skipBasename = ''): void
{
    $zip->addEmptyDir($zipPath);

    $normalizedBase = str_replace('\\', '/', realpath($realPath));

    $items = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($realPath, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($items as $file) {
        if (!$file->isFile()) {
            continue;
        }
        // Skip the manifest here — it's added separately at the zip root
        if ($skipBasename !== '' && $file->getFilename() === $skipBasename) {
            continue;
        }
        $filePath = str_replace('\\', '/', $file->getRealPath());
        $relative = $zipPath . '/' . ltrim(str_replace($normalizedBase, '', $filePath), '/');
        $zip->addFile($file->getRealPath(), $relative);
        echo "ADD: $relative\n";
    }
}