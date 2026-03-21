<?php

namespace App\Entity;

use App\Repository\NichtVergessenRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NichtVergessenRepository::class)]
#[ORM\Table(name: 'nicht_vergessen')]
class NichtVergessen
{
    #[ORM\Id]
    #[ORM\Column(type: 'bigint')]
    private string $id;

    #[ORM\Column(length: 255)]
    private string $title = '';

    #[ORM\Column(type: 'text')]
    private string $body = '';

    public function getId(): string
    {
        return $this->id;
    }

    public function toArray(): array
    {
        return [
            'id' => (int) $this->id,
            'title' => $this->title,
            'body' => $this->body,
        ];
    }

    public static function fromArray(array $data): self
    {
        $entity = new self();
        $entity->id = (string) $data['id'];
        $entity->title = $data['title'] ?? '';
        $entity->body = $data['body'] ?? '';

        return $entity;
    }

    public function updateFromArray(array $data): void
    {
        $this->title = $data['title'] ?? $this->title;
        $this->body = $data['body'] ?? $this->body;
    }
}
