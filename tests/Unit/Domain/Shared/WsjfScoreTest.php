<?php

namespace App\Tests\Unit\Domain\Shared;

use App\Domain\Exception\InvalidWsjfValueException;
use App\Domain\Model\Shared\WsjfScore;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class WsjfScoreTest extends TestCase
{
    public function testCalculateReturnsCorrectWsjf(): void
    {
        $score = new WsjfScore(
            businessValue: 8,
            timeCriticality: 5,
            riskReduction: 3,
            jobSize: 2,
        );

        self::assertSame(8.0, $score->calculate()); // (8+5+3)/2 = 8.0
    }

    public function testCalculateRoundsToOneDecimal(): void
    {
        $score = new WsjfScore(
            businessValue: 1,
            timeCriticality: 1,
            riskReduction: 1,
            jobSize: 2,
        );

        self::assertSame(1.5, $score->calculate()); // 3/2 = 1.5
    }

    public function testCalculateDividesCorrectlyWithLargeJobSize(): void
    {
        $score = new WsjfScore(
            businessValue: 21,
            timeCriticality: 13,
            riskReduction: 8,
            jobSize: 21,
        );

        self::assertSame(2.0, $score->calculate()); // (21+13+8)/21 = 42/21 = 2.0
    }

    #[DataProvider('validScaleProvider')]
    public function testAcceptsAllValidFibonacciValues(int $value): void
    {
        $score = new WsjfScore($value, $value, $value, $value);
        self::assertSame($value, $score->getJobSize());
    }

    /** @return array<string, array{int}> */
    public static function validScaleProvider(): array
    {
        return [
            '1'  => [1],
            '2'  => [2],
            '3'  => [3],
            '5'  => [5],
            '8'  => [8],
            '13' => [13],
            '21' => [21],
        ];
    }

    #[DataProvider('invalidScaleProvider')]
    public function testRejectsInvalidScaleValues(int $value): void
    {
        $this->expectException(InvalidWsjfValueException::class);

        new WsjfScore($value, 1, 1, 1);
    }

    /** @return array<string, array{int}> */
    public static function invalidScaleProvider(): array
    {
        return [
            'zero'     => [0],
            'negative' => [-1],
            '4'        => [4],
            '6'        => [6],
            '10'       => [10],
            '22'       => [22],
            '100'      => [100],
        ];
    }

    public function testRejectsInvalidJobSize(): void
    {
        $this->expectException(InvalidWsjfValueException::class);
        $this->expectExceptionMessage("jobSize");

        new WsjfScore(1, 1, 1, 4);
    }

    public function testEqualsReturnsTrueForSameValues(): void
    {
        $a = new WsjfScore(5, 3, 2, 1);
        $b = new WsjfScore(5, 3, 2, 1);

        self::assertTrue($a->equals($b));
    }

    public function testEqualsReturnsFalseForDifferentValues(): void
    {
        $a = new WsjfScore(5, 3, 2, 1);
        $b = new WsjfScore(5, 3, 2, 2);

        self::assertFalse($a->equals($b));
    }

    public function testToArrayContainsAllFields(): void
    {
        $score = new WsjfScore(
            businessValue: 8,
            timeCriticality: 5,
            riskReduction: 3,
            jobSize: 2,
        );

        self::assertSame([
            'businessValue'   => 8,
            'timeCriticality' => 5,
            'riskReduction'   => 3,
            'jobSize'         => 2,
        ], $score->toArray());
    }

    public function testGettersReturnCorrectValues(): void
    {
        $score = new WsjfScore(
            businessValue: 8,
            timeCriticality: 5,
            riskReduction: 3,
            jobSize: 2,
        );

        self::assertSame(8, $score->getBusinessValue());
        self::assertSame(5, $score->getTimeCriticality());
        self::assertSame(3, $score->getRiskReduction());
        self::assertSame(2, $score->getJobSize());
    }

    public function testIsValidScaleReturnsTrueForFibonacci(): void
    {
        self::assertTrue(WsjfScore::isValidScale(1));
        self::assertTrue(WsjfScore::isValidScale(21));
    }

    public function testIsValidScaleReturnsFalseForNonFibonacci(): void
    {
        self::assertFalse(WsjfScore::isValidScale(0));
        self::assertFalse(WsjfScore::isValidScale(4));
        self::assertFalse(WsjfScore::isValidScale(22));
    }
}
