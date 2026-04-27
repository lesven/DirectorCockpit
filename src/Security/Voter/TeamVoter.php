<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Team;
use App\Entity\User;
use App\Repository\TeamShareRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Team>
 */
class TeamVoter extends Voter
{
    public const VIEW = 'TEAM_VIEW';
    public const EDIT = 'TEAM_EDIT';
    public const DELETE = 'TEAM_DELETE';
    /** Only owner and admin can manage shares, delete the team, etc. */
    public const MANAGE = 'TEAM_MANAGE';

    public function __construct(private readonly TeamShareRepository $teamShareRepository)
    {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE, self::MANAGE], true)
            && $subject instanceof Team;
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

        /** @var Team $subject */
        $owner = $subject->getCreatedBy();
        $isOwner = $owner !== null && $owner->getId() === $user->getId();

        // DELETE and MANAGE are restricted to owner (and admin, already handled above)
        if ($attribute === self::DELETE || $attribute === self::MANAGE) {
            return $isOwner;
        }

        // VIEW and EDIT: owner or shared user
        if ($isOwner) {
            return true;
        }

        return $this->teamShareRepository->findOneByTeamAndUser($subject, $user) !== null;
    }
}
