<?php

namespace App\Service;

use App\Entity\SyncableEntity;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Synchronisiert eine einzelne Entity-Gruppe (create / update / delete).
 * Extrahiert aus CockpitSyncService, damit die Orchestrierungsklasse schlank bleibt.
 */
class EntitySyncer
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    /**
     * @param SyncableEntity[]             $existing    Alle aktuell in der DB vorhandenen Entities dieser Klasse.
     * @param array<array<string, mixed>>  $incoming    Payload-Einträge (müssen jeweils 'id' haben).
     * @param class-string<SyncableEntity> $entityClass Konkreter Entity-Typ für fromArray().
     */
    public function sync(array $existing, array $incoming, string $entityClass): void
    {
        $byId = [];
        foreach ($existing as $entity) {
            $byId[$entity->getId()] = $entity;
        }

        $incomingIds = [];
        foreach ($incoming as $item) {
            $id = $item['id'];
            $incomingIds[$id] = true;

            if (isset($byId[$id])) {
                $byId[$id]->updateFromArray($item);
            } else {
                $this->em->persist($entityClass::fromArray($item));
            }
        }

        foreach ($byId as $id => $entity) {
            if (!isset($incomingIds[$id])) {
                $this->em->remove($entity);
            }
        }
    }
}
