<?php

namespace App\Application\Handler;

use App\Application\Command\SyncCockpitDataCommand;
use App\Entity\Customer;
use App\Entity\Initiative;
use App\Entity\Milestone;
use App\Entity\NichtVergessen;
use App\Entity\Risk;
use App\Entity\Team;
use App\Entity\User;
use App\Repository\InitiativeRepository;
use App\Repository\MetadataRepository;
use App\Repository\MilestoneRepository;
use App\Repository\NichtVergessenRepository;
use App\Repository\RiskRepository;
use App\Repository\TeamRepository;
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
        private readonly TeamRepository $teamRepo,
        private readonly InitiativeRepository $initiativeRepo,
        private readonly NichtVergessenRepository $nvRepo,
        private readonly MilestoneRepository $milestoneRepo,
        private readonly RiskRepository $riskRepo,
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
            $user->isAdmin()
                ? $this->syncAllEntities($payload)
                : $this->syncScopedEntities($payload, $user);

            $this->assignCreatedBy($payload, $user);

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

    /** @param array<string, mixed> $payload */
    private function syncAllEntities(array $payload): void
    {
        foreach (EntityRegistry::ENTITY_REGISTRY as $key => $class) {
            $existing = $this->em->getRepository($class)->findAll();
            $this->entitySyncer->sync($existing, $payload[$key] ?? [], $class);
        }
    }

    /**
     * Syncs only entities visible to the given non-admin user.
     *
     * Note: Since the import endpoint is restricted to ROLE_ADMIN via security.yaml
     * (access_control: ^/api/cockpit/import$ → ROLE_ADMIN), this method is currently
     * unreachable in production. It is retained as defense-in-depth in case the
     * access control configuration is changed in the future.
     *
     * @param array<string, mixed> $payload
     */
    private function syncScopedEntities(array $payload, User $user): void
    {
        // Kunden first (referenced by initiatives via FK)
        $existingKunden = $this->em->getRepository(Customer::class)->findAll();
        $this->entitySyncer->sync($existingKunden, $payload['kunden'] ?? [], Customer::class);

        $existingTeams = $this->teamRepo->findVisibleByUser($user);
        $this->entitySyncer->sync($existingTeams, $payload['teams'] ?? [], Team::class);

        $teamIds = array_map(fn($t) => $t->getId(), $existingTeams);
        $incomingTeamIds = array_map(fn($t) => $t['id'], $payload['teams'] ?? []);
        $allTeamIds = array_unique(array_merge($teamIds, $incomingTeamIds));

        $existingInitiatives = $this->initiativeRepo->findByTeamIdsWithBlockedBy($allTeamIds);
        $this->entitySyncer->sync($existingInitiatives, $payload['initiatives'] ?? [], Initiative::class);

        $iniIds = array_map(fn($i) => $i->getId(), $existingInitiatives);
        $incomingIniIds = array_map(fn($i) => $i['id'], $payload['initiatives'] ?? []);
        $allIniIds = array_unique(array_merge($iniIds, $incomingIniIds));

        $existingMilestones = $this->milestoneRepo->findByInitiativeIds($allIniIds);
        $this->entitySyncer->sync($existingMilestones, $payload['milestones'] ?? [], Milestone::class);

        $existingRisks = $this->riskRepo->findByInitiativeIds($allIniIds);
        $this->entitySyncer->sync($existingRisks, $payload['risks'] ?? [], Risk::class);

        $existingNv = $this->nvRepo->findVisibleByUser($user);
        $this->entitySyncer->sync($existingNv, $payload['nicht_vergessen'] ?? [], NichtVergessen::class);
    }

    /**
     * Sets createdBy on imported teams and NV entries.
     * Admin: only on new entities (null) to preserve existing ownership.
     * Non-admin: always, so taken-over entities become visible to the user.
     *
     * @param array<string, mixed> $payload
     */
    private function assignCreatedBy(array $payload, User $user): void
    {
        foreach (['teams' => Team::class, 'nicht_vergessen' => NichtVergessen::class] as $key => $class) {
            foreach ($payload[$key] ?? [] as $item) {
                $entity = $this->em->find($class, $item['id']);
                if ($entity === null) {
                    continue;
                }
                if (!$user->isAdmin() || $entity->getCreatedBy() === null) {
                    $entity->setCreatedBy($user);
                }
            }
        }
    }
}
