<?php

namespace App\Service;

use App\Entity\Initiative;
use App\Entity\NichtVergessen;
use App\Entity\SyncableEntity;
use App\Entity\Team;
use App\Repository\MetadataRepository;
use Doctrine\ORM\EntityManagerInterface;

class CockpitSyncService
{
    /** @var array<string, class-string<SyncableEntity>> */
    private const ENTITY_REGISTRY = [
        'teams' => Team::class,
        'inis' => Initiative::class,
        'nvs' => NichtVergessen::class,
    ];

    public function __construct(
        private EntityManagerInterface $em,
        private MetadataRepository $metaRepo,
    ) {}

    public function loadAll(): array
    {
        $meta = $this->metaRepo->getOrCreate();
        $result = ['kw' => $meta->getKw()];

        foreach (self::ENTITY_REGISTRY as $key => $class) {
            $entities = $this->em->getRepository($class)->findAll();
            $result[$key] = array_map(fn(SyncableEntity $e) => $e->toArray(), $entities);
        }

        return $result;
    }

    public function syncAll(array $payload): void
    {
        $this->validatePayload($payload);

        $this->em->getConnection()->beginTransaction();
        try {
            foreach (self::ENTITY_REGISTRY as $key => $class) {
                $existing = $this->em->getRepository($class)->findAll();
                $this->syncEntities($existing, $payload[$key] ?? [], $class);
            }

            $meta = $this->metaRepo->getOrCreate();
            $meta->setKw($payload['kw'] ?? '');

            $this->em->flush();
            $this->em->getConnection()->commit();
        } catch (\Throwable $e) {
            $this->em->getConnection()->rollBack();
            throw new SyncException('Sync fehlgeschlagen: ' . $e->getMessage(), 0, $e);
        }
    }

    private function validatePayload(array $payload): void
    {
        foreach (self::ENTITY_REGISTRY as $key => $class) {
            if (!isset($payload[$key])) {
                continue;
            }
            if (!is_array($payload[$key])) {
                throw new SyncException("'{$key}' muss ein Array sein");
            }
            foreach ($payload[$key] as $i => $item) {
                if (!is_array($item) || !isset($item['id'])) {
                    throw new SyncException("'{$key}[{$i}]' muss ein Objekt mit 'id' sein");
                }
            }
        }
    }

    /**
     * @param SyncableEntity[] $existing
     * @param array<array<string, mixed>> $incoming
     * @param class-string<SyncableEntity> $entityClass
     */
    private function syncEntities(array $existing, array $incoming, string $entityClass): void
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
