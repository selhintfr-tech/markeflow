<?php

namespace App\Console\Commands;

use App\Models\Workspace;
use App\Services\Delivery\Ozon\OzonTrackingSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class OzonSyncTrackingCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ozon:sync-tracking 
                            {--workspace= : Specific workspace ID to synchronize}
                            {--force-live : Run live tracking API call even if default dry-run}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Safely synchronize Ozon Express delivery tracking for active shipments across workspaces.';

    /**
     * Execute the console command.
     */
    public function handle(OzonTrackingSyncService $syncService): int
    {
        $specificWorkspaceId = $this->option('workspace');
        $forceLive = (bool) $this->option('force-live');

        $this->info('Starting Ozon Express tracking synchronization...');

        $query = Workspace::query()->where('status', 'Active');
        if ($specificWorkspaceId) {
            $query->where('id', $specificWorkspaceId);
        }

        $workspaces = $query->get();

        if ($workspaces->isEmpty()) {
            $this->warn('No active workspaces found for Ozon synchronization.');
            return Command::SUCCESS;
        }

        $totalChecked = 0;
        $totalUpdated = 0;
        $totalPreserved = 0;

        foreach ($workspaces as $workspace) {
            $this->line("Processing workspace: {$workspace->name} ({$workspace->id})...");

            try {
                // Keep Delivery module mirrored with Sales shipments
                $mirroredCount = $syncService->syncSalesShipmentsToDeliveryModule($workspace->id);
                if ($mirroredCount > 0) {
                    $this->line(" -> Mirrored {$mirroredCount} shipment(s) to Delivery Integrations module.");
                }

                $result = $syncService->syncWorkspaceTracking(
                    $workspace->id,
                    null,
                    null,
                    $forceLive
                );

                $totalChecked += $result['synced_count'];
                $totalUpdated += $result['updated_count'];
                $totalPreserved += $result['preserved_terminal_count'];

                $this->info(" -> {$result['message']}");
            } catch (\Throwable $exception) {
                $this->error(" -> Error synchronizing workspace {$workspace->id}: {$exception->getMessage()}");
                Log::error('OzonSyncTrackingCommand failed for workspace', [
                    'workspace_id' => $workspace->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        $this->info("Ozon tracking synchronization finished. Checked: {$totalChecked}, Updated: {$totalUpdated}, Preserved terminal: {$totalPreserved}.");

        return Command::SUCCESS;
    }
}
