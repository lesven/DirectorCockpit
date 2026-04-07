<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Milestone;
use PHPUnit\Framework\TestCase;

class MilestoneTest extends TestCase
{
    private function fullData(): array
    {
        return [
            'id' => 42,
            'initiative' => 7,
            'aufgabe' => 'API Design erstellen',
            'owner' => 'Max Mustermann',
            'status' => 'in_bearbeitung',
            'frist' => '2026-04-15',
        ];
    }

    public function testFromArrayAndToArrayRoundtrip(): void
    {
        $ms = Milestone::fromArray($this->fullData());
        $arr = $ms->toArray();

        $this->assertSame(42, $arr['id']);
        $this->assertSame(7, $arr['initiative']);
        $this->assertSame('API Design erstellen', $arr['aufgabe']);
        $this->assertSame('Max Mustermann', $arr['owner']);
        $this->assertSame('in_bearbeitung', $arr['status']);
        $this->assertSame('2026-04-15', $arr['frist']);
    }

    public function testFromArrayWithDefaults(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5]);
        $arr = $ms->toArray();

        $this->assertSame('', $arr['aufgabe']);
        $this->assertSame('', $arr['owner']);
        $this->assertSame('offen', $arr['status']);
        $this->assertNull($arr['frist']);
    }

    public function testFristEmptyStringBecomesNull(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'frist' => '']);
        $this->assertNull($ms->toArray()['frist']);
    }

    public function testFristNullStaysNull(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'frist' => null]);
        $this->assertNull($ms->toArray()['frist']);
    }

    public function testFristLegacyDdMmYyyyConverted(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'frist' => '15.04.2026']);
        $this->assertSame('2026-04-15', $ms->toArray()['frist']);
    }

    public function testFristUnknownFormatBecomesNull(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'frist' => 'kein-datum']);
        $this->assertNull($ms->toArray()['frist']);
    }

    public function testFromArrayWithInvalidStatusFallsBackToOffen(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'status' => 'invalid']);
        $arr = $ms->toArray();

        $this->assertSame('offen', $arr['status']);
    }

    public function testFromArrayAcceptsAllValidStatuses(): void
    {
        foreach (['offen', 'in_bearbeitung', 'erledigt', 'blockiert'] as $status) {
            $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'status' => $status]);
            $this->assertSame($status, $ms->toArray()['status']);
        }
    }

    public function testUpdateFromArrayUpdatesAllFields(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'aufgabe' => 'Alt']);
        $ms->updateFromArray([
            'initiative' => 9,
            'aufgabe' => 'Neu',
            'owner' => 'Anna',
            'status' => 'erledigt',
            'frist' => '2026-05-01',
        ]);

        $arr = $ms->toArray();
        $this->assertSame(9, $arr['initiative']);
        $this->assertSame('Neu', $arr['aufgabe']);
        $this->assertSame('Anna', $arr['owner']);
        $this->assertSame('erledigt', $arr['status']);
        $this->assertSame('2026-05-01', $arr['frist']);
    }

    public function testUpdateFromArrayKeepsExistingValuesWhenKeysAbsent(): void
    {
        $ms = Milestone::fromArray([
            'id' => 1,
            'initiative' => 5,
            'aufgabe' => 'Bleibt',
            'owner' => 'Max',
            'status' => 'blockiert',
            'frist' => '2026-04-01',
        ]);
        $ms->updateFromArray([]);

        $arr = $ms->toArray();
        $this->assertSame('Bleibt', $arr['aufgabe']);
        $this->assertSame('Max', $arr['owner']);
        $this->assertSame('blockiert', $arr['status']);
        $this->assertSame('2026-04-01', $arr['frist']);
        $this->assertSame(5, $arr['initiative']);
    }

    public function testUpdateFromArrayFristCanBeSetToNull(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'frist' => '2026-04-01']);
        $ms->updateFromArray(['frist' => null]);
        $this->assertNull($ms->toArray()['frist']);
    }

    public function testUpdateFromArrayFristCanBeSetToEmptyString(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'frist' => '2026-04-01']);
        $ms->updateFromArray(['frist' => '']);
        $this->assertNull($ms->toArray()['frist']);
    }

    public function testUpdateFromArrayWithInvalidStatusKeepsCurrent(): void
    {
        $ms = Milestone::fromArray(['id' => 1, 'initiative' => 5, 'status' => 'erledigt']);
        $ms->updateFromArray(['status' => 'invalid']);

        $this->assertSame('erledigt', $ms->toArray()['status']);
    }

    public function testGetIdReturnsCorrectValue(): void
    {
        $ms = Milestone::fromArray(['id' => 99, 'initiative' => 1]);
        $this->assertSame(99, $ms->getId());
    }
}
