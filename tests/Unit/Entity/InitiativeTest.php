<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Initiative;
use PHPUnit\Framework\TestCase;

class InitiativeTest extends TestCase
{
    private function fullData(): array
    {
        return [
            'id' => 42,
            'name' => 'Projekt Alpha',
            'team' => 7,
            'status' => 'yellow',
            'projektstatus' => 'kritisch',
            'schritt' => 'Review durchführen',
            'frist' => '15.04',
            'notiz' => 'Wichtig!',
            'businessValue' => 8,
            'timeCriticality' => 5,
            'riskReduction' => 3,
            'jobSize' => 5,
        ];
    }

    public function testFromArrayAndToArrayRoundtrip(): void
    {
        $ini = Initiative::fromArray($this->fullData());
        $arr = $ini->toArray();

        $this->assertSame(42, $arr['id']);
        $this->assertSame('Projekt Alpha', $arr['name']);
        $this->assertSame(7, $arr['team']);
        $this->assertSame('yellow', $arr['status']);
        $this->assertSame('kritisch', $arr['projektstatus']);
        $this->assertSame('Review durchführen', $arr['schritt']);
        $this->assertSame('15.04', $arr['frist']);
        $this->assertSame('Wichtig!', $arr['notiz']);
        $this->assertSame(8, $arr['businessValue']);
        $this->assertSame(5, $arr['timeCriticality']);
        $this->assertSame(3, $arr['riskReduction']);
        $this->assertSame(5, $arr['jobSize']);
    }

    public function testFromArrayWithDefaults(): void
    {
        $ini = Initiative::fromArray(['id' => 1]);
        $arr = $ini->toArray();

        $this->assertSame(1, $arr['id']);
        $this->assertSame('', $arr['name']);
        $this->assertNull($arr['team']);
        $this->assertSame('grey', $arr['status']);
        $this->assertSame('ok', $arr['projektstatus']);
        $this->assertSame('', $arr['schritt']);
        $this->assertSame('', $arr['frist']);
        $this->assertSame('', $arr['notiz']);
        $this->assertNull($arr['businessValue']);
        $this->assertNull($arr['timeCriticality']);
        $this->assertNull($arr['riskReduction']);
        $this->assertNull($arr['jobSize']);
    }

    public function testFromArrayWithInvalidStatusFallsBackToGrey(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'status' => 'nonexistent']);
        $this->assertSame('grey', $ini->toArray()['status']);
    }

    public function testFromArrayWithInvalidProjektstatusFallsBackToOk(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'projektstatus' => 'invalid']);
        $this->assertSame('ok', $ini->toArray()['projektstatus']);
    }

    public function testUpdateFromArrayUpdatesAllFields(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'name' => 'Original']);
        $ini->updateFromArray([
            'name' => 'Updated',
            'team' => 5,
            'status' => 'fertig',
            'projektstatus' => 'kritisch',
            'schritt' => 'Neuer Schritt',
            'frist' => '01.05',
            'notiz' => 'Neue Notiz',
            'businessValue' => 13,
            'timeCriticality' => 8,
            'riskReduction' => 5,
            'jobSize' => 3,
        ]);

        $arr = $ini->toArray();
        $this->assertSame('Updated', $arr['name']);
        $this->assertSame(5, $arr['team']);
        $this->assertSame('fertig', $arr['status']);
        $this->assertSame('kritisch', $arr['projektstatus']);
        $this->assertSame('Neuer Schritt', $arr['schritt']);
        $this->assertSame('01.05', $arr['frist']);
        $this->assertSame('Neue Notiz', $arr['notiz']);
        $this->assertSame(13, $arr['businessValue']);
        $this->assertSame(8, $arr['timeCriticality']);
        $this->assertSame(5, $arr['riskReduction']);
        $this->assertSame(3, $arr['jobSize']);
    }

    public function testUpdateFromArrayKeepsExistingValuesWhenKeysAbsent(): void
    {
        $ini = Initiative::fromArray($this->fullData());
        $ini->updateFromArray([]);

        $arr = $ini->toArray();
        $this->assertSame('Projekt Alpha', $arr['name']);
        $this->assertSame(7, $arr['team']);
        $this->assertSame('yellow', $arr['status']);
        $this->assertSame('kritisch', $arr['projektstatus']);
        $this->assertSame(8, $arr['businessValue']);
        $this->assertSame(5, $arr['timeCriticality']);
        $this->assertSame(3, $arr['riskReduction']);
        $this->assertSame(5, $arr['jobSize']);
    }

    public function testUpdateFromArrayWithInvalidStatusKeepsCurrent(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'status' => 'yellow']);
        $ini->updateFromArray(['status' => 'bogus']);

        $this->assertSame('yellow', $ini->toArray()['status']);
    }

    public function testUpdateFromArrayWithInvalidProjektstatusKeepsCurrent(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'projektstatus' => 'kritisch']);
        $ini->updateFromArray(['projektstatus' => 'bogus']);

        $this->assertSame('kritisch', $ini->toArray()['projektstatus']);
    }

    public function testUpdateFromArrayCanSetTeamToNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'team' => 5]);
        $ini->updateFromArray(['team' => null]);

        $this->assertNull($ini->toArray()['team']);
    }

    public function testGetIdReturnsCorrectValue(): void
    {
        $ini = Initiative::fromArray(['id' => 99]);
        $this->assertSame(99, $ini->getId());
    }

    public function testUpdateFromArrayCanSetWsjfFieldsToNull(): void
    {
        $ini = Initiative::fromArray($this->fullData());
        $ini->updateFromArray([
            'businessValue' => null,
            'timeCriticality' => null,
            'riskReduction' => null,
            'jobSize' => null,
        ]);

        $arr = $ini->toArray();
        $this->assertNull($arr['businessValue']);
        $this->assertNull($arr['timeCriticality']);
        $this->assertNull($arr['riskReduction']);
        $this->assertNull($arr['jobSize']);
    }

    public function testFromArrayWithoutWsjfFieldsDefaultsToNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'name' => 'Test']);
        $arr = $ini->toArray();

        $this->assertNull($arr['businessValue']);
        $this->assertNull($arr['timeCriticality']);
        $this->assertNull($arr['riskReduction']);
        $this->assertNull($arr['jobSize']);
    }
}
