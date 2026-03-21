<?php

namespace App\Service;

use App\Entity\Initiative;
use App\Entity\NichtVergessen;
use App\Entity\Team;
use App\Repository\InitiativeRepository;
use App\Repository\MetadataRepository;
use App\Repository\NichtVergessenRepository;
use App\Repository\TeamRepository;
use Doctrine\ORM\EntityManagerInterface;

class CockpitSyncService
{
    public function __construct(
        private EntityManagerInterface $em,
        private TeamRepository $teamRepo,
        private InitiativeRepository $iniRepo,
        private NichtVergessenRepository $nvRepo,
        private MetadataRepository $metaRepo,
    ) {}

    public function loadAll(): array
    {
        $meta = $this->metaRepo->getOrCreate();

        return [
            'kw' => $meta->getKw(),
            'teams' => array_map(fn(Team $t) => $t->toArray(), $this->teamRepo->findAll()),
            'inis' => array_map(fn(Initiative $i) => $i->toArray(), $this->iniRepo->findAll()),
            'nvs' => array_map(fn(NichtVergessen $n) => $n->toArray(), $this->nvRepo->findAll()),
        ];
    }

    public function syncAll(array $payload): void
    {
        $this->syncEntities(
            $this->teamRepo->findAll(),
            $payload['teams'] ?? [],
            Team::class,
        );

        $this->syncEntities(
            $this->iniRepo->findAll(),
            $payload['inis'] ?? [],
            Initiative::class,
        );

        $this->syncEntities(
            $this->nvRepo->findAll(),
            $payload['nvs'] ?? [],
            NichtVergessen::class,
        );

        $meta = $this->metaRepo->getOrCreate();
        $meta->setKw($payload['kw'] ?? '');

        $this->em->flush();
    }

    /**
     * @template T of Team|Initiative|NichtVergessen
     * @param T[] $existing
     * @param array<array<string, mixed>> $incoming
     * @param class-string<T> $entityClass
     */
    private function syncEntities(array $existing, array $incoming, string $entityClass): void
    {
        $byId = [];
        foreach ($existing as $entity) {
            $byId[$entity->getId()] = $entity;
        }

        $incomingIds = [];
        foreach ($incoming as $item) {
            if (!isset($item['id'])) {
                continue;
            }
            $id = (string) $item['id'];
            $incomingIds[$id] = true;

            if (isset($byId[$id])) {
                $byId[$id]->updateFromArray($item);
            } else {
                $entity = $entityClass::fromArray($item);
                $this->em->persist($entity);
            }
        }

        foreach ($byId as $id => $entity) {
            if (!isset($incomingIds[$id])) {
                $this->em->remove($entity);
            }
        }
    }
}
