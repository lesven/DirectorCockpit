<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Initiative;
use App\Entity\Team;
use App\Entity\User;
use App\Repository\InitiativeShareRepository;
use App\Repository\TeamRepository;
use App\Repository\TeamShareRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Initiative>
 */
class InitiativeVoter extends Voter
{
    public const VIEW = 'INITIATIVE_VIEW';
    public const EDIT = 'INITIATIVE_EDIT';
    public const DELETE = 'INITIATIVE_DELETE';
    /** Only team owner and admin can manage initiative shares */
    public const MANAGE = 'INITIATIVE_MANAGE';

    public function __construct(
        private readonly TeamRepository $teamRepository,
        private readonly TeamShareRepository $teamShareRepository,
        private readonly InitiativeShareRepository $initiativeShareRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE, self::MANAGE], true)
            && $subject instanceof Initiative;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        /** @var Initiative $subject */
        [$team, $isTeamOwner] = $this->resolveTeamOwnership($subject, $user);

        // MANAGE is restricted to team owner (and admin, already handled)
        if ($attribute === self::MANAGE) {
            return $isTeamOwner;
        }

        if ($isTeamOwner) {
            return true;
        }

        return $this->hasSharedAccess($subject, $team, $user);
    }

    /** @return array{?Team, bool} */
    private function resolveTeamOwnership(Initiative $initiative, User $user): array
    {
        $teamId = $initiative->toArray()['team'] ?? null;
        if ($teamId === null) {
            return [null, false];
        }

        $team = $this->teamRepository->find($teamId);
        if (!$team instanceof Team) {
            return [null, false];
        }

        $owner = $team->getCreatedBy();
        $isOwner = $owner !== null && $owner->getId() === $user->getId();

        return [$team, $isOwner];
    }

    private function hasSharedAccess(Initiative $initiative, ?Team $team, User $user): bool
    {
        if ($team instanceof Team && $this->teamShareRepository->findOneByTeamAndUser($team, $user) !== null) {
            return true;
        }

        return $this->initiativeShareRepository->findOneByInitiativeIdAndUser($initiative->getId(), $user) !== null;
    }
}
