<?php

namespace App\Entity;

use App\Enum\RoamStatusEnum;
use App\Repository\RiskRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: RiskRepository::class)]
#[ORM\Table(name: 'risk')]
final class Risk implements SyncableEntity
{
    use HasIdTrait;

    #[ORM\Column(type: 'bigint')]
    private int $initiative;

    #[ORM\Column(length: 255)]
    private string $bezeichnung = '';

    #[ORM\Column(type: 'text')]
    private string $beschreibung = '';

    #[ORM\Column(type: 'integer')]
    private int $eintrittswahrscheinlichkeit = 1;

    #[ORM\Column(type: 'integer')]
    private int $schadensausmass = 1;

    #[ORM\Column(length: 20, nullable: true, enumType: RoamStatusEnum::class)]
    private ?RoamStatusEnum $roamStatus = null;

    #[ORM\Column(type: 'text')]
    private string $roamNotiz = '';

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'initiative' => $this->initiative,
            'bezeichnung' => $this->bezeichnung,
            'beschreibung' => $this->beschreibung,
            'eintrittswahrscheinlichkeit' => $this->eintrittswahrscheinlichkeit,
            'schadensausmass' => $this->schadensausmass,
            'roamStatus' => $this->roamStatus?->value,
            'roamNotiz' => $this->roamNotiz,
        ];
    }

    public static function fromArray(array $data): static
    {
        $entity = new self();
        $entity->id = $data['id'];
        $entity->initiative = $data['initiative'];
        $entity->bezeichnung = $data['bezeichnung'] ?? '';
        $entity->beschreibung = $data['beschreibung'] ?? '';
        $entity->eintrittswahrscheinlichkeit = $data['eintrittswahrscheinlichkeit'] ?? 1;
        $entity->schadensausmass = $data['schadensausmass'] ?? 1;
        $entity->roamStatus = isset($data['roamStatus']) ? RoamStatusEnum::tryFrom($data['roamStatus']) : null;
        $entity->roamNotiz = $data['roamNotiz'] ?? '';

        return $entity;
    }

    public function updateFromArray(array $data): void
    {
        if (array_key_exists('initiative', $data)) {
            $this->initiative = $data['initiative'];
        }
        $this->bezeichnung = $data['bezeichnung'] ?? $this->bezeichnung;
        $this->beschreibung = $data['beschreibung'] ?? $this->beschreibung;
        if (array_key_exists('eintrittswahrscheinlichkeit', $data)) {
            $this->eintrittswahrscheinlichkeit = $data['eintrittswahrscheinlichkeit'];
        }
        if (array_key_exists('schadensausmass', $data)) {
            $this->schadensausmass = $data['schadensausmass'];
        }
        if (array_key_exists('roamStatus', $data)) {
            $this->roamStatus = $data['roamStatus'] ? RoamStatusEnum::tryFrom($data['roamStatus']) : null;
        }
        if (array_key_exists('roamNotiz', $data)) {
            $this->roamNotiz = $data['roamNotiz'];
        }
    }
}

