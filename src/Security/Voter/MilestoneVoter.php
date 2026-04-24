<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Milestone;
use App\Entity\Initiative;
use App\Entity\Team;
use App\Entity\User;
use App\Repository\InitiativeRepository;
use App\Repository\TeamRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Milestone>
 */
class MilestoneVoter extends Voter
{
    public const VIEW = 'MILESTONE_VIEW';
    public const EDIT = 'MILESTONE_EDIT';
    public const DELETE = 'MILESTONE_DELETE';

    public function __construct(
        private readonly InitiativeRepository $initiativeRepository,
        private readonly TeamRepository $teamRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE], true)
            && $subject instanceof Milestone;
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

        /** @var Milestone $subject */
        $initiativeId = $subject->toArray()['initiative'] ?? null;
        if ($initiativeId === null) {
            return false;
        }

        $initiative = $this->initiativeRepository->find($initiativeId);
        if (!$initiative instanceof Initiative) {
            return false;
        }

        $teamId = $initiative->toArray()['team'] ?? null;
        if ($teamId === null) {
            return false;
        }

        $team = $this->teamRepository->find($teamId);
        if (!$team instanceof Team) {
            return false;
        }

        $owner = $team->getCreatedBy();

        return $owner !== null && $owner->getId() === $user->getId();
    }
}
