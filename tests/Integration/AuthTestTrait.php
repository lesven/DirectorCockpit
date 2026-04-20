<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;

/**
 * Provides helpers for creating and authenticating test users in integration tests.
 * Uses the 'plaintext' password hasher (configured for APP_ENV=test) so no hashing overhead.
 */
trait AuthTestTrait
{
    /**
     * Creates a user in the DB and logs in the given client as that user.
     * Uses Symfony's loginUser() (no HTTP request needed).
     *
     * @param list<string> $roles
     */
    protected function createAndLoginUser(
        KernelBrowser $client,
        string $email = 'user@test.de',
        string $plainPassword = 'testpassword',
        array $roles = ['ROLE_USER'],
    ): User {
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);

        // Re-use existing user if already created (e.g. when full suite runs in one DB)
        $user = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($user === null) {
            $user = new User($email, $plainPassword, $roles);
            $em->persist($user);
            $em->flush();
        } else {
            // Update roles if changed
            $user->setRoles($roles);
            $em->flush();
        }

        $client->loginUser($user);

        return $user;
    }

    /**
     * Creates an admin user and logs in.
     */
    protected function createAndLoginAdmin(KernelBrowser $client, string $email = 'admin@test.de'): User
    {
        return $this->createAndLoginUser($client, $email, 'adminpassword', ['ROLE_USER', 'ROLE_ADMIN']);
    }
}
