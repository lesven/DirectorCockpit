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
    /** Request-scoped cache – verhindert doppelten DB-Hit pro Request. */
    private ?Metadata $cached = null;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Metadata::class);
    }

    /**
     * Gibt die einzige Metadata-Zeile zurück oder legt sie an.
     * Ruft bewusst kein flush() auf – das obliegt dem Aufrufer,
     * damit keine Partial-Writes innerhalb fremder Transaktionen entstehen.
     */
    public function getOrCreate(): Metadata
    {
        if ($this->cached !== null) {
            return $this->cached;
        }

        $meta = $this->find(1);
        if ($meta === null) {
            $meta = new Metadata();
            $this->getEntityManager()->persist($meta);
            // Kein flush() hier – Aufrufer ist für Transaktions-Management zuständig
        }

        $this->cached = $meta;

        return $this->cached;
    }
}
