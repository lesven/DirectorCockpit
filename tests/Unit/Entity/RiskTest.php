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
}
