<?php

namespace App\Entity;

use App\Enum\ProjectStatusEnum;
use App\Enum\StatusEnum;
use App\Repository\InitiativeRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: InitiativeRepository::class)]
#[ORM\Table(name: 'initiative')]
class Initiative implements SyncableEntity
{
    use HasIdTrait;

    #[ORM\Column(length: 255)]
    private string $name = '';

    #[ORM\Column(type: 'bigint', nullable: true)]
    private ?int $team = null;

    #[ORM\Column(length: 20, enumType: StatusEnum::class)]
    private StatusEnum $status = StatusEnum::Grey;

    #[ORM\Column(length: 20, enumType: ProjectStatusEnum::class)]
    private ProjectStatusEnum $projektstatus = ProjectStatusEnum::Ok;

    #[ORM\Column(length: 500)]
    private string $schritt = '';

    #[ORM\Column(length: 20)]
    private string $frist = '';

    #[ORM\Column(type: 'text')]
    private string $notiz = '';

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'team' => $this->team,
            'status' => $this->status->value,
            'projektstatus' => $this->projektstatus->value,
            'schritt' => $this->schritt,
            'frist' => $this->frist,
            'notiz' => $this->notiz,
        ];
    }

    public static function fromArray(array $data): static
    {
        $entity = new self();
        $entity->id = $data['id'];
        $entity->name = $data['name'] ?? '';
        $entity->team = $data['team'] ?? null;
        $entity->status = StatusEnum::tryFrom($data['status'] ?? '') ?? StatusEnum::Grey;
        $entity->projektstatus = ProjectStatusEnum::tryFrom($data['projektstatus'] ?? '') ?? ProjectStatusEnum::Ok;
        $entity->schritt = $data['schritt'] ?? '';
        $entity->frist = $data['frist'] ?? '';
        $entity->notiz = $data['notiz'] ?? '';

        return $entity;
    }

    public function updateFromArray(array $data): void
    {
        $this->name = $data['name'] ?? $this->name;
        $this->team = array_key_exists('team', $data) ? $data['team'] : $this->team;
        $this->status = isset($data['status'])
            ? (StatusEnum::tryFrom($data['status']) ?? $this->status)
            : $this->status;
        $this->projektstatus = isset($data['projektstatus'])
            ? (ProjectStatusEnum::tryFrom($data['projektstatus']) ?? $this->projektstatus)
            : $this->projektstatus;
        $this->schritt = $data['schritt'] ?? $this->schritt;
        $this->frist = $data['frist'] ?? $this->frist;
        $this->notiz = $data['notiz'] ?? $this->notiz;
    }
}
