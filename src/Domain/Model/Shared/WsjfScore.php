<?php

namespace App\Domain\Model\Shared;

use App\Domain\Exception\InvalidWsjfValueException;

/**
 * Immutable Value Object für WSJF-Bewertung (Weighted Shortest Job First).
 * Alle vier Felder müssen Werte aus der Fibonacci-Skala sein (1,2,3,5,8,13,21).
 */
final class WsjfScore
{
    private const SCALE = [1, 2, 3, 5, 8, 13, 21];

    public function __construct(
        private readonly int $businessValue,
        private readonly int $timeCriticality,
        private readonly int $riskReduction,
        private readonly int $jobSize,
    ) {
        foreach ([
            'businessValue'    => $businessValue,
            'timeCriticality'  => $timeCriticality,
            'riskReduction'    => $riskReduction,
            'jobSize'          => $jobSize,
        ] as $field => $value) {
            if (!in_array($value, self::SCALE, true)) {
                throw new InvalidWsjfValueException($field, $value, self::SCALE);
            }
        }
    }

    public function calculate(): float
    {
        return round(($this->businessValue + $this->timeCriticality + $this->riskReduction) / $this->jobSize, 1);
    }

    public function equals(self $other): bool
    {
        return $this->businessValue   === $other->businessValue
            && $this->timeCriticality === $other->timeCriticality
            && $this->riskReduction   === $other->riskReduction
            && $this->jobSize         === $other->jobSize;
    }

    public function getBusinessValue(): int
    {
        return $this->businessValue;
    }

    public function getTimeCriticality(): int
    {
        return $this->timeCriticality;
    }

    public function getRiskReduction(): int
    {
        return $this->riskReduction;
    }

    public function getJobSize(): int
    {
        return $this->jobSize;
    }

    public static function isValidScale(int $value): bool
    {
        return in_array($value, self::SCALE, true);
    }

    /** @return list<int> */
    public static function getScale(): array
    {
        return self::SCALE;
    }

    /** @return array<string, int> */
    public function toArray(): array
    {
        return [
            'businessValue'   => $this->businessValue,
            'timeCriticality' => $this->timeCriticality,
            'riskReduction'   => $this->riskReduction,
            'jobSize'         => $this->jobSize,
        ];
    }
}
