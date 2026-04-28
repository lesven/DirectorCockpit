<?php

namespace App\Repository;

use App\Entity\NichtVergessen;
use App\Entity\User;
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

    /**
     * @return list<NichtVergessen>
     */
    public function findVisibleByUser(User $user): array
    {
        if ($user->isAdmin()) {
            return $this->findBy([], ['id' => 'ASC']);
        }

        return $this->createQueryBuilder('nv')
            ->where('nv.createdBy = :user')
            ->setParameter('user', $user)
            ->orderBy('nv.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
