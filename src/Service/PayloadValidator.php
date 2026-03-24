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
    private const WSJF_FIELDS = ['businessValue', 'timeCriticality', 'riskReduction', 'jobSize'];
    private const WSJF_SCALE = [1, 2, 3, 5, 8, 13, 21];

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
                if ($key === 'initiatives') {
                    $this->validateWsjfFields($item, $i);
                }
            }
        }
    }

    /**
     * @param array<string, mixed> $item
     *
     * @throws SyncException
     */
    private function validateWsjfFields(array $item, int $index): void
    {
        foreach (self::WSJF_FIELDS as $field) {
            if (!array_key_exists($field, $item) || $item[$field] === null) {
                continue;
            }
            if (!in_array($item[$field], self::WSJF_SCALE, true)) {
                throw new SyncException(
                    "initiatives[{$index}].{$field} muss ein WSJF-Fibonacci-Wert sein (1,2,3,5,8,13,21), '{$item[$field]}' ist ungültig"
                );
            }
        }
    }
}
