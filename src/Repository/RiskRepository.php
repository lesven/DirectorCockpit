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

    /**
     * @param list<int> $initiativeIds
     * @return list<Risk>
     */
    public function findByInitiativeIds(array $initiativeIds): array
    {
        if (empty($initiativeIds)) {
            return [];
        }

        return $this->createQueryBuilder('r')
            ->where('r.initiative IN (:ids)')
            ->setParameter('ids', $initiativeIds)
            ->orderBy('r.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
