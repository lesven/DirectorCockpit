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

    /**
     * @param list<int> $initiativeIds
     * @return list<Milestone>
     */
    public function findByInitiativeIds(array $initiativeIds): array
    {
        if (empty($initiativeIds)) {
            return [];
        }

        return $this->createQueryBuilder('m')
            ->where('m.initiative IN (:ids)')
            ->setParameter('ids', $initiativeIds)
            ->orderBy('m.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
