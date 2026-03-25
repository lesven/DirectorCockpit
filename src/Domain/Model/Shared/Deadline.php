<?php

namespace App\Domain\Model\Shared;

/**
 * Immutable Value Object für Frist-/Deadline-Felder.
 * Kapselt den bisher als rohes String gespeicherten Frist-Wert.
 */
final class Deadline
{
    private function __construct(
        private readonly string $value,
    ) {}

    public static function fromString(string $value): self
    {
        return new self(trim($value));
    }

    public static function empty(): self
    {
        return new self('');
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function isEmpty(): bool
    {
        return $this->value === '';
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
