<?php

namespace App\Service;

use App\Entity\Initiative;
use App\Entity\SyncableEntity;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Synchronisiert eine einzelne Entity-Gruppe (create / update / delete).
 * Extrahiert aus CockpitSyncService, damit die Orchestrierungsklasse schlank bleibt.
 */
class EntitySyncer
{
    public function __construct(
        private EntityManagerInterface $em,
        private LoggerInterface $logger = new NullLogger(),
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
                continue;
            }
            $this->em->persist($entityClass::fromArray($item));
        }

        foreach ($byId as $id => $entity) {
            if (!isset($incomingIds[$id])) {
                $this->em->remove($entity);
            }
        }
    }

    /**
     * Zweiter Pass: Setzt die blockedBy-ManyToMany-Collections für alle Initiativen
     * anhand der Payload-IDs. Muss nach flush() des ersten Passes aufgerufen werden,
     * damit alle Initiative-Entities in der DB/UoW existieren.
     *
     * Verwaiste IDs (Initiative wurde zwischenzeitlich gelöscht) werden per Warning
     * geloggt, führen aber nicht zum Abbruch.
     *
     * @param array<array<string, mixed>> $initiativePayload
     */
    public function syncBlockedByRelations(array $initiativePayload): void
    {
        foreach ($initiativePayload as $item) {
            $initiative = $this->em->find(Initiative::class, $item['id']);
            if ($initiative === null) {
                continue;
            }
            $initiative->clearBlockedBy();
            $this->applyBlockers($initiative, $item['blockedBy'] ?? []);
        }
    }

    /**
     * @param array<int> $blockerIds
     */
    private function applyBlockers(Initiative $initiative, array $blockerIds): void
    {
        foreach ($blockerIds as $blockerId) {
            $blocker = $this->em->find(Initiative::class, $blockerId);
            if ($blocker === null) {
                $this->logger->warning('blockedBy: Blocker-Initiative nicht gefunden', [
                    'initiative_id' => $initiative->getId(),
                    'blocker_id'    => $blockerId,
                ]);
                continue;
            }
            $initiative->addBlockedBy($blocker);
        }
    }
}
