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
}
