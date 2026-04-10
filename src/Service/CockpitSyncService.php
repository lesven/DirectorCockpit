<?php

namespace App\Service;

use App\Entity\SyncableEntity;
use App\Repository\InitiativeRepository;
use App\Repository\MetadataRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Orchestriert den Lade-Vorgang für alle Cockpit-Daten.
 * Der Sync-Pfad wird ausschließlich über SyncCockpitDataHandler abgewickelt.
 *
 * @deprecated Dieser Service wird in einer späteren Aufräum-Phase entfernt.
 *             Nur noch loadAll() wird aktuell genutzt.
 */
class CockpitSyncService
{
    public function __construct(
        private EntityManagerInterface $em,
        private MetadataRepository $metaRepo,
        private InitiativeRepository $initiativeRepo,
    ) {}

    /** @return array<string, mixed> */
    public function loadAll(): array
    {
        $meta = $this->metaRepo->getOrCreate();
        $result = ['kw' => $meta->getKw()];

        foreach (EntityRegistry::ENTITY_REGISTRY as $key => $class) {
            $entities = $key === 'initiatives'
                ? $this->initiativeRepo->findAllWithBlockedBy()
                : $this->em->getRepository($class)->findBy([], ['id' => 'ASC']);
            $result[$key] = array_map(fn(SyncableEntity $e) => $e->toArray(), $entities);
        }

        return $result;
    }

}
