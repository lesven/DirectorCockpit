<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\TeamShareRepository;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: TeamShareRepository::class)]
#[ORM\Table(name: 'team_share')]
#[ORM\UniqueConstraint(name: 'UNIQ_TEAM_SHARE', columns: ['team_id', 'shared_with_id'])]
class TeamShare
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private int $id;

    #[ORM\ManyToOne(targetEntity: Team::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Team $team;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $sharedWith;

    #[ORM\Column(type: 'datetime_immutable')]
    private DateTimeImmutable $createdAt;

    public function __construct(Team $team, User $sharedWith)
    {
        $this->team = $team;
        $this->sharedWith = $sharedWith;
        $this->createdAt = new DateTimeImmutable();
    }

    public function getId(): int
    {
        return $this->id;
    }

    public function getTeam(): Team
    {
        return $this->team;
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
