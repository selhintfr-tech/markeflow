<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreBudgetRequest;
use App\Http\Requests\Finance\StoreTransactionRequest;
use App\Http\Requests\Finance\UpdateBudgetRequest;
use App\Http\Requests\Finance\UpdateTransactionRequest;
use App\Http\Resources\Api\FinanceBudgetResource;
use App\Http\Resources\Api\FinanceTransactionResource;
use App\Models\FinanceBudget;
use App\Models\FinanceTransaction;
use App\Services\TenantContext;
use App\Services\WorkspaceModuleAccessService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FinanceController extends Controller
{
    public function __construct(
        private readonly TenantContext $tenantContext,
        private readonly WorkspaceModuleAccessService $access,
    ) {}

    public function budgets(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'category' => ['sometimes', 'string', 'max:100'],
            'starts_on' => ['sometimes', 'date_format:Y-m-d'],
            'ends_on' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        return FinanceBudgetResource::collection(
            FinanceBudget::query()
                ->where('workspace_id', $this->tenantContext->getWorkspaceId())
                ->when($filters['category'] ?? null, fn ($query, string $category) => $query->where('category', $category))
                ->when($filters['starts_on'] ?? null, fn ($query, string $date) => $query->whereDate('ends_on', '>=', $date))
                ->when($filters['ends_on'] ?? null, fn ($query, string $date) => $query->whereDate('starts_on', '<=', $date))
                ->orderBy('starts_on')
                ->paginate($filters['per_page'] ?? 15)
                ->withQueryString()
        );
    }

    public function storeBudget(StoreBudgetRequest $request)
    {
        $this->access->authorize($request->user(), true);
        $budget = new FinanceBudget($request->validated());
        $budget->workspace_id = $this->tenantContext->getWorkspaceId();
        $budget->created_by = $request->user()->id;
        $budget->save();

        return (new FinanceBudgetResource($budget))->response()->setStatusCode(201);
    }

    public function showBudget(Request $request, string $budget)
    {
        $this->access->authorize($request->user());

        return new FinanceBudgetResource($this->findBudget($budget));
    }

    public function updateBudget(UpdateBudgetRequest $request, string $budget)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findBudget($budget);
        $record->fill($request->validated());
        $record->save();

        return new FinanceBudgetResource($record->refresh());
    }

    public function destroyBudget(Request $request, string $budget)
    {
        $this->access->authorize($request->user(), true);
        $this->findBudget($budget)->delete();

        return response()->json(['message' => 'Budget deleted successfully.']);
    }

    public function transactions(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'type' => ['sometimes', 'string', Rule::in(FinanceTransaction::TYPES)],
            'category' => ['sometimes', 'string', 'max:100'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'campaign_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('campaigns', 'id')->where('workspace_id', $this->tenantContext->getWorkspaceId()),
            ],
            'per_page' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        return FinanceTransactionResource::collection(
            FinanceTransaction::query()
                ->where('workspace_id', $this->tenantContext->getWorkspaceId())
                ->with('creator:id,name')
                ->when($filters['type'] ?? null, fn ($query, string $type) => $query->where('type', $type))
                ->when($filters['category'] ?? null, fn ($query, string $category) => $query->where('category', $category))
                ->when($filters['from'] ?? null, fn ($query, string $date) => $query->whereDate('occurred_on', '>=', $date))
                ->when($filters['to'] ?? null, fn ($query, string $date) => $query->whereDate('occurred_on', '<=', $date))
                ->when($filters['campaign_id'] ?? null, fn ($query, string $id) => $query->where('campaign_id', $id))
                ->orderByDesc('occurred_on')
                ->orderByDesc('created_at')
                ->paginate($filters['per_page'] ?? 15)
                ->withQueryString()
        );
    }

    public function storeTransaction(StoreTransactionRequest $request)
    {
        $this->access->authorize($request->user(), true);
        $data = $request->validated();

        if (! empty($data['order_id'])) {
            $duplicate = FinanceTransaction::query()
                ->where('workspace_id', $this->tenantContext->getWorkspaceId())
                ->where('order_id', $data['order_id'])
                ->where('type', $data['type'])
                ->where('category', $data['category'])
                ->exists();

            if ($duplicate) {
                return response()->json([
                    'message' => "A {$data['type']} transaction for category '{$data['category']}' has already been recorded for this order to prevent double-counting.",
                    'errors' => ['order_id' => ["This order already has a {$data['type']} transaction under category '{$data['category']}'."]],
                ], 422);
            }
        }

        $transaction = new FinanceTransaction($data);
        $transaction->workspace_id = $this->tenantContext->getWorkspaceId();
        $transaction->created_by = $request->user()->id;
        $transaction->save();

        return (new FinanceTransactionResource($transaction))->response()->setStatusCode(201);
    }

    public function showTransaction(Request $request, string $transaction)
    {
        $this->access->authorize($request->user());

        return new FinanceTransactionResource($this->findTransaction($transaction));
    }

    public function updateTransaction(UpdateTransactionRequest $request, string $transaction)
    {
        $this->access->authorize($request->user(), true);
        $record = $this->findTransaction($transaction);
        $record->fill($request->validated());
        $record->save();

        return new FinanceTransactionResource($record->refresh());
    }

    public function destroyTransaction(Request $request, string $transaction)
    {
        $this->access->authorize($request->user(), true);
        $this->findTransaction($transaction)->delete();

        return response()->json(['message' => 'Transaction deleted successfully.']);
    }

    public function categories(Request $request)
    {
        $this->access->authorize($request->user());
        $workspaceId = $this->tenantContext->getWorkspaceId();
        $budgets = FinanceBudget::query()->where('workspace_id', $workspaceId)->distinct()->pluck('category');
        $transactions = FinanceTransaction::query()->where('workspace_id', $workspaceId)->distinct()->pluck('category');

        return response()->json(['data' => $budgets->merge($transactions)->unique()->sort()->values()]);
    }

    public function summary(Request $request)
    {
        $this->access->authorize($request->user());
        $filters = $request->validate([
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'campaign_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('campaigns', 'id')->where('workspace_id', $this->tenantContext->getWorkspaceId()),
            ],
        ]);
        $workspaceId = $this->tenantContext->getWorkspaceId();

        $transactions = FinanceTransaction::query()
            ->where('workspace_id', $workspaceId)
            ->when($filters['from'] ?? null, fn ($query, string $date) => $query->whereDate('occurred_on', '>=', $date))
            ->when($filters['to'] ?? null, fn ($query, string $date) => $query->whereDate('occurred_on', '<=', $date))
            ->when($filters['campaign_id'] ?? null, fn ($query, string $id) => $query->where('campaign_id', $id));
        $totals = (clone $transactions)
            ->selectRaw('type, SUM(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $budgetModels = FinanceBudget::query()
            ->where('workspace_id', $workspaceId)
            ->when($filters['from'] ?? null, fn ($query, string $date) => $query->whereDate('ends_on', '>=', $date))
            ->when($filters['to'] ?? null, fn ($query, string $date) => $query->whereDate('starts_on', '<=', $date))
            ->orderBy('category')
            ->get();

        if ($budgetModels->isEmpty()) {
            $budgets = [];
        } else {
            $categories = $budgetModels->pluck('category')->unique()->all();
            $minStart = $budgetModels->min(fn ($b) => max($b->starts_on->toDateString(), $filters['from'] ?? $b->starts_on->toDateString()));
            $maxEnd = $budgetModels->max(fn ($b) => min($b->ends_on->toDateString(), $filters['to'] ?? $b->ends_on->toDateString()));

            $rawTransactions = FinanceTransaction::query()
                ->where('workspace_id', $workspaceId)
                ->where('type', FinanceTransaction::TYPE_EXPENSE)
                ->whereIn('category', $categories)
                ->whereDate('occurred_on', '>=', $minStart)
                ->whereDate('occurred_on', '<=', $maxEnd)
                ->get(['category', 'amount', 'occurred_on']);

            $budgets = $budgetModels->map(function (FinanceBudget $budget) use ($filters, $rawTransactions): array {
                $bStart = max($budget->starts_on->toDateString(), $filters['from'] ?? $budget->starts_on->toDateString());
                $bEnd = min($budget->ends_on->toDateString(), $filters['to'] ?? $budget->ends_on->toDateString());

                $actualSum = 0.0;
                foreach ($rawTransactions as $tx) {
                    if ($tx->category === $budget->category) {
                        $occ = $tx->occurred_on?->toDateString();
                        if ($occ !== null && $occ >= $bStart && $occ <= $bEnd) {
                            $actualSum += (float) $tx->amount;
                        }
                    }
                }

                $budgetAmount = (string) $budget->amount;
                $budgetFloat = (float) $budget->amount;
                $variance = round($budgetFloat - $actualSum, 2);

                return [
                    'budget_id' => $budget->id,
                    'category' => $budget->category,
                    'budget' => $budgetAmount,
                    'actual' => round($actualSum, 2),
                    'variance' => $variance,
                ];
            });
        }

        return response()->json([
            'data' => [
                'income' => $totals[FinanceTransaction::TYPE_INCOME] ?? '0.00',
                'expenses' => $totals[FinanceTransaction::TYPE_EXPENSE] ?? '0.00',
                'budgets' => $budgets,
            ],
        ]);
    }

    private function findBudget(string $id): FinanceBudget
    {
        return FinanceBudget::query()->where('workspace_id', $this->tenantContext->getWorkspaceId())->findOrFail($id);
    }

    private function findTransaction(string $id): FinanceTransaction
    {
        return FinanceTransaction::query()->where('workspace_id', $this->tenantContext->getWorkspaceId())->findOrFail($id);
    }
}
