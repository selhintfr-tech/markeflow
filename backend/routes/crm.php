<?php

use App\Http\Controllers\Api\Crm\ActivityController;
use App\Http\Controllers\Api\Crm\ContactController;
use App\Http\Controllers\Api\Crm\CustomerController;
use App\Http\Controllers\Api\Crm\LeadController;
use App\Http\Controllers\Api\Crm\NoteController;
use App\Http\Controllers\Api\Crm\PipelineController;
use App\Http\Controllers\Api\Crm\PipelineStageController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| MarketFlow CRM API Routes
|--------------------------------------------------------------------------
|
| Dedicated routes for CRM: Contacts, Leads, Customers, Pipelines, Activities, Notes.
| These routes require authenticated user and verified workspace tenant context.
| Central registration owned by Agent 7 for integration into api.php.
|
*/

Route::prefix('crm')->name('crm.')->group(function (): void {
    // 1. Contacts
    Route::get('/contacts', [ContactController::class, 'index'])->name('contacts.index');
    Route::post('/contacts', [ContactController::class, 'store'])->name('contacts.store');
    Route::get('/contacts/{contact}', [ContactController::class, 'show'])->name('contacts.show');
    Route::match(['put', 'patch'], '/contacts/{contact}', [ContactController::class, 'update'])->name('contacts.update');
    Route::delete('/contacts/{contact}', [ContactController::class, 'destroy'])->name('contacts.destroy');

    // 2. Leads & Funnel
    Route::get('/leads', [LeadController::class, 'index'])->name('leads.index');
    Route::post('/leads', [LeadController::class, 'store'])->name('leads.store');
    Route::get('/leads/funnel', [LeadController::class, 'funnel'])->name('leads.funnel');
    Route::get('/leads/{lead}', [LeadController::class, 'show'])->name('leads.show');
    Route::match(['put', 'patch'], '/leads/{lead}', [LeadController::class, 'update'])->name('leads.update');
    Route::delete('/leads/{lead}', [LeadController::class, 'destroy'])->name('leads.destroy');
    Route::post('/leads/{lead}/convert', [LeadController::class, 'convert'])->name('leads.convert');

    // 3. Customers
    Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::post('/customers', [CustomerController::class, 'store'])->name('customers.store');
    Route::get('/customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
    Route::match(['put', 'patch'], '/customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy'])->name('customers.destroy');

    // 4. Pipelines & Stages
    Route::get('/pipelines', [PipelineController::class, 'index'])->name('pipelines.index');
    Route::post('/pipelines', [PipelineController::class, 'store'])->name('pipelines.store');
    Route::get('/pipelines/{pipeline}', [PipelineController::class, 'show'])->name('pipelines.show');
    Route::match(['put', 'patch'], '/pipelines/{pipeline}', [PipelineController::class, 'update'])->name('pipelines.update');
    Route::delete('/pipelines/{pipeline}', [PipelineController::class, 'destroy'])->name('pipelines.destroy');

    Route::post('/pipelines/{pipeline}/stages', [PipelineStageController::class, 'store'])->name('pipelines.stages.store');
    Route::match(['put', 'patch'], '/stages/{stage}', [PipelineStageController::class, 'update'])->name('stages.update');
    Route::delete('/stages/{stage}', [PipelineStageController::class, 'destroy'])->name('stages.destroy');
    Route::post('/stages/reorder', [PipelineStageController::class, 'reorder'])->name('stages.reorder');

    // 5. Activities
    Route::get('/activities', [ActivityController::class, 'index'])->name('activities.index');
    Route::post('/activities', [ActivityController::class, 'store'])->name('activities.store');
    Route::get('/activities/{activity}', [ActivityController::class, 'show'])->name('activities.show');
    Route::delete('/activities/{activity}', [ActivityController::class, 'destroy'])->name('activities.destroy');

    // 6. Notes
    Route::get('/notes', [NoteController::class, 'index'])->name('notes.index');
    Route::post('/notes', [NoteController::class, 'store'])->name('notes.store');
    Route::get('/notes/{note}', [NoteController::class, 'show'])->name('notes.show');
    Route::match(['put', 'patch'], '/notes/{note}', [NoteController::class, 'update'])->name('notes.update');
    Route::delete('/notes/{note}', [NoteController::class, 'destroy'])->name('notes.destroy');
});