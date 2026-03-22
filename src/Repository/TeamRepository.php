<?php

namespace App\Repository;

use App\Entity\Team;
use App\Enum\StatusEnum;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Team>
 */
class TeamRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Team::class);
    }

    /** Alle Teams mit einem bestimmten Ampel-Status. */
    public function findByStatus(StatusEnum $status): array
    {
        return $this->findBy(['status' => $status]);
    }

    /** Teams alphabetisch nach Name sortiert. */
    public function findAllOrderedByName(): array
    {
        return $this->createQueryBuilder('t')
            ->orderBy('t.name', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
