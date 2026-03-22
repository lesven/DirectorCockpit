<?php

namespace App\Service;

/**
 * Prüft die Grundstruktur eines Sync-Payloads.
 * Keine Doctrine/DB-Abhängigkeit – einfach isoliert testbar.
 *
 * @param list<string> $entityKeys  Bekannte Entity-Schlüssel aus dem ENTITY_REGISTRY.
 */
class PayloadValidator
{
    /**
     * @param array<string, mixed> $payload
     * @param list<string>         $entityKeys
     *
     * @throws SyncException
     */
    public function validate(array $payload, array $entityKeys): void
    {
        foreach ($entityKeys as $key) {
            if (!isset($payload[$key])) {
                continue;
            }
            if (!is_array($payload[$key])) {
                throw new SyncException("'{$key}' muss ein Array sein");
            }
            foreach ($payload[$key] as $i => $item) {
                if (!is_array($item) || !isset($item['id'])) {
                    throw new SyncException("'{$key}[{$i}]' muss ein Objekt mit 'id' sein");
                }
            }
        }
    }
}
