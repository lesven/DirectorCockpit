<?php

declare(strict_types=1);

namespace App\Tests\Unit\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\UserService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserServiceTest extends TestCase
{
    private UserRepository&MockObject $userRepo;
    private UserPasswordHasherInterface&MockObject $hasher;
    private UserService $service;

    protected function setUp(): void
    {
        $this->userRepo = $this->createMock(UserRepository::class);
        $this->hasher = $this->createMock(UserPasswordHasherInterface::class);
        $this->hasher->method('hashPassword')->willReturn('hashed_pw');
        $this->hasher->method('isPasswordValid')->willReturnCallback(
            static fn (User $u, string $plain) => $plain === 'correct_password'
        );

        $this->service = new UserService($this->userRepo, $this->hasher);
    }

    // ─── createUser ──────────────────────────────────────────────────────────

    public function testCreateUserSuccessfully(): void
    {
        $this->userRepo->method('findByEmail')->willReturn(null);
        $this->userRepo->expects($this->once())->method('save');

        $user = $this->service->createUser('new@example.com', 'ValidPass1!Strong', ['ROLE_USER']);

        $this->assertSame('new@example.com', $user->getEmail());
        $this->assertSame('hashed_pw', $user->getPassword());
    }

    public function testCreateUserThrowsOnDuplicateEmail(): void
    {
        $existing = new User('dupe@example.com', 'pw');
        $this->userRepo->method('findByEmail')->willReturn($existing);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/bereits/');

        $this->service->createUser('dupe@example.com', 'ValidPass1!Strong');
    }

    public function testCreateUserThrowsOnInvalidEmail(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/E-Mail/');

        $this->service->createUser('not-an-email', 'ValidPass1!Strong');
    }

    public function testCreateUserThrowsOnInvalidRole(): void
    {
        $this->userRepo->method('findByEmail')->willReturn(null);
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Rolle/');

        $this->service->createUser('x@y.de', 'ValidPass1!Strong', ['ROLE_SUPERUSER']);
    }

    // ─── Password validation ──────────────────────────────────────────────────

    public function testPasswordValidationPassesForStrongPassword(): void
    {
        $this->service->validatePassword('SecureP@ss99!Z');
        $this->assertTrue(true); // no exception
    }

    public function testPasswordValidationFailsTooShort(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/12 Zeichen/');
        $this->service->validatePassword('Short1!');
    }

    public function testPasswordValidationFailsMissingUppercase(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Großbuchstaben/');
        $this->service->validatePassword('nocapital123!valid');
    }

    public function testPasswordValidationFailsMissingLowercase(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Kleinbuchstaben/');
        $this->service->validatePassword('NOLOWERCASE123!VVV');
    }

    public function testPasswordValidationFailsMissingDigit(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Ziffer/');
        $this->service->validatePassword('NoDigitHereAtAll!X');
    }

    public function testPasswordValidationFailsMissingSpecialChar(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/Sonderzeichen/');
        $this->service->validatePassword('NoSpecialChar99Abc');
    }

    // ─── changePassword ───────────────────────────────────────────────────────

    public function testChangePasswordSuccessfully(): void
    {
        $user = new User('x@y.de', 'hashed_pw');
        $this->userRepo->expects($this->once())->method('save');

        $this->service->changePassword($user, 'correct_password', 'NewValid!Pass99X');

        $this->assertSame('hashed_pw', $user->getPassword()); // hasher returns 'hashed_pw'
    }

    public function testChangePasswordThrowsOnWrongCurrentPassword(): void
    {
        $user = new User('x@y.de', 'hashed_pw');

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/falsch/');

        $this->service->changePassword($user, 'wrong_password', 'NewValid!Pass99X');
    }

    public function testChangePasswordThrowsOnWeakNewPassword(): void
    {
        $user = new User('x@y.de', 'hashed_pw');

        $this->expectException(\InvalidArgumentException::class);

        $this->service->changePassword($user, 'correct_password', 'weak');
    }

    // ─── changeRoles ─────────────────────────────────────────────────────────

    public function testChangeRolesSuccessfully(): void
    {
        $user = new User('x@y.de', 'pw', ['ROLE_USER']);
        $this->userRepo->expects($this->once())->method('save');

        $this->service->changeRoles($user, ['ROLE_USER', 'ROLE_ADMIN']);

        $this->assertTrue($user->isAdmin());
    }

    public function testChangeRolesThrowsOnInvalidRole(): void
    {
        $user = new User('x@y.de', 'pw');
        $this->expectException(\InvalidArgumentException::class);

        $this->service->changeRoles($user, ['ROLE_HACKER']);
    }

    // ─── deleteUser ───────────────────────────────────────────────────────────

    public function testDeleteUserSuccessfully(): void
    {
        $admin = new User('admin@x.de', 'pw', ['ROLE_USER', 'ROLE_ADMIN']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($admin, 1);

        $target = new User('user@x.de', 'pw');
        $ref->setValue($target, 2);

        $this->userRepo->expects($this->once())->method('remove');

        $this->service->deleteUser($target, $admin);
    }

    public function testDeleteUserThrowsWhenDeletingSelf(): void
    {
        $user = new User('self@x.de', 'pw');
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 99);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessageMatches('/eigenes Konto/');

        $this->service->deleteUser($user, $user);
    }
}
