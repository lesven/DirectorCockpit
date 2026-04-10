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
     * Lädt alle Initiativen sortiert nach ID und lädt blockedBy in einem einzigen Query
     * (verhindert N+1 beim Zugriff auf Initiative::toArray()).
     *
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
}
