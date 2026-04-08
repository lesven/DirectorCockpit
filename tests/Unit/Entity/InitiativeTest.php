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
            'frist' => '2026-04-15',
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
        $this->assertSame('2026-04-15', $arr['frist']);
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
        $this->assertNull($arr['frist']);
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
            'frist' => '2026-05-01',
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
        $this->assertSame('2026-05-01', $arr['frist']);
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

    public function testFristEmptyStringBecomesNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'frist' => '']);
        $this->assertNull($ini->toArray()['frist']);
    }

    public function testFristNullStaysNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'frist' => null]);
        $this->assertNull($ini->toArray()['frist']);
    }

    public function testFristLegacyDdMmYyyyConverted(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'frist' => '25.04.2026']);
        $this->assertSame('2026-04-25', $ini->toArray()['frist']);
    }

    public function testFristUnknownFormatBecomesNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'frist' => 'Q1 2026']);
        $this->assertNull($ini->toArray()['frist']);
    }

    public function testUpdateFromArrayFristCanBeSetToNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'frist' => '2026-04-15']);
        $ini->updateFromArray(['frist' => null]);
        $this->assertNull($ini->toArray()['frist']);
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

    // --- getWsjf() ---

    public function testGetWsjfCalculatesCorrectly(): void
    {
        // (8 + 5 + 3) / 5 = 3.2
        $ini = Initiative::fromArray(['id' => 1, 'businessValue' => 8, 'timeCriticality' => 5, 'riskReduction' => 3, 'jobSize' => 5]);
        $this->assertSame(3.2, $ini->getWsjf());
    }

    public function testGetWsjfRoundsToOneDecimal(): void
    {
        // (1 + 1 + 1) / 3 = 1.0
        $ini = Initiative::fromArray(['id' => 1, 'businessValue' => 1, 'timeCriticality' => 1, 'riskReduction' => 1, 'jobSize' => 3]);
        $this->assertSame(1.0, $ini->getWsjf());
    }

    public function testGetWsjfWithLargeFibonacciValues(): void
    {
        // (21 + 21 + 21) / 1 = 63.0
        $ini = Initiative::fromArray(['id' => 1, 'businessValue' => 21, 'timeCriticality' => 21, 'riskReduction' => 21, 'jobSize' => 1]);
        $this->assertSame(63.0, $ini->getWsjf());
    }

    public function testGetWsjfReturnsNullWhenBusinessValueIsNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'businessValue' => null, 'timeCriticality' => 5, 'riskReduction' => 3, 'jobSize' => 5]);
        $this->assertNull($ini->getWsjf());
    }

    public function testGetWsjfReturnsNullWhenTimeCriticalityIsNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'businessValue' => 8, 'timeCriticality' => null, 'riskReduction' => 3, 'jobSize' => 5]);
        $this->assertNull($ini->getWsjf());
    }

    public function testGetWsjfReturnsNullWhenRiskReductionIsNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'businessValue' => 8, 'timeCriticality' => 5, 'riskReduction' => null, 'jobSize' => 5]);
        $this->assertNull($ini->getWsjf());
    }

    public function testGetWsjfReturnsNullWhenJobSizeIsNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'businessValue' => 8, 'timeCriticality' => 5, 'riskReduction' => 3, 'jobSize' => null]);
        $this->assertNull($ini->getWsjf());
    }

    public function testGetWsjfReturnsNullWhenNoWsjfFieldsSet(): void
    {
        $ini = Initiative::fromArray(['id' => 1]);
        $this->assertNull($ini->getWsjf());
    }

    public function testToArrayIncludesCalculatedWsjf(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'businessValue' => 8, 'timeCriticality' => 5, 'riskReduction' => 3, 'jobSize' => 5]);
        $arr = $ini->toArray();

        $this->assertArrayHasKey('wsjf', $arr);
        $this->assertSame(3.2, $arr['wsjf']);
    }

    public function testToArrayIncludesNullWsjfWhenFieldsMissing(): void
    {
        $ini = Initiative::fromArray(['id' => 1]);
        $arr = $ini->toArray();

        $this->assertArrayHasKey('wsjf', $arr);
        $this->assertNull($arr['wsjf']);
    }

    // --- customer field ---

    public function testFromArrayWithCustomerIdStoresIt(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'customer' => 7]);
        $this->assertSame(7, $ini->toArray()['customer']);
    }

    public function testFromArrayWithoutCustomerDefaultsToNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1]);
        $this->assertNull($ini->toArray()['customer']);
    }

    public function testFromArrayWithNullCustomerStoresNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'customer' => null]);
        $this->assertNull($ini->toArray()['customer']);
    }

    public function testUpdateFromArraySetsCustomer(): void
    {
        $ini = Initiative::fromArray(['id' => 1]);
        $ini->updateFromArray(['customer' => 3]);
        $this->assertSame(3, $ini->toArray()['customer']);
    }

    public function testUpdateFromArrayCanClearCustomerToNull(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'customer' => 5]);
        $ini->updateFromArray(['customer' => null]);
        $this->assertNull($ini->toArray()['customer']);
    }

    public function testUpdateFromArrayKeepsCustomerWhenKeyAbsent(): void
    {
        $ini = Initiative::fromArray(['id' => 1, 'customer' => 9]);
        $ini->updateFromArray([]);
        $this->assertSame(9, $ini->toArray()['customer']);
    }

    // --- blockedBy ---

    public function testFromArrayBlockedByDefaultsToEmptyArray(): void
    {
        $ini = Initiative::fromArray(['id' => 1]);
        $arr = $ini->toArray();

        $this->assertArrayHasKey('blockedBy', $arr);
        $this->assertSame([], $arr['blockedBy']);
    }

    public function testToArrayBlockedByContainsAddedIds(): void
    {
        $blocker = Initiative::fromArray(['id' => 99]);
        $ini     = Initiative::fromArray(['id' => 1]);
        $ini->addBlockedBy($blocker);

        $this->assertSame([99], $ini->toArray()['blockedBy']);
    }

    public function testClearBlockedByEmptiesCollection(): void
    {
        $blocker = Initiative::fromArray(['id' => 99]);
        $ini     = Initiative::fromArray(['id' => 1]);
        $ini->addBlockedBy($blocker);
        $ini->clearBlockedBy();

        $this->assertSame([], $ini->toArray()['blockedBy']);
    }

    public function testAddBlockedByIdempotent(): void
    {
        $blocker = Initiative::fromArray(['id' => 99]);
        $ini     = Initiative::fromArray(['id' => 1]);
        $ini->addBlockedBy($blocker);
        $ini->addBlockedBy($blocker); // Duplikat ignoriert

        $this->assertCount(1, $ini->toArray()['blockedBy']);
    }
}
