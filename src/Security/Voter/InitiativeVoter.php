<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Initiative;
use App\Entity\Team;
use App\Entity\User;
use App\Repository\TeamRepository;
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

    public function __construct(private readonly TeamRepository $teamRepository)
    {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE], true)
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
        $teamId = $subject->toArray()['team'] ?? null;
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
