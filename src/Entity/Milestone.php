<?php

namespace App\Entity;

use App\Enum\MilestoneStatusEnum;
use App\Repository\MilestoneRepository;
use Doctrine\DBAL\Types\Types;
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

    #[ORM\Column(length: 255)]
    private string $owner = '';

    #[ORM\Column(length: 20, enumType: MilestoneStatusEnum::class)]
    private MilestoneStatusEnum $status = MilestoneStatusEnum::Offen;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $frist = null;

    #[ORM\Column(type: 'text')]
    private string $bemerkung = '';

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'initiative' => $this->initiative,
            'aufgabe' => $this->aufgabe,
            'owner' => $this->owner,
            'status' => $this->status->value,
            'frist' => $this->frist?->format('Y-m-d'),
            'bemerkung' => $this->bemerkung,
        ];
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): static
    {
        $entity = new self();
        $entity->id = $data['id'];
        $entity->initiative = $data['initiative'];
        $entity->aufgabe = $data['aufgabe'] ?? '';
        $entity->owner = $data['owner'] ?? '';
        $entity->status = MilestoneStatusEnum::tryFrom($data['status'] ?? '') ?? MilestoneStatusEnum::Offen;
        $entity->frist = self::parseFrist($data['frist'] ?? null);
        $entity->bemerkung = $data['bemerkung'] ?? '';

        return $entity;
    }

    /** @param array<string, mixed> $data */
    public function updateFromArray(array $data): void
    {
        if (array_key_exists('initiative', $data)) {
            $this->initiative = $data['initiative'];
        }
        $this->aufgabe = $data['aufgabe'] ?? $this->aufgabe;
        $this->owner = $data['owner'] ?? $this->owner;
        if (array_key_exists('status', $data)) {
            $this->status = MilestoneStatusEnum::tryFrom($data['status'] ?? '') ?? $this->status;
        }
        if (array_key_exists('frist', $data)) {
            $this->frist = self::parseFrist($data['frist']);
        }
        if (array_key_exists('bemerkung', $data)) {
            $this->bemerkung = $data['bemerkung'] ?? '';
        }
    }

    private static function parseFrist(mixed $value): ?\DateTimeImmutable
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_string($value)) {
            return null;
        }
        $date = \DateTimeImmutable::createFromFormat('Y-m-d', $value);
        if ($date !== false && $date->format('Y-m-d') === $value) {
            return $date;
        }
        $date = \DateTimeImmutable::createFromFormat('d.m.Y', $value);
        if ($date !== false) {
            return $date;
        }

        return null;
    }
}
