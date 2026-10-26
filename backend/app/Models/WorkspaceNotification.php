<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkspaceNotification extends Model
{
    protected $table = 'workspace_notifications';

    protected $fillable = [
        'user_id',
        'workspace_id',
        'event_key',
        'type',
        'title',
        'description',
        'action_url',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }
}
