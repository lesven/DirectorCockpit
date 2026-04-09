<?php

namespace App\Tests\Unit\Service;

use App\Service\InitiativeFilterService;
use PHPUnit\Framework\TestCase;

class InitiativeFilterServiceTest extends TestCase
{
    private InitiativeFilterService $sut;

    protected function setUp(): void
    {
        $this->sut = new InitiativeFilterService();
    }

    public function testHideFertigRemovesFertigeInitiativen(): void
    {
        $result = [
            'kw'           => '15',
            'initiatives'  => [
                ['id' => 1, 'name' => 'Aktiv', 'status' => 'yellow'],
                ['id' => 2, 'name' => 'Fertig', 'status' => 'fertig'],
                ['id' => 3, 'name' => 'Gruen', 'status' => 'green'],
            ],
            'teams' => [],
        ];

        $filtered = $this->sut->hideFertig($result);

        $this->assertSame(1, $filtered['filtered']);
        $this->assertSame(2, $filtered['remaining']);
        $this->assertCount(2, $filtered['result']['initiatives']);
        foreach ($filtered['result']['initiatives'] as $ini) {
            $this->assertNotSame('fertig', $ini['status']);
        }
    }

    public function testHideFertigBehältAndereSchlüsselIntakt(): void
    {
        $result = [
            'kw'          => '15',
            'initiatives' => [['id' => 1, 'status' => 'fertig']],
            'teams'       => [['id' => 10, 'name' => 'Team A']],
        ];

        $filtered = $this->sut->hideFertig($result);

        $this->assertSame('15', $filtered['result']['kw']);
        $this->assertCount(1, $filtered['result']['teams']);
    }

    public function testHideFertigMitLeerInitiativen(): void
    {
        $result = ['kw' => '', 'initiatives' => []];

        $filtered = $this->sut->hideFertig($result);

        $this->assertSame(0, $filtered['filtered']);
        $this->assertSame(0, $filtered['remaining']);
    }

    public function testHideFertigMitFehlendemInitiativenSchlüssel(): void
    {
        $result = ['kw' => ''];

        $filtered = $this->sut->hideFertig($result);

        $this->assertSame(0, $filtered['filtered']);
        $this->assertSame(0, $filtered['remaining']);
        $this->assertSame([], $filtered['result']['initiatives']);
    }

    public function testResultHatNeuindizierteArrays(): void
    {
        $result = [
            'initiatives' => [
                ['id' => 1, 'status' => 'fertig'],
                ['id' => 2, 'status' => 'yellow'],
            ],
        ];

        $filtered = $this->sut->hideFertig($result);

        // Nach array_values beginnt der Index bei 0
        $this->assertArrayHasKey(0, $filtered['result']['initiatives']);
        $this->assertSame(2, $filtered['result']['initiatives'][0]['id']);
    }
}
