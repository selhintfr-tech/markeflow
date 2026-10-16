<?php

$loader = require __DIR__ . '/../vendor/autoload.php';

// Dynamically bind App and Tests namespaces to this worktree directory
$baseDir = dirname(__DIR__);
$loader->setPsr4('App\\', [$baseDir . '/app']);
$loader->setPsr4('Tests\\', [$baseDir . '/tests']);

putenv("APP_BASE_PATH={$baseDir}");
$_ENV['APP_BASE_PATH'] = $baseDir;
