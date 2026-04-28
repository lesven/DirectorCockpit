<?php

namespace App\Tests\Unit\Domain\Shared;

use App\Domain\Model\Shared\Deadline;
use PHPUnit\Framework\TestCase;

class DeadlineTest extends TestCase
{
    public function testFromStringStoresValue(): void
    {
        $d = Deadline::fromString('2026-06-30');

        self::assertSame('2026-06-30', $d->getValue());
        self::assertFalse($d->isEmpty());
    }

    public function testFromStringTrimsWhitespace(): void
    {
        $d = Deadline::fromString('  2026-06-30  ');

        self::assertSame('2026-06-30', $d->getValue());
    }

    public function testEmptyCreatesEmptyDeadline(): void
    {
        $d = Deadline::empty();

        self::assertSame('', $d->getValue());
        self::assertTrue($d->isEmpty());
    }

    public function testFromEmptyStringIsEmpty(): void
    {
        $d = Deadline::fromString('');

        self::assertTrue($d->isEmpty());
    }

    public function testEqualsReturnsTrueForSameValue(): void
    {
        $a = Deadline::fromString('2026-06-30');
        $b = Deadline::fromString('2026-06-30');

        self::assertTrue($a->equals($b));
    }

    public function testEqualsReturnsFalseForDifferentValues(): void
    {
        $a = Deadline::fromString('2026-06-30');
        $b = Deadline::fromString('2026-07-01');

        self::assertFalse($a->equals($b));
    }

    public function testToStringReturnsValue(): void
    {
        $d = Deadline::fromString('KW25');

        self::assertSame('KW25', (string) $d);
    }

    // ========== fromMixed() Tests ==========

    #[\PHPUnit\Framework\Attributes\DataProvider('fromMixedDataProvider')]
    public function testFromMixedParsesValidInputs(mixed $input, ?\DateTimeImmutable $expected, string $format): void
    {
        $result = Deadline::fromMixed($input);

        if ($expected === null) {
            self::assertNull($result, "Format: $format, Input: " . var_export($input, true));
        } else {
            self::assertNotNull($result, "Format: $format, Input: $input");
            self::assertSame($expected->format('Y-m-d'), $result->format('Y-m-d'), "Format: $format");
        }
    }

    public static function fromMixedDataProvider(): array
    {
        return [
            // null / empty string → null
            'null input' => [null, null, 'null'],
            'empty string' => ['', null, 'empty string'],

            // nicht-String → null
            'int' => [123, null, 'int'],
            'float' => [12.34, null, 'float'],
            'array' => [[], null, 'array'],
            'bool true' => [true, null, 'bool'],
            'bool false' => [false, null, 'bool'],

            // Format Y-m-d (ISO 8601)
            'ISO YYYY-MM-DD valid' => ['2026-04-15', \DateTimeImmutable::createFromFormat('Y-m-d', '2026-04-15'), 'Y-m-d'],
            'ISO YYYY-MM-DD leapjahr' => ['2024-02-29', \DateTimeImmutable::createFromFormat('Y-m-d', '2024-02-29'), 'Y-m-d'],
            'ISO year boundary' => ['2025-01-01', \DateTimeImmutable::createFromFormat('Y-m-d', '2025-01-01'), 'Y-m-d'],

            // Format d.m.Y (Deutsch)
            'Deutsch DD.MM.YYYY valid' => ['15.04.2026', \DateTimeImmutable::createFromFormat('d.m.Y', '15.04.2026'), 'd.m.Y'],
            'Deutsch leapjahr' => ['29.02.2024', \DateTimeImmutable::createFromFormat('d.m.Y', '29.02.2024'), 'd.m.Y'],
            'Deutsch new-year' => ['01.01.2025', \DateTimeImmutable::createFromFormat('d.m.Y', '01.01.2025'), 'd.m.Y'],

            // Ungültige Formate
            'garbage string' => ['not a date', null, 'garbage'],
            'partial date' => ['2026-04', null, 'partial'],
            'wrong ISO order' => ['15-04-2026', null, 'wrong order'],
            'wrong German format' => ['2026.04.15', null, 'wrong German'],

            // Edge cases aus Milestone-Tests
            'legacy format DD.MM.YYYY from test' => ['15.04.2026', \DateTimeImmutable::createFromFormat('d.m.Y', '15.04.2026'), 'd.m.Y'],
        ];
    }

    public function testFromMixedReturnsDateTimeImmutable(): void
    {
        $result = Deadline::fromMixed('2026-04-15');

        self::assertInstanceOf(\DateTimeImmutable::class, $result);
    }

    public function testFromMixedISOFormatMustBeExactMatch(): void
    {
        // 2026-04-32 ist kein gültiges Datum (April hat nur 30 Tage)
        $result = Deadline::fromMixed('2026-04-32');

        self::assertNull($result, 'createFromFormat akzeptiert ungültige Tage, die Revalidierung verhindert das');
    }

    public function testFromMixedGermanFormatAllowsInvalidDays(): void
    {
        // d.m.Y Format: PostgreSQL/DB akzeptiert Tag 32 via createFromFormat().
        // Das ist **ERWÜNSCHT**, da Legacy-Migration von Usern.
        // Aber die Y-m-d Variante revalidiert.
        $result = Deadline::fromMixed('32.04.2026');

        // Tag 32 → wird zu 2.5. (next month)
        // Das ist OK für Legacy-Daten (Typos werden "gerundet")
        self::assertNotNull($result, 'German format acepts day 32 and corrects it');
    }
}
