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

    #[ORM\Column(length: 20, enumType: StatusEnum::class)]
    private StatusEnum $status = StatusEnum::Grey;

    #[ORM\Column(type: 'text')]
    private string $fokus = '';

    #[ORM\Column(length: 500)]
    private string $schritt = '';

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $createdBy = null;

    public function getCreatedBy(): ?User
    {
        return $this->createdBy;
    }

    public function setCreatedBy(?User $user): void
    {
        $this->createdBy = $user;
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'status' => $this->status->value,
            'fokus' => $this->fokus,
            'schritt' => $this->schritt,
            'createdBy' => $this->createdBy?->getId(),
        ];
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): static
    {
        $entity = new self();
        $entity->id = $data['id'];
        $entity->name = $data['name'] ?? '';
        $entity->status = StatusEnum::tryFrom($data['status'] ?? '') ?? StatusEnum::Grey;
        $entity->fokus = $data['fokus'] ?? '';
        $entity->schritt = $data['schritt'] ?? '';

        return $entity;
    }

    /** @param array<string, mixed> $data */
    public function updateFromArray(array $data): void
    {
        $this->name = $data['name'] ?? $this->name;
        $this->status = isset($data['status'])
            ? (StatusEnum::tryFrom($data['status']) ?? $this->status)
            : $this->status;
        $this->fokus = $data['fokus'] ?? $this->fokus;
        $this->schritt = $data['schritt'] ?? $this->schritt;
    }
}
