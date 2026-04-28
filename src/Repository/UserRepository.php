<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function save(User $user): void
    {
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    public function remove(User $user): void
    {
        $this->getEntityManager()->remove($user);
        $this->getEntityManager()->flush();
    }

    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }
        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->flush();
    }

    public function findByEmail(string $email): ?User
    {
        return $this->findOneBy(['email' => $email]);
    }

    /** @return list<User> */
    public function findAllOrderedByEmail(): array
    {
        return $this->createQueryBuilder('u')
            ->orderBy('u.email', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Search users by email fragment (case-insensitive), excluding a given user.
     *
     * @return list<User>
     */
    public function searchByEmail(string $query, User $excludeUser, int $limit = 10): array
    {
        /** @var list<User> */
        return $this->createQueryBuilder('u')
            ->where('LOWER(u.email) LIKE LOWER(:query)')
            ->andWhere('u.id != :excludeId')
            ->setParameter('query', '%' . addcslashes($query, '%_\\') . '%')
            ->setParameter('excludeId', $excludeUser->getId())
            ->orderBy('u.email', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }
}
