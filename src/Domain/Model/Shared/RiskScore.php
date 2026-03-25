<?php

namespace App\Domain\Model\Shared;

use App\Domain\Exception\InvalidRiskScoreException;

/**
 * Immutable Value Object für Risiko-Bewertung.
 * Eintrittswahrscheinlichkeit und Schadensausmass sind je 1–5.
 * Score = P × S; Level: Gering (≤4), Mittel (≤9), Hoch (≤15), Kritisch (>15).
 */
final class RiskScore
{
    public function __construct(
        private readonly int $eintrittswahrscheinlichkeit,
        private readonly int $schadensausmass,
    ) {
        if ($eintrittswahrscheinlichkeit < 1 || $eintrittswahrscheinlichkeit > 5) {
            throw new InvalidRiskScoreException('eintrittswahrscheinlichkeit', $eintrittswahrscheinlichkeit);
        }
        if ($schadensausmass < 1 || $schadensausmass > 5) {
            throw new InvalidRiskScoreException('schadensausmass', $schadensausmass);
        }
    }

    public function calculate(): int
    {
        return $this->eintrittswahrscheinlichkeit * $this->schadensausmass;
    }

    public function getLevel(): string
    {
        $score = $this->calculate();

        return match (true) {
            $score <= 4  => 'Gering',
            $score <= 9  => 'Mittel',
            $score <= 15 => 'Hoch',
            default      => 'Kritisch',
        };
    }

    public function equals(self $other): bool
    {
        return $this->eintrittswahrscheinlichkeit === $other->eintrittswahrscheinlichkeit
            && $this->schadensausmass             === $other->schadensausmass;
    }

    public function getEintrittswahrscheinlichkeit(): int
    {
        return $this->eintrittswahrscheinlichkeit;
    }

    public function getSchadensausmass(): int
    {
        return $this->schadensausmass;
    }

    /** @return array<string, int> */
    public function toArray(): array
    {
        return [
            'eintrittswahrscheinlichkeit' => $this->eintrittswahrscheinlichkeit,
            'schadensausmass'             => $this->schadensausmass,
        ];
    }
}
