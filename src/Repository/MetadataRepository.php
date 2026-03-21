<?php

namespace App\Repository;

use App\Entity\Metadata;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Metadata>
 */
class MetadataRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Metadata::class);
    }

    public function getOrCreate(): Metadata
    {
        $meta = $this->find(1);
        if ($meta === null) {
            $meta = new Metadata();
            $this->getEntityManager()->persist($meta);
            $this->getEntityManager()->flush();
        }

        return $meta;
    }
}
