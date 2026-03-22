<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Gemeinsamer Trait für alle SyncableEntities.
 * Kapselt die identische id-Spalte + getId()-Methode, die sonst in allen Entities kopiert war.
 */
trait HasIdTrait
{
    #[ORM\Id]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    public function getId(): int
    {
        return $this->id;
    }
}
