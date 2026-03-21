<?php

namespace App\Entity;

use App\Repository\MetadataRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MetadataRepository::class)]
#[ORM\Table(name: 'metadata')]
class Metadata
{
    #[ORM\Id]
    #[ORM\Column(type: 'integer')]
    private int $id = 1;

    #[ORM\Column(length: 20)]
    private string $kw = '';

    public function getId(): int
    {
        return $this->id;
    }

    public function getKw(): string
    {
        return $this->kw;
    }

    public function setKw(string $kw): void
    {
        $this->kw = $kw;
    }
}
