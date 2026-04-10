<?php

namespace App\Tests\Unit\Entity;

use App\Domain\Service\FeatureFlags;
use App\Entity\Initiative;
use PHPUnit\Framework\TestCase;

/**
 * Unit-Tests für Initiative.parseFrist() unter Kontrolle des Feature-Flags DEADLINE_FROM_MIXED.
 * Prüft dass das Feature-Flag korrekt zwischen Legacy und Deadline::fromMixed() umschaltet.
 */
class InitiativeFeatureFlagTest extends TestCase
{
    protected function tearDown(): void
    {
        parent::tearDown();
        FeatureFlags::reset();
    }

    public function testParseFristUseLegacyWhenFeatureFlagDisabled(): void
    {
        FeatureFlags::set('DEADLINE_FROM_MIXED', false);

        // Test: ISO Format
        $initiative = Initiative::fromArray([
            'id' => 1,
            'name' => 'Test',
            'frist' => '2026-04-15',
        ]);

        $arr = $initiative->toArray();
        self::assertSame('2026-04-15', $arr['frist']);
    }

    public function testParseFristUseDeadlineWhenFeatureFlagEnabled(): void
    {
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);

        // Test: ISO Format
        $initiative = Initiative::fromArray([
            'id' => 1,
            'name' => 'Test',
            'frist' => '2026-04-15',
        ]);

        $arr = $initiative->toArray();
        self::assertSame('2026-04-15', $arr['frist']);
    }

    public function testParseFristGermanFormatBothPaths(): void
    {
        // Test German Format mit beiden Implementierungen
        $data = [
            'id' => 1,
            'name' => 'Test',
            'frist' => '15.04.2026',
        ];

        // Legacy Path
        FeatureFlags::set('DEADLINE_FROM_MIXED', false);
        $ini1 = Initiative::fromArray($data);

        // Deadline::fromMixed() Path
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);
        $ini2 = Initiative::fromArray($data);

        // Beide sollten gleiches Datum ergeben
        self::assertSame($ini1->toArray()['frist'], $ini2->toArray()['frist']);
    }

    public function testParseFristHandlesNullBothPaths(): void
    {
        $data = [
            'id' => 1,
            'name' => 'Test',
            'frist' => null,
        ];

        // Legacy
        FeatureFlags::set('DEADLINE_FROM_MIXED', false);
        $ini1 = Initiative::fromArray($data);

        // Deadline::fromMixed()
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);
        $ini2 = Initiative::fromArray($data);

        self::assertNull($ini1->toArray()['frist']);
        self::assertNull($ini2->toArray()['frist']);
    }

    public function testParseFristHandlesEmptyStringBothPaths(): void
    {
        $data = [
            'id' => 1,
            'name' => 'Test',
            'frist' => '',
        ];

        // Legacy
        FeatureFlags::set('DEADLINE_FROM_MIXED', false);
        $ini1 = Initiative::fromArray($data);

        // Deadline::fromMixed()
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);
        $ini2 = Initiative::fromArray($data);

        self::assertNull($ini1->toArray()['frist']);
        self::assertNull($ini2->toArray()['frist']);
    }

    public function testUpdateFromArrayRespectsFlagBothPaths(): void
    {
        $entity = Initiative::fromArray(['id' => 1, 'name' => 'Test']);

        // Legacy update
        FeatureFlags::set('DEADLINE_FROM_MIXED', false);
        $entity->updateFromArray(['frist' => '2026-05-20']);
        $date1 = $entity->toArray()['frist'];

        // Reset und neue Update mit Flag enabled
        $entity2 = Initiative::fromArray(['id' => 2, 'name' => 'Test2']);
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);
        $entity2->updateFromArray(['frist' => '2026-05-20']);
        $date2 = $entity2->toArray()['frist'];

        // Sollten gleiches Datum sein
        self::assertSame($date1, $date2);
    }
}
