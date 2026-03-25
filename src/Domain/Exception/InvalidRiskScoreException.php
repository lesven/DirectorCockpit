<?php

namespace App\Domain\Exception;

final class InvalidRiskScoreException extends DomainException
{
    public function __construct(string $field, int $value)
    {
        parent::__construct(sprintf(
            "Risiko-Feld '%s': Wert '%d' ist ungültig. Erlaubt: 1–5",
            $field,
            $value,
        ));
    }
}
