<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class UnauthorizedWorkspaceActionException extends AccessDeniedHttpException
{
    //
}
