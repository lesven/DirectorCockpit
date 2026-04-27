<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\NichtVergessen;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * @extends Voter<string, NichtVergessen>
 */
class NichtVergessenVoter extends Voter
{
    public const VIEW = 'NV_VIEW';
    public const EDIT = 'NV_EDIT';
    public const DELETE = 'NV_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE], true)
            && $subject instanceof NichtVergessen;
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

        /** @var NichtVergessen $subject */
        $owner = $subject->getCreatedBy();

        return $owner !== null && $owner->getId() === $user->getId();
    }
}
