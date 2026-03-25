<?php

namespace App\Application\Command;

/**
 * Immutable Command DTO für den vollständigen Cockpit-Sync.
 * Repräsentiert die Absicht, alle Cockpit-Daten zu synchronisieren.
 *
 * @param array<string, mixed> $payload
 */
final readonly class SyncCockpitDataCommand
{
    /** @param array<string, mixed> $payload */
    public function __construct(
        public readonly array $payload,
    ) {}
}
