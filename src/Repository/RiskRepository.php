<?php

namespace App\Repository;

use App\Entity\Risk;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Risk>
 */
class RiskRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Risk::class);
    }

    /** Alle Risiken einer Initiative, nach ID sortiert. */
    public function findByInitiative(int $initiativeId): array
    {
        return $this->createQueryBuilder('r')
            ->where('r.initiative = :ini')
            ->setParameter('ini', $initiativeId)
            ->orderBy('r.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
