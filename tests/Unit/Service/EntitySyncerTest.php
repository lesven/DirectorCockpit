<?php

namespace App\Tests\Unit\Service;

use App\Entity\Initiative;
use App\Entity\Team;
use App\Service\EntitySyncer;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

class EntitySyncerTest extends TestCase
{
    private EntityManagerInterface&MockObject $em;
    private EntitySyncer $syncer;

    /** @var list<object> */
    private array $persisted = [];
    /** @var list<object> */
    private array $removed = [];

    protected function setUp(): void
    {
        $this->em = $this->createMock(EntityManagerInterface::class);
        $this->persisted = [];
        $this->removed = [];

        $this->em->method('persist')->willReturnCallback(function (object $e): void {
            $this->persisted[] = $e;
        });
        $this->em->method('remove')->willReturnCallback(function (object $e): void {
            $this->removed[] = $e;
        });

        $this->syncer = new EntitySyncer($this->em);
    }

    public function testNewEntitiesArePersisted(): void
    {
        $this->syncer->sync([], [['id' => 1, 'name' => 'Neu']], Team::class);

        $this->assertCount(1, $this->persisted);
        $this->assertInstanceOf(Team::class, $this->persisted[0]);
        $this->assertSame(1, $this->persisted[0]->getId());
    }

    public function testExistingEntitiesAreUpdated(): void
    {
        $existing = Team::fromArray(['id' => 1, 'name' => 'Alt']);

        $this->syncer->sync([$existing], [['id' => 1, 'name' => 'Neu']], Team::class);

        $this->assertEmpty($this->persisted);
        $this->assertEmpty($this->removed);
        $this->assertSame('Neu', $existing->toArray()['name']);
    }

    public function testMissingEntitiesAreRemoved(): void
    {
        $existing = Team::fromArray(['id' => 1, 'name' => 'Dead']);

        $this->syncer->sync([$existing], [], Team::class);

        $this->assertEmpty($this->persisted);
        $this->assertCount(1, $this->removed);
        $this->assertSame($existing, $this->removed[0]);
    }

    public function testMixedCreateUpdateDelete(): void
    {
        $keep = Team::fromArray(['id' => 1, 'name' => 'Keep']);
        $delete = Team::fromArray(['id' => 2, 'name' => 'Delete']);

        $this->syncer->sync(
            [$keep, $delete],
            [
                ['id' => 1, 'name' => 'Updated'],
                ['id' => 3, 'name' => 'Created'],
            ],
            Team::class
        );

        $this->assertSame('Updated', $keep->toArray()['name']);
        $this->assertCount(1, $this->persisted);
        $this->assertSame(3, $this->persisted[0]->getId());
        $this->assertCount(1, $this->removed);
        $this->assertSame($delete, $this->removed[0]);
    }

    public function testEmptyIncomingRemovesAllExisting(): void
    {
        $a = Team::fromArray(['id' => 1, 'name' => 'A']);
        $b = Team::fromArray(['id' => 2, 'name' => 'B']);

        $this->syncer->sync([$a, $b], [], Team::class);

        $this->assertCount(2, $this->removed);
        $this->assertEmpty($this->persisted);
    }

    public function testEmptyExistingAndEmptyIncomingDoesNothing(): void
    {
        $this->syncer->sync([], [], Team::class);

        $this->assertEmpty($this->persisted);
        $this->assertEmpty($this->removed);
    }

    public function testMultipleNewEntitiesAllPersisted(): void
    {
        $this->syncer->sync(
            [],
            [
                ['id' => 1, 'name' => 'Erster'],
                ['id' => 2, 'name' => 'Zweiter'],
                ['id' => 3, 'name' => 'Dritter'],
            ],
            Team::class
        );

        $this->assertCount(3, $this->persisted);
    }

    // --- syncBlockedByRelations ---

    public function testSyncBlockedByRelationsSetsBlocker(): void
    {
        $ini1 = Initiative::fromArray(['id' => 1, 'name' => 'Ini 1']);
        $ini2 = Initiative::fromArray(['id' => 2, 'name' => 'Ini 2']);

        $this->em->method('find')->willReturnCallback(
            fn(string $class, int $id) => match ($id) {
                1 => $ini1,
                2 => $ini2,
                default => null,
            }
        );

        $this->syncer->syncBlockedByRelations([
            ['id' => 1, 'blockedBy' => [2]],
        ]);

        $this->assertSame([2], $ini1->toArray()['blockedBy']);
    }

    public function testSyncBlockedByRelationsClearsExistingBlockers(): void
    {
        $ini1 = Initiative::fromArray(['id' => 1]);
        $ini2 = Initiative::fromArray(['id' => 2]);
        $ini1->addBlockedBy($ini2); // Vorher gesetzt

        $this->em->method('find')->willReturnCallback(
            fn(string $class, int $id) => match ($id) {
                1 => $ini1,
                default => null,
            }
        );

        // Leeres Array → Collection geleert
        $this->syncer->syncBlockedByRelations([
            ['id' => 1, 'blockedBy' => []],
        ]);

        $this->assertSame([], $ini1->toArray()['blockedBy']);
    }

    public function testSyncBlockedByRelationsIgnoresMissingBlockerWithWarning(): void
    {
        $ini1 = Initiative::fromArray(['id' => 1]);

        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->once())
            ->method('warning')
            ->with($this->stringContains('blockedBy'), $this->arrayHasKey('blocker_id'));

        $syncer = new EntitySyncer($this->em, $logger);

        $this->em->method('find')->willReturnCallback(
            fn(string $class, int $id) => match ($id) {
                1 => $ini1,
                default => null, // 99 existiert nicht
            }
        );

        $syncer->syncBlockedByRelations([
            ['id' => 1, 'blockedBy' => [99]],
        ]);

        $this->assertSame([], $ini1->toArray()['blockedBy']); // Verwaister Blocker nicht gesetzt
    }

    public function testSyncBlockedByRelationsMissingBlockedByKeySkipsItem(): void
    {
        $ini1 = Initiative::fromArray(['id' => 1]);

        $this->em->method('find')->willReturn($ini1);

        // Kein blockedBy-Key → clearBlockedBy() wird aufgerufen
        $this->syncer->syncBlockedByRelations([
            ['id' => 1], // kein blockedBy
        ]);

        $this->assertSame([], $ini1->toArray()['blockedBy']);
    }
}
