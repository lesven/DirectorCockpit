<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Risk;
use PHPUnit\Framework\TestCase;

class RiskTest extends TestCase
{
    public function testFromArrayAndToArrayRoundtrip(): void
    {
        $risk = Risk::fromArray([
            'id' => 42,
            'initiative' => 7,
            'bezeichnung' => 'Lieferantenausfall',
            'beschreibung' => 'Hauptlieferant könnte ausfallen',
            'eintrittswahrscheinlichkeit' => 3,
            'schadensausmass' => 4,
        ]);
        $arr = $risk->toArray();

        $this->assertSame(42, $arr['id']);
        $this->assertSame(7, $arr['initiative']);
        $this->assertSame('Lieferantenausfall', $arr['bezeichnung']);
        $this->assertSame('Hauptlieferant könnte ausfallen', $arr['beschreibung']);
        $this->assertSame(3, $arr['eintrittswahrscheinlichkeit']);
        $this->assertSame(4, $arr['schadensausmass']);
    }

    public function testFromArrayWithDefaults(): void
    {
        $risk = Risk::fromArray(['id' => 1, 'initiative' => 5]);
        $arr = $risk->toArray();

        $this->assertSame('', $arr['bezeichnung']);
        $this->assertSame('', $arr['beschreibung']);
        $this->assertSame(1, $arr['eintrittswahrscheinlichkeit']);
        $this->assertSame(1, $arr['schadensausmass']);
    }

    public function testUpdateFromArrayUpdatesFields(): void
    {
        $risk = Risk::fromArray([
            'id' => 1,
            'initiative' => 5,
            'bezeichnung' => 'Alt',
            'beschreibung' => 'Alter Text',
            'eintrittswahrscheinlichkeit' => 2,
            'schadensausmass' => 2,
        ]);
        $risk->updateFromArray([
            'bezeichnung' => 'Neu',
            'beschreibung' => 'Neuer Text',
            'eintrittswahrscheinlichkeit' => 5,
            'schadensausmass' => 4,
        ]);

        $arr = $risk->toArray();
        $this->assertSame('Neu', $arr['bezeichnung']);
        $this->assertSame('Neuer Text', $arr['beschreibung']);
        $this->assertSame(5, $arr['eintrittswahrscheinlichkeit']);
        $this->assertSame(4, $arr['schadensausmass']);
    }

    public function testUpdateFromArrayKeepsExistingWhenKeysAbsent(): void
    {
        $risk = Risk::fromArray([
            'id' => 1,
            'initiative' => 5,
            'bezeichnung' => 'Bleibt',
            'eintrittswahrscheinlichkeit' => 3,
            'schadensausmass' => 2,
        ]);
        $risk->updateFromArray([]);

        $arr = $risk->toArray();
        $this->assertSame('Bleibt', $arr['bezeichnung']);
        $this->assertSame(3, $arr['eintrittswahrscheinlichkeit']);
        $this->assertSame(2, $arr['schadensausmass']);
        $this->assertSame(5, $arr['initiative']);
    }

    public function testGetIdReturnsCorrectValue(): void
    {
        $risk = Risk::fromArray(['id' => 99, 'initiative' => 1]);
        $this->assertSame(99, $risk->getId());
    }

    // ── ROAM ─────────────────────────────────────────────────────────────────

    public function testFromArrayIncludesRoamFieldsInRoundtrip(): void
    {
        $risk = Risk::fromArray([
            'id' => 1,
            'initiative' => 5,
            'roamStatus' => 'mitigated',
            'roamNotiz' => 'Fallback-Lieferant vertraglich gesichert',
        ]);
        $arr = $risk->toArray();

        $this->assertSame('mitigated', $arr['roamStatus']);
        $this->assertSame('Fallback-Lieferant vertraglich gesichert', $arr['roamNotiz']);
    }

    public function testFromArrayDefaultsRoamFieldsToNullAndEmpty(): void
    {
        $risk = Risk::fromArray(['id' => 1, 'initiative' => 5]);
        $arr = $risk->toArray();

        $this->assertNull($arr['roamStatus']);
        $this->assertSame('', $arr['roamNotiz']);
    }

    public function testUpdateFromArraySetsRoamStatus(): void
    {
        $risk = Risk::fromArray(['id' => 1, 'initiative' => 5]);
        $risk->updateFromArray(['roamStatus' => 'resolved']);

        $this->assertSame('resolved', $risk->toArray()['roamStatus']);
    }

    public function testUpdateFromArrayResetsRoamStatusToNullOnEmptyString(): void
    {
        $risk = Risk::fromArray(['id' => 1, 'initiative' => 5, 'roamStatus' => 'owned']);
        $risk->updateFromArray(['roamStatus' => '']);

        $this->assertNull($risk->toArray()['roamStatus']);
    }

    public function testUpdateFromArrayKeepsRoamStatusWhenKeyAbsent(): void
    {
        $risk = Risk::fromArray(['id' => 1, 'initiative' => 5, 'roamStatus' => 'accepted']);
        $risk->updateFromArray([]);

        $this->assertSame('accepted', $risk->toArray()['roamStatus']);
    }

    public function testUpdateFromArraySetsRoamNotiz(): void
    {
        $risk = Risk::fromArray(['id' => 1, 'initiative' => 5]);
        $risk->updateFromArray(['roamNotiz' => 'Neuer Kommentar']);

        $this->assertSame('Neuer Kommentar', $risk->toArray()['roamNotiz']);
    }

    public function testUpdateFromArrayKeepsRoamNotizWhenKeyAbsent(): void
    {
        $risk = Risk::fromArray(['id' => 1, 'initiative' => 5, 'roamNotiz' => 'Bestehender Text']);
        $risk->updateFromArray([]);

        $this->assertSame('Bestehender Text', $risk->toArray()['roamNotiz']);
    }

    /** toArray() muss roamStatus und roamNotiz immer enthalten. */
    public function testToArrayAlwaysContainsRoamKeys(): void
    {
        $risk = Risk::fromArray(['id' => 1, 'initiative' => 5]);
        $arr = $risk->toArray();

        $this->assertArrayHasKey('roamStatus', $arr);
        $this->assertArrayHasKey('roamNotiz', $arr);
    }
}
