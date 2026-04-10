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

    /**
     * Factory-Methode für polymorphe Eingaben (mixed).
     * Ersetzt die Logik aus Initiative::parseFrist() und Milestone::parseFrist().
     *
     * Pattern: Versucht Konvertierungen in Ordnung:
     * 1. null / '' → null
     * 2. nicht-String → null
     * 3. Format Y-m-d (ISO) → \DateTimeImmutable
     * 4. Format d.m.Y (Deutsch) → \DateTimeImmutable
     * 5. sonst → null
     *
     * @param mixed $value Input-Wert (null, '', String mit Datum, etc.)
     * @return ?\DateTimeImmutable null bei ungültigem Input, sonst DateTimeImmutable
     */
    public static function fromMixed(mixed $value): ?\DateTimeImmutable
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value)) {
            return null;
        }

        // Versuch Format YYYY-MM-DD (ISO 8601)
        $date = \DateTimeImmutable::createFromFormat('Y-m-d', $value);
        if ($date !== false && $date->format('Y-m-d') === $value) {
            return $date;
        }

        // Versuch Format DD.MM.YYYY (Deutsch, Localized)
        $date = \DateTimeImmutable::createFromFormat('d.m.Y', $value);
        if ($date !== false) {
            return $date;
        }

        return null;
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
