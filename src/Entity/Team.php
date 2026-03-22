<?php

namespace App\Entity;

use App\Enum\StatusEnum;
use App\Repository\TeamRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TeamRepository::class)]
#[ORM\Table(name: 'team')]
final class Team implements SyncableEntity
{
    use HasIdTrait;

    #[ORM\Column(length: 255)]
    private string $name = '';

    #[ORM\Column(length: 255)]
    private string $sub = '';

    #[ORM\Column(length: 20, enumType: StatusEnum::class)]
    private StatusEnum $status = StatusEnum::Grey;

    #[ORM\Column(type: 'text')]
    private string $fokus = '';

    #[ORM\Column(length: 500)]
    private string $schritt = '';

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'sub' => $this->sub,
            'status' => $this->status->value,
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
        $entity->status = StatusEnum::tryFrom($data['status'] ?? '') ?? StatusEnum::Grey;
        $entity->fokus = $data['fokus'] ?? '';
        $entity->schritt = $data['schritt'] ?? '';

        return $entity;
    }

    public function updateFromArray(array $data): void
    {
        $this->name = $data['name'] ?? $this->name;
        $this->sub = $data['sub'] ?? $this->sub;
        $this->status = isset($data['status'])
            ? (StatusEnum::tryFrom($data['status']) ?? $this->status)
            : $this->status;
        $this->fokus = $data['fokus'] ?? $this->fokus;
        $this->schritt = $data['schritt'] ?? $this->schritt;
    }
}
