<?php

namespace App\Entity;

use App\Repository\InitiativeRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: InitiativeRepository::class)]
#[ORM\Table(name: 'initiative')]
class Initiative implements SyncableEntity
{
    #[ORM\Id]
    #[ORM\Column(type: 'bigint')]
    private int $id;

    #[ORM\Column(length: 255)]
    private string $name = '';

    #[ORM\Column(type: 'bigint', nullable: true)]
    private ?int $team = null;

    #[ORM\Column(length: 20)]
    private string $status = 'grey';

    #[ORM\Column(length: 20)]
    private string $projektstatus = 'ok';

    #[ORM\Column(length: 500)]
    private string $schritt = '';

    #[ORM\Column(length: 20)]
    private string $frist = '';

    #[ORM\Column(type: 'text')]
    private string $notiz = '';

    public function getId(): int
    {
        return $this->id;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'team' => $this->team,
            'status' => $this->status,
            'projektstatus' => $this->projektstatus,
            'schritt' => $this->schritt,
            'frist' => $this->frist,
            'notiz' => $this->notiz,
        ];
    }

    public static function fromArray(array $data): self
    {
        $entity = new self();
        $entity->id = $data['id'];
        $entity->name = $data['name'] ?? '';
        $entity->team = $data['team'] ?? null;
        $entity->status = $data['status'] ?? 'grey';
        $entity->projektstatus = $data['projektstatus'] ?? 'ok';
        $entity->schritt = $data['schritt'] ?? '';
        $entity->frist = $data['frist'] ?? '';
        $entity->notiz = $data['notiz'] ?? '';

        return $entity;
    }

    public function updateFromArray(array $data): void
    {
        $this->name = $data['name'] ?? $this->name;
        $this->team = array_key_exists('team', $data) ? $data['team'] : $this->team;
        $this->status = $data['status'] ?? $this->status;
        $this->projektstatus = $data['projektstatus'] ?? $this->projektstatus;
        $this->schritt = $data['schritt'] ?? $this->schritt;
        $this->frist = $data['frist'] ?? $this->frist;
        $this->notiz = $data['notiz'] ?? $this->notiz;
    }
}
