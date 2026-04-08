<?php

namespace App\Tests\Unit\Application\Handler;

use App\Application\Command\SyncCockpitDataCommand;
use App\Application\Handler\SyncCockpitDataHandler;
use App\Entity\Initiative;
use App\Entity\Metadata;
use App\Entity\Milestone;
use App\Entity\NichtVergessen;
use App\Entity\Risk;
use App\Entity\Team;
use App\Repository\MetadataRepository;
use App\Service\EntitySyncer;
use App\Service\PayloadValidator;
use App\Service\SyncException;
use App\Service\ValidationException;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class SyncCockpitDataHandlerTest extends TestCase
{
    private EntityManagerInterface&MockObject $em;
    private MetadataRepository&MockObject $metaRepo;
    private Connection&MockObject $connection;
    private SyncCockpitDataHandler $handler;
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

        $this->handler = new SyncCockpitDataHandler(
            $this->em,
            $this->metaRepo,
            new PayloadValidator(),
            new EntitySyncer($this->em),
        );
    }

    /**
     * @param list<object> $teams
     * @param list<object> $initiatives
     * @param list<object> $nichtVergessen
     * @param list<object> $risks
     * @param list<object> $milestones
     */
    private function stubRepositories(
        array $teams = [],
        array $initiatives = [],
        array $nichtVergessen = [],
        array $risks = [],
        array $milestones = [],
    ): void {
        $teamRepo = $this->createMock(EntityRepository::class);
        $teamRepo->method('findAll')->willReturn($teams);

        $initiativeRepo = $this->createMock(EntityRepository::class);
        $initiativeRepo->method('findAll')->willReturn($initiatives);

        $nichtVergessenRepo = $this->createMock(EntityRepository::class);
        $nichtVergessenRepo->method('findAll')->willReturn($nichtVergessen);

        $riskRepo = $this->createMock(EntityRepository::class);
        $riskRepo->method('findAll')->willReturn($risks);

        $milestoneRepo = $this->createMock(EntityRepository::class);
        $milestoneRepo->method('findAll')->willReturn($milestones);

        $this->em->method('getRepository')->willReturnCallback(
            fn(string $class) => match ($class) {
                Team::class           => $teamRepo,
                Initiative::class     => $initiativeRepo,
                NichtVergessen::class => $nichtVergessenRepo,
                Risk::class           => $riskRepo,
                Milestone::class      => $milestoneRepo,
                default               => throw new \LogicException("Unexpected class: $class"),
            }
        );
    }

    public function testNewEntitiesArePersisted(): void
    {
        $this->stubRepositories();

        $command = new SyncCockpitDataCommand([
            'kw'              => '12',
            'teams'           => [['id' => 1, 'name' => 'Team A']],
            'initiatives'     => [['id' => 2, 'name' => 'Ini A']],
            'nicht_vergessen' => [['id' => 3, 'title' => 'NV A']],
        ]);

        $this->em->expects($this->exactly(2))->method('flush');
        $this->connection->expects($this->once())->method('beginTransaction');
        $this->connection->expects($this->once())->method('commit');

        $this->handler->handle($command);

        $this->assertCount(3, $this->persisted);
        $this->assertInstanceOf(Team::class, $this->persisted[0]);
        $this->assertInstanceOf(Initiative::class, $this->persisted[1]);
        $this->assertInstanceOf(NichtVergessen::class, $this->persisted[2]);
    }

    public function testKwIsUpdatedOnMetadata(): void
    {
        $this->stubRepositories();

        $this->handler->handle(new SyncCockpitDataCommand(['kw' => 'KW42']));

        self::assertSame('KW42', $this->meta->getKw());
    }

    public function testExistingEntityIsUpdatedNotCreated(): void
    {
        $existing = Team::fromArray(['id' => 1, 'name' => 'Old Name', 'status' => 'grey', 'fokus' => '', 'schritt' => '']);
        $this->stubRepositories(teams: [$existing]);

        $this->handler->handle(new SyncCockpitDataCommand([
            'teams' => [['id' => 1, 'name' => 'New Name']],
        ]));

        self::assertSame('New Name', $existing->toArray()['name']);
        self::assertEmpty($this->persisted, 'Existing entity must not be re-persisted');
    }

    public function testMissingEntityIsRemoved(): void
    {
        $existing = Team::fromArray(['id' => 1, 'name' => 'Old', 'status' => 'grey', 'fokus' => '', 'schritt' => '']);
        $this->stubRepositories(teams: [$existing]);

        $this->handler->handle(new SyncCockpitDataCommand([
            'teams' => [], // ID 1 fehlt → delete
        ]));

        self::assertCount(1, $this->removed);
        self::assertSame($existing, $this->removed[0]);
    }

    public function testValidationExceptionIsRethrown(): void
    {
        $this->stubRepositories();

        $this->expectException(ValidationException::class);

        $this->handler->handle(new SyncCockpitDataCommand([
            'initiatives' => [['id' => 1, 'businessValue' => 4]], // 4 ist kein Fibonacci-Wert
        ]));
    }

    public function testTransactionIsRolledBackOnFlushError(): void
    {
        $this->stubRepositories();

        $this->em->method('flush')->willThrowException(new \RuntimeException('DB error'));
        $this->connection->expects($this->once())->method('rollBack');

        $this->expectException(SyncException::class);

        $this->handler->handle(new SyncCockpitDataCommand(['kw' => 'KW1']));
    }

    public function testTransactionIsNotStartedOnValidationError(): void
    {
        $this->stubRepositories();

        // Validierung schlägt fehl, bevor die Transaktion beginnt
        $this->connection->expects($this->never())->method('beginTransaction');

        $this->expectException(ValidationException::class);

        $this->handler->handle(new SyncCockpitDataCommand([
            'initiatives' => [['id' => 'not-an-int', 'name' => 'X']],
        ]));
    }

    public function testEmptyPayloadRunsWithoutError(): void
    {
        $this->stubRepositories();
        $this->em->expects($this->exactly(2))->method('flush');

        $this->handler->handle(new SyncCockpitDataCommand([]));
    }

    public function testRisksAndMilestonesAreSynced(): void
    {
        $this->stubRepositories();

        $this->handler->handle(new SyncCockpitDataCommand([
            'risks'      => [['id' => 10, 'initiative' => 1, 'eintrittswahrscheinlichkeit' => 2, 'schadensausmass' => 3]],
            'milestones' => [['id' => 20, 'initiative' => 1, 'aufgabe' => 'Task X']],
        ]));

        $types = array_map(fn($e) => $e::class, $this->persisted);
        self::assertContains(Risk::class, $types);
        self::assertContains(Milestone::class, $types);
    }
}
