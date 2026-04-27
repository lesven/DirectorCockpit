<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Team;
use App\Entity\TeamShare;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<TeamShare>
 */
class TeamShareRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, TeamShare::class);
    }

    /** @return list<TeamShare> */
    public function findByTeam(Team $team): array
    {
        /** @var list<TeamShare> */
        return $this->createQueryBuilder('ts')
            ->join('ts.sharedWith', 'u')
            ->addSelect('u')
            ->where('ts.team = :team')
            ->setParameter('team', $team)
            ->orderBy('u.email', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** @return list<TeamShare> */
    public function findByUser(User $user): array
    {
        /** @var list<TeamShare> */
        return $this->createQueryBuilder('ts')
            ->join('ts.team', 't')
            ->addSelect('t')
            ->where('ts.sharedWith = :user')
            ->setParameter('user', $user)
            ->orderBy('t.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findOneByTeamAndUser(Team $team, User $user): ?TeamShare
    {
        /** @var TeamShare|null */
        return $this->createQueryBuilder('ts')
            ->where('ts.team = :team')
            ->andWhere('ts.sharedWith = :user')
            ->setParameter('team', $team)
            ->setParameter('user', $user)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
