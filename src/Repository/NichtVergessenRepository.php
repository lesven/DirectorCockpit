<?php

namespace App\Repository;

use App\Entity\NichtVergessen;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<NichtVergessen>
 */
class NichtVergessenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, NichtVergessen::class);
    }

    /** Einträge alphabetisch nach Titel sortiert. */
    public function findAllOrderedByTitle(): array
    {
        return $this->createQueryBuilder('n')
            ->orderBy('n.title', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
