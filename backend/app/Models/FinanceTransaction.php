<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceTransaction extends Model
{
    use BelongsToWorkspace, HasUuids;

    public const TYPE_EXPENSE = 'expense';

    public const TYPE_INCOME = 'income';

    public const TYPES = [self::TYPE_EXPENSE, self::TYPE_INCOME];

    protected $fillable = ['type', 'category', 'description', 'amount', 'occurred_on'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'occurred_on' => 'date',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
