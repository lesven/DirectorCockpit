<?php

namespace App\Service;

use App\Enum\MilestoneStatusEnum;
use App\Enum\RoamStatusEnum;

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
                throw new ValidationException("'{$key}' muss ein Array sein");
            }
            foreach ($payload[$key] as $i => $item) {
                if (!is_array($item) || !isset($item['id'])) {
                    throw new ValidationException("'{$key}[{$i}]' muss ein Objekt mit 'id' sein");
                }
                if (!is_int($item['id']) || $item['id'] < 1) {
                    throw new ValidationException("'{$key}[{$i}].id' muss eine positive ganze Zahl sein, '{$item['id']}' ist ungültig");
                }
                if ($key === 'initiatives') {
                    $this->validateWsjfFields($item, $i);
                }
                if ($key === 'milestones') {
                    $this->validateMilestoneStatus($item, $i);
                }
                if ($key === 'risks') {
                    $this->validateRoamStatus($item, $i);
                }
            }
        }
    }

    /**
     * @param array<string, mixed> $item
     *
     * @throws ValidationException
     */
    private function validateWsjfFields(array $item, int $index): void
    {
        foreach (self::WSJF_FIELDS as $field) {
            if (!array_key_exists($field, $item) || $item[$field] === null) {
                continue;
            }
            if (!in_array($item[$field], self::WSJF_SCALE, true)) {
                throw new ValidationException(
                    "initiatives[{$index}].{$field} muss ein WSJF-Fibonacci-Wert sein (1,2,3,5,8,13,21), '{$item[$field]}' ist ungültig"
                );
            }
        }
    }

    /**
     * @param array<string, mixed> $item
     *
     * @throws ValidationException
     */
    private function validateMilestoneStatus(array $item, int $index): void
    {
        if (!array_key_exists('status', $item) || $item['status'] === null) {
            return;
        }
        $valid = array_column(MilestoneStatusEnum::cases(), 'value');
        if (!in_array($item['status'], $valid, true)) {
            throw new ValidationException(
                "milestones[{$index}].status muss einer der Werte " . implode(', ', $valid) . " sein, '{$item['status']}' ist ungültig"
            );
        }
    }

    /**
     * @param array<string, mixed> $item
     *
     * @throws ValidationException
     */
    private function validateRoamStatus(array $item, int $index): void
    {
        if (!array_key_exists('roamStatus', $item) || $item['roamStatus'] === null) {
            return;
        }
        $valid = array_column(RoamStatusEnum::cases(), 'value');
        if (!in_array($item['roamStatus'], $valid, true)) {
            throw new ValidationException(
                "risks[{$index}].roamStatus muss einer der Werte " . implode(', ', $valid) . " sein, '{$item['roamStatus']}' ist ungültig"
            );
        }
    }
}
