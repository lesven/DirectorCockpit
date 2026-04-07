<?php

namespace App\Entity;

use App\Repository\CustomerRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CustomerRepository::class)]
#[ORM\Table(name: 'customer')]
final class Customer implements SyncableEntity
{
    use HasIdTrait;

    #[ORM\Column(length: 255)]
    private string $name = '';

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id'   => $this->id,
            'name' => $this->name,
        ];
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): static
    {
        $entity = new self();
        $entity->id   = $data['id'];
        $entity->name = $data['name'] ?? '';

        return $entity;
    }

    /** @param array<string, mixed> $data */
    public function updateFromArray(array $data): void
    {
        $this->name = $data['name'] ?? $this->name;
    }
}
