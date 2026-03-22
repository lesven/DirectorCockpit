<?php

namespace App\Entity;

use App\Repository\TeamRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TeamRepository::class)]
#[ORM\Table(name: 'team')]
class Team implements SyncableEntity
{
    #[ORM\Id]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(length: 255)]
    private string $name = '';

    #[ORM\Column(length: 255)]
    private string $sub = '';

    #[ORM\Column(length: 20)]
    private string $status = 'grey';

    #[ORM\Column(type: 'text')]
    private string $fokus = '';

    #[ORM\Column(length: 500)]
    private string $schritt = '';

    public function getId(): int
    {
        return $this->id;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'sub' => $this->sub,
            'status' => $this->status,
            'fokus' => $this->fokus,
            'schritt' => $this->schritt,
        ];
    }

    public static function fromArray(array $data): static
    {
        $entity = new self();
        $entity->id = $data['id'];
        $entity->name = $data['name'] ?? '';
        $entity->sub = $data['sub'] ?? '';
        $entity->status = $data['status'] ?? 'grey';
        $entity->fokus = $data['fokus'] ?? '';
        $entity->schritt = $data['schritt'] ?? '';

        return $entity;
    }

    public function updateFromArray(array $data): void
    {
        $this->name = $data['name'] ?? $this->name;
        $this->sub = $data['sub'] ?? $this->sub;
        $this->status = $data['status'] ?? $this->status;
        $this->fokus = $data['fokus'] ?? $this->fokus;
        $this->schritt = $data['schritt'] ?? $this->schritt;
    }
}
