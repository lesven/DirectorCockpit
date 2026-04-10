<?php

namespace App\Service;

interface PayloadValidatorInterface
{
    /**
     * Prüft die Grundstruktur eines Sync-Payloads.
     *
     * @param array<string, mixed> $payload
     * @param list<string>         $entityKeys  Bekannte Entity-Schlüssel aus dem ENTITY_REGISTRY
     *
     * @throws ValidationException bei ungültigen Feldinhalten
     */
    public function validate(array $payload, array $entityKeys): void;
}
