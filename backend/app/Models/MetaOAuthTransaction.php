<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MetaOAuthTransaction extends Model
{
    protected $table = 'meta_oauth_transactions';

    protected $fillable = [
        'state_hash',
        'user_id',
        'workspace_id',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }
}
