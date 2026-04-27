<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Risk;
use App\Entity\Initiative;
use App\Entity\Team;
use App\Entity\User;
use App\Repository\InitiativeRepository;
use App\Repository\InitiativeShareRepository;
use App\Repository\TeamRepository;
use App\Repository\TeamShareRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, Risk>
 */
class RiskVoter extends Voter
{
    public const VIEW = 'RISK_VIEW';
    public const EDIT = 'RISK_EDIT';
    public const DELETE = 'RISK_DELETE';

    public function __construct(
        private readonly InitiativeRepository $initiativeRepository,
        private readonly TeamRepository $teamRepository,
        private readonly TeamShareRepository $teamShareRepository,
        private readonly InitiativeShareRepository $initiativeShareRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE], true)
            && $subject instanceof Risk;
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

        /** @var Risk $subject */
        $initiativeId = $subject->toArray()['initiative'] ?? null;
        if ($initiativeId === null) {
            return false;
        }

        $initiative = $this->initiativeRepository->find($initiativeId);
        if (!$initiative instanceof Initiative) {
            return false;
        }

        return $this->hasAccessViaInitiative($initiative, (int) $initiativeId, $user);
    }

    private function hasAccessViaInitiative(Initiative $initiative, int $initiativeId, User $user): bool
    {
        $teamId = $initiative->toArray()['team'] ?? null;

        if ($teamId !== null) {
            $team = $this->teamRepository->find($teamId);
            if ($team instanceof Team) {
                $owner = $team->getCreatedBy();
                if ($owner !== null && $owner->getId() === $user->getId()) {
                    return true;
                }
                if ($this->teamShareRepository->findOneByTeamAndUser($team, $user) !== null) {
                    return true;
                }
            }
        }

        return $this->initiativeShareRepository->findOneByInitiativeIdAndUser($initiativeId, $user) !== null;
    }
}
