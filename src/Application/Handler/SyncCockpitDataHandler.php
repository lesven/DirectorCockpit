<?php

namespace App\Application\Handler;

use App\Application\Command\SyncCockpitDataCommand;
use App\Entity\Customer;
use App\Entity\Initiative;
use App\Entity\Milestone;
use App\Entity\NichtVergessen;
use App\Entity\Risk;
use App\Entity\SyncableEntity;
use App\Entity\Team;
use App\Entity\User;
use App\Repository\MetadataRepository;
use App\Service\EntityRegistry;
use App\Service\EntitySyncer;
use App\Service\SyncException;
use App\Service\ValidationException;
use App\Service\PayloadValidatorInterface;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Application-Handler für den Cockpit-Sync.
 *
 * Empfängt einen SyncCockpitDataCommand und orchestriert:
 *   Payload-Validierung → transaktionales Entity-Sync → Metadata-Update.
 *
 * Dies ist der kanonische Sync-Pfad. CockpitSyncService::syncAll() ist deprecated.
 */
class SyncCockpitDataHandler
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MetadataRepository $metaRepo,
        private readonly PayloadValidatorInterface $validator,
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

        $this->validator->validate($payload, array_keys(EntityRegistry::ENTITY_REGISTRY));

        $this->em->getConnection()->beginTransaction();
        try {
            foreach (EntityRegistry::ENTITY_REGISTRY as $key => $class) {
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

    /**
     * Import-Variante: Setzt createdBy auf neue Teams und NichtVergessen.
     *
     * @throws ValidationException
     * @throws SyncException
     */
    public function handleForUser(SyncCockpitDataCommand $command, User $user): void
    {
        $payload = $command->payload;

        $this->validator->validate($payload, array_keys(EntityRegistry::ENTITY_REGISTRY));

        $this->em->getConnection()->beginTransaction();
        try {
            foreach (EntityRegistry::ENTITY_REGISTRY as $key => $class) {
                $existing = $this->em->getRepository($class)->findAll();
                $this->entitySyncer->sync($existing, $payload[$key] ?? [], $class);
            }

            // Set createdBy on newly created teams and NV entries
            foreach (['teams' => Team::class, 'nicht_vergessen' => NichtVergessen::class] as $key => $class) {
                foreach ($payload[$key] ?? [] as $item) {
                    $entity = $this->em->find($class, $item['id']);
                    if ($entity !== null && $entity->getCreatedBy() === null) {
                        $entity->setCreatedBy($user);
                    }
                }
            }

            $meta = $this->metaRepo->getOrCreate();
            $meta->setKw($payload['kw'] ?? '');

            $this->em->flush();

            $this->entitySyncer->syncBlockedByRelations($payload['initiatives'] ?? []);
            $this->em->flush();

            $this->em->getConnection()->commit();
        } catch (ValidationException $e) {
            $this->em->getConnection()->rollBack();
            throw $e;
        } catch (\Throwable $e) {
            $this->em->getConnection()->rollBack();
            $this->logger->error('Import fehlgeschlagen', [
                'exception' => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);
            throw new SyncException('Import fehlgeschlagen: ' . $e->getMessage(), 0, $e);
        }
    }
}
