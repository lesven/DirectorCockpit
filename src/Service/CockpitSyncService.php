<?php

namespace App\Service;

use App\Entity\Customer;
use App\Entity\Initiative;
use App\Entity\Milestone;
use App\Entity\NichtVergessen;
use App\Entity\Risk;
use App\Entity\SyncableEntity;
use App\Entity\Team;
use App\Repository\MetadataRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Orchestriert den Lade- und Sync-Vorgang für alle Cockpit-Daten.
 * Validierung → EntitySyncer → Metadata-Update.
 */
class CockpitSyncService
{
    /** @var array<string, class-string<SyncableEntity>> */
    private const ENTITY_REGISTRY = [
        'kunden'          => Customer::class,
        'teams'           => Team::class,
        'initiatives'     => Initiative::class,
        'nicht_vergessen' => NichtVergessen::class,
        'risks'           => Risk::class,
        'milestones'      => Milestone::class,
    ];

    public function __construct(
        private EntityManagerInterface $em,
        private MetadataRepository $metaRepo,
        private PayloadValidator $validator,
        private EntitySyncer $entitySyncer,
        private LoggerInterface $logger = new NullLogger(),
    ) {}

    /** @return array<string, mixed> */
    public function loadAll(): array
    {
        $meta = $this->metaRepo->getOrCreate();
        $result = ['kw' => $meta->getKw()];

        foreach (self::ENTITY_REGISTRY as $key => $class) {
            $entities = $this->em->getRepository($class)->findBy([], ['id' => 'ASC']);
            $result[$key] = array_map(fn(SyncableEntity $e) => $e->toArray(), $entities);
        }

        return $result;
    }

    /** @param array<string, mixed> $payload */
    public function syncAll(array $payload): void
    {
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
            $this->em->getConnection()->commit();
        } catch (\Throwable $e) {
            $this->em->getConnection()->rollBack();
            $this->logger->error('Sync fehlgeschlagen', [
                'exception' => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);
            throw new SyncException('Sync fehlgeschlagen: ' . $e->getMessage(), 0, $e);
        }
    }
}
