<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Team;
use PHPUnit\Framework\TestCase;

class TeamTest extends TestCase
{
    private function fullData(): array
    {
        return [
            'id' => 10,
            'name' => 'Backend-Team',
            'status' => 'yellow',
            'fokus' => 'Performance-Optimierung',
            'schritt' => 'Profiling starten',
        ];
    }

    public function testFromArrayAndToArrayRoundtrip(): void
    {
        $team = Team::fromArray($this->fullData());
        $arr = $team->toArray();

        $this->assertSame(10, $arr['id']);
        $this->assertSame('Backend-Team', $arr['name']);
        $this->assertSame('yellow', $arr['status']);
        $this->assertSame('Performance-Optimierung', $arr['fokus']);
        $this->assertSame('Profiling starten', $arr['schritt']);
    }

    public function testFromArrayWithDefaults(): void
    {
        $team = Team::fromArray(['id' => 1]);
        $arr = $team->toArray();

        $this->assertSame('', $arr['name']);
        $this->assertSame('grey', $arr['status']);
        $this->assertSame('', $arr['fokus']);
        $this->assertSame('', $arr['schritt']);
    }

    public function testFromArrayWithInvalidStatusFallsBackToGrey(): void
    {
        $team = Team::fromArray(['id' => 1, 'status' => 'nonexistent']);
        $this->assertSame('grey', $team->toArray()['status']);
    }

    public function testUpdateFromArrayUpdatesAllFields(): void
    {
        $team = Team::fromArray(['id' => 1, 'name' => 'Old']);
        $team->updateFromArray([
            'name' => 'New',
            'status' => 'fertig',
            'fokus' => 'Neuer Fokus',
            'schritt' => 'Nächste Aktion',
        ]);

        $arr = $team->toArray();
        $this->assertSame('New', $arr['name']);
        $this->assertSame('fertig', $arr['status']);
        $this->assertSame('Neuer Fokus', $arr['fokus']);
        $this->assertSame('Nächste Aktion', $arr['schritt']);
    }

    public function testUpdateFromArrayKeepsExistingValuesWhenKeysAbsent(): void
    {
        $team = Team::fromArray($this->fullData());
        $team->updateFromArray([]);

        $arr = $team->toArray();
        $this->assertSame('Backend-Team', $arr['name']);
        $this->assertSame('yellow', $arr['status']);
    }

    public function testUpdateFromArrayWithInvalidStatusKeepsCurrent(): void
    {
        $team = Team::fromArray(['id' => 1, 'status' => 'yellow']);
        $team->updateFromArray(['status' => 'invalid']);

        $this->assertSame('yellow', $team->toArray()['status']);
    }

    public function testGetIdReturnsCorrectValue(): void
    {
        $team = Team::fromArray(['id' => 77]);
        $this->assertSame(77, $team->getId());
    }
}
