<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\User;
use PHPUnit\Framework\TestCase;

class UserTest extends TestCase
{
    private function makeUser(string $email = 'test@example.com', array $roles = ['ROLE_USER']): User
    {
        return new User($email, 'hashed_password', $roles);
    }

    public function testConstructorSetsFieldsCorrectly(): void
    {
        $user = $this->makeUser('foo@bar.com', ['ROLE_USER']);

        $this->assertSame('foo@bar.com', $user->getEmail());
        $this->assertSame('hashed_password', $user->getPassword());
        $this->assertContains('ROLE_USER', $user->getRoles());
        $this->assertInstanceOf(\DateTimeImmutable::class, $user->getCreatedAt());
    }

    public function testGetRolesAlwaysIncludesRoleUser(): void
    {
        // Even if no roles given, ROLE_USER is always present
        $user = new User('a@b.de', 'pw', []);
        $this->assertContains('ROLE_USER', $user->getRoles());
    }

    public function testGetRolesDeduplicatesRoleUser(): void
    {
        $user = new User('a@b.de', 'pw', ['ROLE_USER', 'ROLE_ADMIN']);
        $roles = $user->getRoles();
        $this->assertCount(array_unique($roles) === $roles ? count($roles) : count($roles), $roles);
        // No duplicates
        $this->assertSame(array_unique($roles), $roles);
    }

    public function testSetEmailChangesEmail(): void
    {
        $user = $this->makeUser();
        $user->setEmail('new@example.com');
        $this->assertSame('new@example.com', $user->getEmail());
    }

    public function testSetPasswordChangesPassword(): void
    {
        $user = $this->makeUser();
        $user->setPassword('new_hash');
        $this->assertSame('new_hash', $user->getPassword());
    }

    public function testSetRolesChangesRoles(): void
    {
        $user = $this->makeUser();
        $user->setRoles(['ROLE_USER', 'ROLE_ADMIN']);
        $this->assertContains('ROLE_ADMIN', $user->getRoles());
    }

    public function testIsAdminReturnsTrueForAdminRole(): void
    {
        $admin = new User('admin@example.com', 'pw', ['ROLE_USER', 'ROLE_ADMIN']);
        $this->assertTrue($admin->isAdmin());
    }

    public function testIsAdminReturnsFalseForRegularUser(): void
    {
        $user = $this->makeUser();
        $this->assertFalse($user->isAdmin());
    }

    public function testGetUserIdentifierReturnsEmail(): void
    {
        $user = $this->makeUser('id@test.com');
        $this->assertSame('id@test.com', $user->getUserIdentifier());
    }

    public function testEraseCredentialsDoesNothing(): void
    {
        $user = $this->makeUser();
        $user->eraseCredentials();
        // password should remain unchanged (no plain-text credential to erase)
        $this->assertSame('hashed_password', $user->getPassword());
    }

    public function testToArrayContainsExpectedKeys(): void
    {
        $user = $this->makeUser('arr@test.com', ['ROLE_USER', 'ROLE_ADMIN']);
        // Simulate ID by reflection (normally set by Doctrine)
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 42);

        $arr = $user->toArray();
        $this->assertSame(42, $arr['id']);
        $this->assertSame('arr@test.com', $arr['email']);
        $this->assertContains('ROLE_USER', $arr['roles']);
        $this->assertContains('ROLE_ADMIN', $arr['roles']);
        $this->assertArrayHasKey('createdAt', $arr);
    }
}
