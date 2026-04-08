<?php

namespace App\Application\Handler;

use App\Application\Command\SyncCockpitDataCommand;
use App\Entity\Initiative;
use App\Entity\Milestone;
use App\Entity\NichtVergessen;
use App\Entity\Risk;
use App\Entity\SyncableEntity;
use App\Entity\Team;
use App\Repository\MetadataRepository;
use App\Service\EntitySyncer;
use App\Service\SyncException;
use App\Service\ValidationException;
use App\Service\PayloadValidator;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Application-Handler für den Cockpit-Sync.
 *
 * Empfängt einen SyncCockpitDataCommand und orchestriert:
 *   Payload-Validierung → transaktionales Entity-Sync → Metadata-Update.
 *
 * Dieser Handler ist der DDD-Nachfolger von CockpitSyncService::syncAll(),
 * aktivierbar via USE_DDD_SYNC=true.
 */
class SyncCockpitDataHandler
{
    /** @var array<string, class-string<SyncableEntity>> */
    private const ENTITY_REGISTRY = [
        'teams'           => Team::class,
        'initiatives'     => Initiative::class,
        'nicht_vergessen' => NichtVergessen::class,
        'risks'           => Risk::class,
        'milestones'      => Milestone::class,
    ];

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MetadataRepository $metaRepo,
        private readonly PayloadValidator $validator,
        private readonly EntitySyncer $entitySyncer,
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {}

    /**
     * @throws ValidationException  bei ungültigen Feldinhalten
     * @throws SyncException        bei Datenbank- oder Transaktionsfehlern
     */
    public function handle(SyncCockpitDataCommand $command): void
    {
        $payload = $command->payload;

        $this->validator->validate($payload, array_keys(self::ENTITY_REGISTRY));

        $this->em->getConnection()->beginTransaction();
        try {
            foreach (self::ENTITY_REGISTRY as $key => $class) {
                $existing = $this->em->getRepository($class)->findAll();
                $this->entitySyncer->sync($existing, $payload[$key] ?? [], $class);
            }

            $meta = $this->metaRepo->getOrCreate();
            $meta->setKw($payload['kw'] ?? '');

            $this->em->flush();

            // Zweiter Pass: blockedBy-Relations setzen (benötigt persistierte Initiative-IDs)
            $this->entitySyncer->syncBlockedByRelations($payload['initiatives'] ?? []);
            $this->em->flush();

            $this->em->getConnection()->commit();
        } catch (ValidationException $e) {
            $this->em->getConnection()->rollBack();
            throw $e;
        } catch (\Throwable $e) {
            $this->em->getConnection()->rollBack();
            $this->logger->error('Sync fehlgeschlagen (DDD-Handler)', [
                'exception' => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);
            throw new SyncException('Sync fehlgeschlagen: ' . $e->getMessage(), 0, $e);
        }
    }
}
