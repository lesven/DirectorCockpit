<?php

namespace App\Entity;

use App\Enum\MilestoneStatusEnum;
use App\Repository\MilestoneRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: MilestoneRepository::class)]
#[ORM\Table(name: 'milestone')]
final class Milestone implements SyncableEntity
{
    use HasIdTrait;

    #[ORM\Column(type: 'bigint')]
    private int $initiative;

    #[ORM\Column(length: 255)]
    private string $aufgabe = '';

    #[ORM\Column(type: 'text')]
    private string $beschreibung = '';

    #[ORM\Column(length: 255)]
    private string $owner = '';

    #[ORM\Column(length: 20, enumType: MilestoneStatusEnum::class)]
    private MilestoneStatusEnum $status = MilestoneStatusEnum::Offen;

    #[ORM\Column(length: 20)]
    private string $frist = '';

    #[ORM\Column(type: 'text')]
    private string $bemerkung = '';

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'initiative' => $this->initiative,
            'aufgabe' => $this->aufgabe,
            'beschreibung' => $this->beschreibung,
            'owner' => $this->owner,
            'status' => $this->status->value,
            'frist' => $this->frist,
            'bemerkung' => $this->bemerkung,
        ];
    }

    public static function fromArray(array $data): static
    {
        $entity = new self();
        $entity->id = $data['id'];
        $entity->initiative = $data['initiative'];
        $entity->aufgabe = $data['aufgabe'] ?? '';
        $entity->beschreibung = $data['beschreibung'] ?? '';
        $entity->owner = $data['owner'] ?? '';
        $entity->status = MilestoneStatusEnum::tryFrom($data['status'] ?? '') ?? MilestoneStatusEnum::Offen;
        $entity->frist = $data['frist'] ?? '';
        $entity->bemerkung = $data['bemerkung'] ?? '';

        return $entity;
    }

    public function updateFromArray(array $data): void
    {
        if (array_key_exists('initiative', $data)) {
            $this->initiative = $data['initiative'];
        }
        $this->aufgabe = $data['aufgabe'] ?? $this->aufgabe;
        $this->beschreibung = $data['beschreibung'] ?? $this->beschreibung;
        $this->owner = $data['owner'] ?? $this->owner;
        if (array_key_exists('status', $data)) {
            $this->status = MilestoneStatusEnum::tryFrom($data['status'] ?? '') ?? $this->status;
        }
        if (array_key_exists('frist', $data)) {
            $this->frist = $data['frist'] ?? '';
        }
        if (array_key_exists('bemerkung', $data)) {
            $this->bemerkung = $data['bemerkung'] ?? '';
        }
    }
}
