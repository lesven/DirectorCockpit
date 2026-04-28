<?php

namespace App\Repository;

use App\Entity\Team;
use App\Entity\User;
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

    /**
     * @return list<Team>
     */
    public function findVisibleByUser(User $user): array
    {
        if ($user->isAdmin()) {
            return $this->findBy([], ['id' => 'ASC']);
        }

        return $this->createQueryBuilder('t')
            ->where('t.createdBy = :user')
            ->setParameter('user', $user)
            ->orderBy('t.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Returns teams that have been explicitly shared with the given user (not their own teams).
     *
     * @return list<Team>
     */
    public function findSharedByUser(User $user): array
    {
        /** @var list<Team> */
        return $this->createQueryBuilder('t')
            ->join('App\Entity\TeamShare', 'ts', 'WITH', 'ts.team = t AND ts.sharedWith = :user')
            ->where('t.createdBy != :user OR t.createdBy IS NULL')
            ->setParameter('user', $user)
            ->orderBy('t.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
