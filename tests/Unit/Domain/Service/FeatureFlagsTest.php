<?php

namespace App\Tests\Unit\Domain\Service;

use App\Domain\Service\FeatureFlags;
use PHPUnit\Framework\TestCase;

class FeatureFlagsTest extends TestCase
{
    protected function tearDown(): void
    {
        parent::tearDown();
        // Nach jedem Test resetzen
        FeatureFlags::reset();
    }

    public function testFlagIsDisabledByDefault(): void
    {
        self::assertFalse(FeatureFlags::isEnabled('DEADLINE_FROM_MIXED'));
    }

    public function testCanEnableFlagAtRuntime(): void
    {
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);

        self::assertTrue(FeatureFlags::isEnabled('DEADLINE_FROM_MIXED'));
    }

    public function testCanDisableFlagAtRuntime(): void
    {
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);
        FeatureFlags::set('DEADLINE_FROM_MIXED', false);

        self::assertFalse(FeatureFlags::isEnabled('DEADLINE_FROM_MIXED'));
    }

    public function testCanResetSpecificFlag(): void
    {
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);
        FeatureFlags::reset('DEADLINE_FROM_MIXED');

        self::assertFalse(FeatureFlags::isEnabled('DEADLINE_FROM_MIXED'));
    }

    public function testCanResetAllFlags(): void
    {
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);
        FeatureFlags::reset();

        self::assertFalse(FeatureFlags::isEnabled('DEADLINE_FROM_MIXED'));
    }

    public function testAllReturnsAllFlags(): void
    {
        $flags = FeatureFlags::all();

        self::assertIsArray($flags);
        self::assertArrayHasKey('DEADLINE_FROM_MIXED', $flags);
        self::assertFalse($flags['DEADLINE_FROM_MIXED']);
    }

    public function testAllReturnsUpdatedStatusAfterSet(): void
    {
        FeatureFlags::set('DEADLINE_FROM_MIXED', true);
        $flags = FeatureFlags::all();

        self::assertTrue($flags['DEADLINE_FROM_MIXED']);
    }
}
