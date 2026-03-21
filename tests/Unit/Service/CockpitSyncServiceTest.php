<?php

namespace App\Tests\Unit\Service;

use App\Entity\Initiative;
use App\Entity\Metadata;
use App\Entity\NichtVergessen;
use App\Entity\Team;
use App\Repository\MetadataRepository;
use App\Service\CockpitSyncService;
use App\Service\SyncException;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CockpitSyncServiceTest extends TestCase
{
    private EntityManagerInterface&MockObject $em;
    private MetadataRepository&MockObject $metaRepo;
    private Connection&MockObject $connection;
    private CockpitSyncService $service;

    /** @var list<object> */
    private array $persisted = [];
    /** @var list<object> */
    private array $removed = [];

    protected function setUp(): void
    {
        $this->em = $this->createMock(EntityManagerInterface::class);
        $this->metaRepo = $this->createMock(MetadataRepository::class);
        $this->connection = $this->createMock(Connection::class);

        $this->em->method('getConnection')->willReturn($this->connection);

        $this->persisted = [];
        $this->removed = [];

        $this->em->method('persist')->willReturnCallback(function (object $entity): void {
            $this->persisted[] = $entity;
        });
        $this->em->method('remove')->willReturnCallback(function (object $entity): void {
            $this->removed[] = $entity;
        });

        $meta = new Metadata();
        $this->metaRepo->method('getOrCreate')->willReturn($meta);

        $this->service = new CockpitSyncService($this->em, $this->metaRepo);
    }

    private function stubRepositories(array $teams = [], array $inis = [], array $nvs = []): void
    {
        $teamRepo = $this->createMock(EntityRepository::class);
        $teamRepo->method('findAll')->willReturn($teams);

        $iniRepo = $this->createMock(EntityRepository::class);
        $iniRepo->method('findAll')->willReturn($inis);

        $nvRepo = $this->createMock(EntityRepository::class);
        $nvRepo->method('findAll')->willReturn($nvs);

        $this->em->method('getRepository')->willReturnCallback(
            fn(string $class) => match ($class) {
                Team::class => $teamRepo,
                Initiative::class => $iniRepo,
                NichtVergessen::class => $nvRepo,
                default => throw new \LogicException("Unexpected class: $class"),
            }
        );
    }

    public function testNewEntitiesArePersisted(): void
    {
        $this->stubRepositories();

        $payload = [
            'kw' => '10',
            'teams' => [['id' => 1, 'name' => 'Team A']],
            'inis' => [['id' => 2, 'name' => 'Ini A']],
            'nvs' => [['id' => 3, 'title' => 'NV A']],
        ];

        $this->em->expects($this->once())->method('flush');
        $this->connection->expects($this->once())->method('beginTransaction');
        $this->connection->expects($this->once())->method('commit');

        $this->service->syncAll($payload);

        $this->assertCount(3, $this->persisted);
        $this->assertInstanceOf(Team::class, $this->persisted[0]);
        $this->assertInstanceOf(Initiative::class, $this->persisted[1]);
        $this->assertInstanceOf(NichtVergessen::class, $this->persisted[2]);
    }

    public function testMissingEntitiesAreRemoved(): void
    {
        $existingTeam = Team::fromArray(['id' => 1, 'name' => 'Old']);
        $this->stubRepositories(teams: [$existingTeam]);

        $payload = ['kw' => '', 'teams' => [], 'inis' => [], 'nvs' => []];
        $this->service->syncAll($payload);

        $this->assertCount(1, $this->removed);
        $this->assertSame($existingTeam, $this->removed[0]);
    }

    public function testExistingEntitiesAreUpdated(): void
    {
        $team = Team::fromArray(['id' => 1, 'name' => 'Old']);
        $this->stubRepositories(teams: [$team]);

        $payload = [
            'kw' => '',
            'teams' => [['id' => 1, 'name' => 'New']],
            'inis' => [],
            'nvs' => [],
        ];
        $this->service->syncAll($payload);

        $this->assertSame('New', $team->toArray()['name']);
        $this->assertEmpty($this->persisted);
        $this->assertEmpty($this->removed);
    }

    public function testEmptyPayloadRemovesAll(): void
    {
        $team = Team::fromArray(['id' => 1, 'name' => 'A']);
        $ini = Initiative::fromArray(['id' => 2, 'name' => 'B']);
        $this->stubRepositories(teams: [$team], inis: [$ini]);

        $payload = ['kw' => '', 'teams' => [], 'inis' => [], 'nvs' => []];
        $this->service->syncAll($payload);

        $this->assertCount(2, $this->removed);
    }

    public function testTransactionRollbackOnError(): void
    {
        $this->stubRepositories();
        $this->em->method('flush')->willThrowException(new \RuntimeException('DB error'));
        $this->connection->expects($this->once())->method('rollBack');

        $this->expectException(SyncException::class);
        $this->expectExceptionMessageMatches('/Sync fehlgeschlagen/');

        $this->service->syncAll(['kw' => '', 'teams' => [], 'inis' => [], 'nvs' => []]);
    }

    public function testInvalidPayloadStructureThrows(): void
    {
        $this->expectException(SyncException::class);
        $this->expectExceptionMessageMatches("/muss ein Array sein/");

        $this->service->syncAll(['teams' => 'not-array']);
    }

    public function testPayloadWithMissingIdThrows(): void
    {
        $this->expectException(SyncException::class);
        $this->expectExceptionMessageMatches("/muss ein Objekt mit 'id' sein/");

        $this->service->syncAll(['teams' => [['name' => 'no id']]]);
    }

    public function testLoadAllReturnsStructure(): void
    {
        $team = Team::fromArray(['id' => 1, 'name' => 'T']);
        $ini = Initiative::fromArray(['id' => 2, 'name' => 'I']);
        $nv = NichtVergessen::fromArray(['id' => 3, 'title' => 'N']);

        $this->stubRepositories(teams: [$team], inis: [$ini], nvs: [$nv]);

        $result = $this->service->loadAll();

        $this->assertArrayHasKey('kw', $result);
        $this->assertCount(1, $result['teams']);
        $this->assertCount(1, $result['inis']);
        $this->assertCount(1, $result['nvs']);
        $this->assertSame(1, $result['teams'][0]['id']);
    }
}
