<?php

namespace App\Entity;

use App\Domain\Model\Shared\Deadline;
use App\Enum\ProjectStatusEnum;
use App\Enum\StatusEnum;
use App\Repository\InitiativeRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: InitiativeRepository::class)]
#[ORM\Table(name: 'initiative')]
final class Initiative implements SyncableEntity
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

    #[ORM\Column(length: 550)]
    private string $schritt = '';

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $frist = null;

    #[ORM\Column(type: 'text')]
    private string $notiz = '';

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $businessValue = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $timeCriticality = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $riskReduction = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $jobSize = null;

    #[ORM\Column(name: 'customer_id', type: 'bigint', nullable: true)]
    private ?int $customer = null;

    /** @var Collection<int, Initiative> */
    #[ORM\ManyToMany(targetEntity: self::class)]
    #[ORM\JoinTable(
        name: 'initiative_blocked_by',
        joinColumns: [new ORM\JoinColumn(name: 'initiative_id', referencedColumnName: 'id', onDelete: 'CASCADE')],
        inverseJoinColumns: [new ORM\JoinColumn(name: 'blocked_by_initiative_id', referencedColumnName: 'id', onDelete: 'CASCADE')]
    )]
    private Collection $blockedBy;

    public function __construct()
    {
        $this->blockedBy = new ArrayCollection();
    }

    /** @return Collection<int, Initiative> */
    public function getBlockedBy(): Collection
    {
        return $this->blockedBy;
    }

    public function addBlockedBy(Initiative $blocker): void
    {
        if (!$this->blockedBy->contains($blocker)) {
            $this->blockedBy->add($blocker);
        }
    }

    public function clearBlockedBy(): void
    {
        $this->blockedBy->clear();
    }

    public function getWsjf(): ?float
    {
        if ($this->businessValue === null
            || $this->timeCriticality === null
            || $this->riskReduction === null
            || $this->jobSize === null
            || $this->jobSize <= 0
        ) {
            return null;
        }

        return round(($this->businessValue + $this->timeCriticality + $this->riskReduction) / $this->jobSize, 1);
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'team' => $this->team,
            'status' => $this->status->value,
            'projektstatus' => $this->projektstatus->value,
            'schritt' => $this->schritt,
            'frist' => $this->frist?->format('Y-m-d'),
            'notiz' => $this->notiz,
            'businessValue' => $this->businessValue,
            'timeCriticality' => $this->timeCriticality,
            'riskReduction' => $this->riskReduction,
            'jobSize' => $this->jobSize,
            'wsjf'     => $this->getWsjf(),
            'customer' => $this->customer,
            'blockedBy' => $this->blockedBy->map(fn(Initiative $b) => $b->getId())->getValues(),
        ];
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): static
    {
        $entity = new self();
        $entity->id = $data['id'];
        $entity->name = $data['name'] ?? '';
        $entity->team = $data['team'] ?? null;
        $entity->status = StatusEnum::tryFrom($data['status'] ?? '') ?? StatusEnum::Grey;
        $entity->projektstatus = ProjectStatusEnum::tryFrom($data['projektstatus'] ?? '') ?? ProjectStatusEnum::Ok;
        $entity->schritt = $data['schritt'] ?? '';
        $entity->frist = self::parseFrist($data['frist'] ?? null);
        $entity->notiz = $data['notiz'] ?? '';
        $entity->businessValue = $data['businessValue'] ?? null;
        $entity->timeCriticality = $data['timeCriticality'] ?? null;
        $entity->riskReduction = $data['riskReduction'] ?? null;
        $entity->jobSize    = $data['jobSize'] ?? null;
        $entity->customer   = isset($data['customer']) ? (int) $data['customer'] : null;

        return $entity;
    }

    /** @param array<string, mixed> $data */
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
        $this->frist = array_key_exists('frist', $data) ? self::parseFrist($data['frist']) : $this->frist;
        $this->notiz = $data['notiz'] ?? $this->notiz;

        foreach (['businessValue', 'timeCriticality', 'riskReduction', 'jobSize'] as $field) {
            if (array_key_exists($field, $data)) {
                $this->$field = $data[$field];
            }
        }
        $this->updateNullableInt('customer', $data);
    }

    /** @param array<string, mixed> $data */
    private function updateNullableInt(string $field, array $data): void
    {
        if (array_key_exists($field, $data)) {
            $this->$field = $data[$field] !== null ? (int) $data[$field] : null;
        }
    }

    private static function parseFrist(mixed $value): ?\DateTimeImmutable
    {
        return Deadline::fromMixed($value);
    }
}
