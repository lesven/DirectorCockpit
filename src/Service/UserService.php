<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserService
{
    private const MIN_PASSWORD_LENGTH = 12;

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {}

    /**
     * Creates a new user with the given email, plain-text password and roles.
     *
     * @param list<string> $roles
     * @throws \InvalidArgumentException when email or password is invalid, or email already exists
     */
    public function createUser(string $email, string $plainPassword, array $roles = ['ROLE_USER']): User
    {
        $this->validateEmail($email);
        $this->validatePassword($plainPassword);
        $this->validateRoles($roles);

        if ($this->userRepository->findByEmail($email) !== null) {
            throw new \InvalidArgumentException(sprintf('Ein Benutzer mit der E-Mail-Adresse "%s" existiert bereits.', $email));
        }

        // Temporary user object just to hash the password
        $user = new User($email, '', $roles);
        $hashed = $this->passwordHasher->hashPassword($user, $plainPassword);
        $user->setPassword($hashed);

        $this->userRepository->save($user, flush: true);

        return $user;
    }

    /**
     * Changes the role(s) of a user.
     *
     * @param list<string> $roles
     * @throws \InvalidArgumentException when roles are invalid
     */
    public function changeRoles(User $user, array $roles): User
    {
        $this->validateRoles($roles);
        $user->setRoles($roles);
        $this->userRepository->save($user, flush: true);

        return $user;
    }

    /**
     * Deletes a user. A user cannot delete themselves.
     *
     * @throws \InvalidArgumentException when the user tries to delete themselves
     */
    public function deleteUser(User $userToDelete, User $requestingUser): void
    {
        if ($userToDelete->getId() === $requestingUser->getId()) {
            throw new \InvalidArgumentException('Du kannst dein eigenes Konto nicht löschen.');
        }

        $this->userRepository->remove($userToDelete, flush: true);
    }

    /**
     * Changes the password of a user after verifying the current password.
     *
     * @throws \InvalidArgumentException when current password is wrong or new password is invalid
     */
    public function changePassword(User $user, string $currentPlain, string $newPlain): void
    {
        if (!$this->passwordHasher->isPasswordValid($user, $currentPlain)) {
            throw new \InvalidArgumentException('Das aktuelle Passwort ist falsch.');
        }

        $this->validatePassword($newPlain);

        $hashed = $this->passwordHasher->hashPassword($user, $newPlain);
        $user->setPassword($hashed);
        $this->userRepository->save($user, flush: true);
    }

    /**
     * Hashes a plain-text password for a given user (used by CLI command).
     */
    public function hashPassword(User $user, string $plainPassword): string
    {
        return $this->passwordHasher->hashPassword($user, $plainPassword);
    }

    // ─── Validation ─────────────────────────────────────────────────────────

    private function validateEmail(string $email): void
    {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Die E-Mail-Adresse hat ein ungültiges Format.');
        }
    }

    /**
     * Password policy: min 12 chars, at least one uppercase, one lowercase, one digit, one special char.
     */
    public function validatePassword(string $plain): void
    {
        if (strlen($plain) < self::MIN_PASSWORD_LENGTH) {
            throw new \InvalidArgumentException(sprintf('Das Passwort muss mindestens %d Zeichen lang sein.', self::MIN_PASSWORD_LENGTH));
        }
        if (!preg_match('/[A-Z]/', $plain)) {
            throw new \InvalidArgumentException('Das Passwort muss mindestens einen Großbuchstaben enthalten.');
        }
        if (!preg_match('/[a-z]/', $plain)) {
            throw new \InvalidArgumentException('Das Passwort muss mindestens einen Kleinbuchstaben enthalten.');
        }
        if (!preg_match('/[0-9]/', $plain)) {
            throw new \InvalidArgumentException('Das Passwort muss mindestens eine Ziffer enthalten.');
        }
        if (!preg_match('/[\W_]/', $plain)) {
            throw new \InvalidArgumentException('Das Passwort muss mindestens ein Sonderzeichen enthalten.');
        }
    }

    /**
     * @param list<string> $roles
     */
    private function validateRoles(array $roles): void
    {
        $allowed = ['ROLE_USER', 'ROLE_ADMIN'];
        foreach ($roles as $role) {
            if (!in_array($role, $allowed, true)) {
                throw new \InvalidArgumentException(sprintf('Ungültige Rolle "%s". Erlaubt: %s', $role, implode(', ', $allowed)));
            }
        }
    }
}
