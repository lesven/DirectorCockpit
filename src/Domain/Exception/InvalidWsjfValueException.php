<?php

namespace App\Domain\Exception;

final class InvalidWsjfValueException extends DomainException
{
    /** @param int[] $validValues */
    public function __construct(string $field, int $value, array $validValues)
    {
        parent::__construct(sprintf(
            "WSJF-Feld '%s': Wert '%d' ist ungültig. Erlaubt: %s",
            $field,
            $value,
            implode(', ', $validValues),
        ));
    }
}
