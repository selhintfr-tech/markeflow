<?php

namespace Tests\Feature\Api\Crm;

use App\Models\Crm\CrmCustomer;
use App\Models\WorkspaceUser;
use App\Services\TenantContext;

class CrmCustomerApiTest extends CrmTestCase
{
    public function test_owner_can_create_and_list_customers(): void
    {
        $owner = $this->createUser('owner@customer.test');
        $workspace = $this->createWorkspace($owner);

        $payload = [
            'company_name' => 'Starlight Media',
            'contact_name' => 'Alice Johnson',
            'email' => 'alice@starlight.test',
            'phone' => '+1987654321',
            'status' => 'Active',
            'customer_tier' => 'Enterprise',
            'total_revenue' => 12500.50,
            'currency' => 'USD',
            'owner_id' => $owner->id,
            'notes' => 'Key enterprise account.',
        ];

        $createResponse = $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/customers', $payload)
            ->assertCreated()
            ->assertJsonPath('data.company_name', 'Starlight Media')
            ->assertJsonPath('data.contact_name', 'Alice Johnson')
            ->assertJsonPath('data.customer_tier', 'Enterprise')
            ->assertJsonPath('data.workspace_id', $workspace->id);

        $customerId = $createResponse->json('data.id');

        // List
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/customers')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $customerId);

        // Show
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/customers/'.$customerId)
            ->assertOk()
            ->assertJsonPath('data.id', $customerId)
            ->assertJsonPath('data.email', 'alice@starlight.test');
    }

    public function test_customer_filtering_and_sorting(): void
    {
        $owner = $this->createUser('owner_filter@customer.test');
        $workspace = $this->createWorkspace($owner);

        app(TenantContext::class)->runInContext($workspace, function () use ($owner) {
            CrmCustomer::create([
                'company_name' => 'Alpha Dynamics',
                'contact_name' => 'Bob Alpha',
                'email' => 'bob@alpha.test',
                'status' => 'Active',
                'customer_tier' => 'Standard',
                'total_revenue' => 2000.00,
                'currency' => 'USD',
                'owner_id' => $owner->id,
            ]);

            CrmCustomer::create([
                'company_name' => 'Beta Global',
                'contact_name' => 'Charlie Beta',
                'email' => 'charlie@beta.test',
                'status' => 'Inactive',
                'customer_tier' => 'Enterprise',
                'total_revenue' => 50000.00,
                'currency' => 'USD',
                'owner_id' => $owner->id,
            ]);
        });

        // Search
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/customers?search=Alpha')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.company_name', 'Alpha Dynamics');

        // Status filter
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/customers?status=Inactive')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.company_name', 'Beta Global');

        // Tier filter
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/customers?customer_tier=Enterprise')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.company_name', 'Beta Global');

        // Sort by revenue
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/customers?sort_by=revenue')
            ->assertOk()
            ->assertJsonPath('data.0.company_name', 'Beta Global')
            ->assertJsonPath('data.1.company_name', 'Alpha Dynamics');
    }

    public function test_customer_update_and_delete(): void
    {
        $owner = $this->createUser('owner_mod@customer.test');
        $workspace = $this->createWorkspace($owner);

        $customer = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmCustomer::create([
                'company_name' => 'Original Corp',
                'contact_name' => 'Dan Original',
                'email' => 'dan@original.test',
                'status' => 'Active',
                'customer_tier' => 'Standard',
                'total_revenue' => 1000.00,
            ]);
        });

        // Update
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/crm/customers/'.$customer->id, [
                'company_name' => 'Updated Corp',
                'customer_tier' => 'Premium',
                'total_revenue' => 25000.00,
            ])
            ->assertOk()
            ->assertJsonPath('data.company_name', 'Updated Corp')
            ->assertJsonPath('data.customer_tier', 'Premium');

        // Delete
        $this->actingAs($owner)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/customers/'.$customer->id)
            ->assertOk()
            ->assertJsonPath('message', 'Customer deleted successfully.');

        $this->assertDatabaseMissing('crm_customers', [
            'id' => $customer->id,
        ]);
    }

    public function test_viewer_cannot_modify_customer(): void
    {
        $owner = $this->createUser('owner_v@customer.test');
        $viewer = $this->createUser('viewer_v@customer.test');
        $workspace = $this->createWorkspace($owner);
        $this->addMemberToWorkspace($workspace, $viewer, WorkspaceUser::ROLE_VIEWER);

        $customer = app(TenantContext::class)->runInContext($workspace, function () {
            return CrmCustomer::create([
                'company_name' => 'Protected Corp',
                'contact_name' => 'Paul Protected',
                'email' => 'paul@protected.test',
                'status' => 'Active',
            ]);
        });

        // Viewer cannot create (with valid payload)
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->postJson('/api/crm/customers', [
                'company_name' => 'Hacker Corp',
                'contact_name' => 'Hacker Contact',
            ])
            ->assertForbidden();

        // Viewer cannot update
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->putJson('/api/crm/customers/'.$customer->id, [
                'company_name' => 'Defaced Corp',
            ])
            ->assertForbidden();

        // Viewer cannot delete
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->deleteJson('/api/crm/customers/'.$customer->id)
            ->assertForbidden();

        // But viewer CAN read
        $this->actingAs($viewer)
            ->withHeader('X-Workspace-Id', $workspace->id)
            ->getJson('/api/crm/customers')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_cross_workspace_customer_isolation(): void
    {
        $owner1 = $this->createUser('owner1_iso@customer.test');
        $workspace1 = $this->createWorkspace($owner1);

        $owner2 = $this->createUser('owner2_iso@customer.test');
        $workspace2 = $this->createWorkspace($owner2);

        $customer1 = app(TenantContext::class)->runInContext($workspace1, function () {
            return CrmCustomer::create([
                'company_name' => 'Secret Customer 1',
                'contact_name' => 'Secret Contact',
                'status' => 'Active',
            ]);
        });

        // Owner 2 cannot see Customer 1 in list
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/customers')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        // Owner 2 cannot show Customer 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->getJson('/api/crm/customers/'.$customer1->id)
            ->assertNotFound();

        // Owner 2 cannot update Customer 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->putJson('/api/crm/customers/'.$customer1->id, [
                'company_name' => 'Tampered Name',
            ])
            ->assertNotFound();

        // Owner 2 cannot delete Customer 1
        $this->actingAs($owner2)
            ->withHeader('X-Workspace-Id', $workspace2->id)
            ->deleteJson('/api/crm/customers/'.$customer1->id)
            ->assertNotFound();
    }
}