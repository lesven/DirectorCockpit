<?php

namespace App\Tests\Unit\Domain\Shared;

use App\Domain\Exception\InvalidRiskScoreException;
use App\Domain\Model\Shared\RiskScore;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class RiskScoreTest extends TestCase
{
    public function testCalculateReturnsProduct(): void
    {
        $score = new RiskScore(3, 4);

        self::assertSame(12, $score->calculate()); // 3*4 = 12
    }

    #[DataProvider('levelProvider')]
    public function testGetLevelReturnsCorrectLabel(int $p, int $s, string $expectedLevel): void
    {
        $score = new RiskScore($p, $s);

        self::assertSame($expectedLevel, $score->getLevel());
    }

    /** @return array<string, array{int, int, string}> */
    public static function levelProvider(): array
    {
        return [
            'min score 1 → Gering'       => [1, 1, 'Gering'],   // score=1
            'boundary 4 → Gering'        => [2, 2, 'Gering'],   // score=4
            'boundary 5 → Mittel'        => [1, 5, 'Mittel'],   // score=5
            'boundary 9 → Mittel'        => [3, 3, 'Mittel'],   // score=9
            'boundary 10 → Hoch'         => [2, 5, 'Hoch'],     // score=10
            'boundary 15 → Hoch'         => [3, 5, 'Hoch'],     // score=15
            'boundary 16 → Kritisch'     => [4, 4, 'Kritisch'], // score=16
            'max score 25 → Kritisch'    => [5, 5, 'Kritisch'], // score=25
        ];
    }

    #[DataProvider('validRangeProvider')]
    public function testAcceptsValidRange(int $p, int $s): void
    {
        $score = new RiskScore($p, $s);
        self::assertSame($p, $score->getEintrittswahrscheinlichkeit());
        self::assertSame($s, $score->getSchadensausmass());
    }

    /** @return array<string, array{int, int}> */
    public static function validRangeProvider(): array
    {
        return [
            'min' => [1, 1],
            'max' => [5, 5],
            'mid' => [3, 3],
        ];
    }

    public function testRejectsZeroEintrittswahrscheinlichkeit(): void
    {
        $this->expectException(InvalidRiskScoreException::class);
        $this->expectExceptionMessage('eintrittswahrscheinlichkeit');

        new RiskScore(0, 3);
    }

    public function testRejectsSixEintrittswahrscheinlichkeit(): void
    {
        $this->expectException(InvalidRiskScoreException::class);

        new RiskScore(6, 3);
    }

    public function testRejectsZeroSchadensausmass(): void
    {
        $this->expectException(InvalidRiskScoreException::class);
        $this->expectExceptionMessage('schadensausmass');

        new RiskScore(3, 0);
    }

    public function testRejectsSixSchadensausmass(): void
    {
        $this->expectException(InvalidRiskScoreException::class);

        new RiskScore(3, 6);
    }

    public function testEqualsReturnsTrueForSameValues(): void
    {
        $a = new RiskScore(3, 4);
        $b = new RiskScore(3, 4);

        self::assertTrue($a->equals($b));
    }

    public function testEqualsReturnsFalseForDifferentValues(): void
    {
        $a = new RiskScore(3, 4);
        $b = new RiskScore(4, 3);

        self::assertFalse($a->equals($b));
    }

    public function testToArrayContainsAllFields(): void
    {
        $score = new RiskScore(2, 5);

        self::assertSame([
            'eintrittswahrscheinlichkeit' => 2,
            'schadensausmass'             => 5,
        ], $score->toArray());
    }
}
