<?php

namespace App\Entity;

use App\Repository\NichtVergessenRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NichtVergessenRepository::class)]
#[ORM\Table(name: 'nicht_vergessen')]
final class NichtVergessen implements SyncableEntity
{
    use HasIdTrait;

    #[ORM\Column(length: 255)]
    private string $title = '';

    #[ORM\Column(type: 'text')]
    private string $body = '';

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'body' => $this->body,
        ];
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): static
    {
        $entity = new self();
        $entity->id = $data['id'];
        $entity->title = $data['title'] ?? '';
        $entity->body = $data['body'] ?? '';

        return $entity;
    }

    /** @param array<string, mixed> $data */
    public function updateFromArray(array $data): void
    {
        $this->title = $data['title'] ?? $this->title;
        $this->body = $data['body'] ?? $this->body;
    }
}
