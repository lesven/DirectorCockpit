<?php

namespace App\Service;

use App\Entity\Customer;
use App\Entity\Initiative;
use App\Entity\Milestone;
use App\Entity\NichtVergessen;
use App\Entity\Risk;
use App\Entity\SyncableEntity;
use App\Entity\Team;

/**
 * Zentrale Registry aller sync-baren Entitäten.
 * Definiert die Zuordnung zwischen Payload-Schlüsseln und Entity-Klassen.
 */
final class EntityRegistry
{
    /** @var array<string, class-string<SyncableEntity>> */
    public const ENTITY_REGISTRY = [
        'kunden'          => Customer::class,
        'teams'           => Team::class,
        'initiatives'     => Initiative::class,
        'nicht_vergessen' => NichtVergessen::class,
        'risks'           => Risk::class,
        'milestones'      => Milestone::class,
    ];
}
