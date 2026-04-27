<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\InitiativeShareRepository;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: InitiativeShareRepository::class)]
#[ORM\Table(name: 'initiative_share')]
#[ORM\UniqueConstraint(name: 'UNIQ_INITIATIVE_SHARE', columns: ['initiative', 'shared_with_id'])]
class InitiativeShare
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private int $id;

    #[ORM\Column(type: 'bigint')]
    private int $initiative;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $sharedWith;

    #[ORM\Column(type: 'datetime_immutable')]
    private DateTimeImmutable $createdAt;

    public function __construct(int $initiativeId, User $sharedWith)
    {
        $this->initiative = $initiativeId;
        $this->sharedWith = $sharedWith;
        $this->createdAt = new DateTimeImmutable();
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getInitiativeId(): int
    {
        return $this->initiative;
    }

    public function getSharedWith(): User
    {
        return $this->sharedWith;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }
}
