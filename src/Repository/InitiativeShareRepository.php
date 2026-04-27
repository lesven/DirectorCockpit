<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\InitiativeShare;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<InitiativeShare>
 */
class InitiativeShareRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, InitiativeShare::class);
    }

    /** @return list<InitiativeShare> */
    public function findByInitiativeId(int $initiativeId): array
    {
        /** @var list<InitiativeShare> */
        return $this->createQueryBuilder('is_')
            ->join('is_.sharedWith', 'u')
            ->addSelect('u')
            ->where('is_.initiative = :initiativeId')
            ->setParameter('initiativeId', $initiativeId)
            ->orderBy('u.email', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** @return list<InitiativeShare> */
    public function findByUser(User $user): array
    {
        /** @var list<InitiativeShare> */
        return $this->createQueryBuilder('is_')
            ->where('is_.sharedWith = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

    public function findOneByInitiativeIdAndUser(int $initiativeId, User $user): ?InitiativeShare
    {
        /** @var InitiativeShare|null */
        return $this->createQueryBuilder('is_')
            ->where('is_.initiative = :initiativeId')
            ->andWhere('is_.sharedWith = :user')
            ->setParameter('initiativeId', $initiativeId)
            ->setParameter('user', $user)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
