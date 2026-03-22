<?php

namespace App\Tests\Unit\Service;

use App\Entity\Initiative;
use App\Entity\Metadata;
use App\Entity\NichtVergessen;
use App\Entity\Team;
use App\Repository\MetadataRepository;
use App\Service\CockpitSyncService;
use App\Service\EntitySyncer;
use App\Service\PayloadValidator;
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
    private Metadata $meta;

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

        $this->meta = new Metadata();
        $this->metaRepo->method('getOrCreate')->willReturn($this->meta);

        $this->service = new CockpitSyncService(
            $this->em,
            $this->metaRepo,
            new PayloadValidator(),
            new EntitySyncer($this->em),
        );
    }

    private function stubRepositories(array $teams = [], array $initiatives = [], array $nichtVergessen = []): void
    {
        $teamRepo = $this->createMock(EntityRepository::class);
        $teamRepo->method('findAll')->willReturn($teams);

        $initiativeRepo = $this->createMock(EntityRepository::class);
        $initiativeRepo->method('findAll')->willReturn($initiatives);

        $nichtVergessenRepo = $this->createMock(EntityRepository::class);
        $nichtVergessenRepo->method('findAll')->willReturn($nichtVergessen);

        $this->em->method('getRepository')->willReturnCallback(
            fn(string $class) => match ($class) {
                Team::class           => $teamRepo,
                Initiative::class     => $initiativeRepo,
                NichtVergessen::class => $nichtVergessenRepo,
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
            'initiatives' => [['id' => 2, 'name' => 'Ini A']],
            'nicht_vergessen' => [['id' => 3, 'title' => 'NV A']],
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

        $payload = ['kw' => '', 'teams' => [], 'initiatives' => [], 'nicht_vergessen' => []];
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
            'initiatives' => [],
            'nicht_vergessen' => [],
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
        $this->stubRepositories(teams: [$team], initiatives: [$ini]);

        $payload = ['kw' => '', 'teams' => [], 'initiatives' => [], 'nicht_vergessen' => []];
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

        $this->service->syncAll(['kw' => '', 'teams' => [], 'initiatives' => [], 'nicht_vergessen' => []]);
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

        $this->stubRepositories(teams: [$team], initiatives: [$ini], nichtVergessen: [$nv]);

        $result = $this->service->loadAll();

        $this->assertArrayHasKey('kw', $result);
        $this->assertCount(1, $result['teams']);
        $this->assertCount(1, $result['initiatives']);
        $this->assertCount(1, $result['nicht_vergessen']);
        $this->assertSame(1, $result['teams'][0]['id']);
    }

    // -------------------------------------------------------------------------
    // Phase 2: Neue Tests für bisher ungetestete Pfade
    // -------------------------------------------------------------------------

    /** Nur 'kw' im Payload – fehlende Entity-Arrays werden als leer behandelt. */
    public function testSyncWithPartialPayloadSucceeds(): void
    {
        $this->stubRepositories();
        $this->connection->expects($this->once())->method('beginTransaction');
        $this->connection->expects($this->once())->method('commit');
        $this->em->expects($this->once())->method('flush');

        $this->service->syncAll(['kw' => '42']);

        $this->assertEmpty($this->persisted);
        $this->assertEmpty($this->removed);
    }

    /** Validierung schlägt vor beginTransaction fehl → kein rollBack nötig. */
    public function testValidationFailsBeforeTransactionBegins(): void
    {
        $this->connection->expects($this->never())->method('beginTransaction');
        $this->connection->expects($this->never())->method('rollBack');

        $this->expectException(SyncException::class);
        $this->service->syncAll(['teams' => 'ungültige-nicht-array-eingabe']);
    }

    /** kw-Wert wird tatsächlich auf dem Metadata-Objekt gesetzt. */
    public function testSyncSetsKwOnMetadata(): void
    {
        $this->stubRepositories();
        $this->service->syncAll(['kw' => '52', 'teams' => [], 'initiatives' => [], 'nicht_vergessen' => []]);

        $this->assertSame('52', $this->meta->getKw());
    }

    /**
     * Dokumentiert das aktuelle Verhalten bei doppelten IDs im Eingangs-Payload:
     * Da $byId nur existierende DB-Entities enthält, werden beide als neu behandelt
     * und zweimal gepersistet – ein echter DB-Flush würde einen PK-Constraint-Fehler liefern.
     */
    public function testSyncWithDuplicateIdsPersistedTwice(): void
    {
        $this->stubRepositories();

        $payload = [
            'kw' => '',
            'teams' => [
                ['id' => 1, 'name' => 'Erster'],
                ['id' => 1, 'name' => 'Duplikat'],
            ],
            'initiatives' => [],
            'nicht_vergessen' => [],
        ];

        $this->service->syncAll($payload);

        // Beide Einträge werden gepersistet, weil biId aus leerer DB-Liste gebaut wird.
        // Dieses Verhalten ist ein bekannter Bug (PK-Verletzung beim Flush).
        $this->assertCount(2, $this->persisted);
    }
}
