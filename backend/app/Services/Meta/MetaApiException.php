<?php

namespace App\Services\Meta;

use RuntimeException;

class MetaApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $httpStatus = 502,
        public readonly ?int $metaCode = null,
        public readonly bool $tokenInvalid = false,
        public readonly ?int $retryAfterSeconds = null,
    ) {
        parent::__construct($message);
    }
}