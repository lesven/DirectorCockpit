<?php

namespace App\Repository;

use App\Entity\Initiative;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Initiative>
 */
class InitiativeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Initiative::class);
    }

    /**
     * @return list<Initiative>
     */
    public function findAllWithBlockedBy(): array
    {
        /** @var list<Initiative> */
        return $this->createQueryBuilder('i')
            ->leftJoin('i.blockedBy', 'b')
            ->addSelect('b')
            ->orderBy('i.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @param list<int> $teamIds
     * @return list<Initiative>
     */
    public function findByTeamIdsWithBlockedBy(array $teamIds): array
    {
        $qb = $this->createQueryBuilder('i')
            ->leftJoin('i.blockedBy', 'b')
            ->addSelect('b');

        if (!empty($teamIds)) {
            $qb->where('i.team IN (:teamIds) OR i.team IS NULL')
               ->setParameter('teamIds', $teamIds);

            /** @var list<Initiative> */
            return $qb->orderBy('i.id', 'ASC')
                ->getQuery()
                ->getResult();
        }

        $qb->where('i.team IS NULL');

        /** @var list<Initiative> */
        return $qb->orderBy('i.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
