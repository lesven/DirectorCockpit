<?php

namespace App\Repository;

use App\Entity\Initiative;
use App\Enum\ProjectStatusEnum;
use App\Enum\StatusEnum;
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

    /** Alle Initiativen eines Teams. */
    public function findByTeam(int $teamId): array
    {
        return $this->findBy(['team' => $teamId]);
    }

    /** Initiativen mit einem bestimmten Ampel-Status. */
    public function findByStatus(StatusEnum $status): array
    {
        return $this->findBy(['status' => $status]);
    }

    /** Kritische Initiativen (projektstatus = kritisch), nach frist sortiert. */
    public function findCritical(): array
    {
        return $this->createQueryBuilder('i')
            ->where('i.projektstatus = :ps')
            ->setParameter('ps', ProjectStatusEnum::Kritisch)
            ->orderBy('i.frist', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** Initiativen ohne Teamzugehörigkeit. */
    public function findWithoutTeam(): array
    {
        return $this->createQueryBuilder('i')
            ->where('i.team IS NULL')
            ->getQuery()
            ->getResult();
    }
}
