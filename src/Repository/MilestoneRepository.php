<?php

namespace App\Repository;

use App\Entity\Milestone;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Milestone>
 */
class MilestoneRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Milestone::class);
    }

    /** Alle Meilensteine einer Initiative, nach ID sortiert. */
    public function findByInitiative(int $initiativeId): array
    {
        return $this->createQueryBuilder('m')
            ->where('m.initiative = :ini')
            ->setParameter('ini', $initiativeId)
            ->orderBy('m.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
