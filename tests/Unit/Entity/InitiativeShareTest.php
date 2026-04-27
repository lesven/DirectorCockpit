<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\InitiativeShare;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class InitiativeShareTest extends TestCase
{
    private function makeUser(int $id, string $email = 'user@test.de'): User
    {
        $user = new User($email, 'pw', ['ROLE_USER']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, $id);
        return $user;
    }

    public function testConstructorSetsFields(): void
    {
        $user = $this->makeUser(7, 'shared@test.de');
        $share = new InitiativeShare(42, $user);

        $this->assertSame(42, $share->getInitiativeId());
        $this->assertSame($user, $share->getSharedWith());
        $this->assertInstanceOf(\DateTimeImmutable::class, $share->getCreatedAt());
    }

    public function testCreatedAtIsNearNow(): void
    {
        $before = new \DateTimeImmutable();
        $share = new InitiativeShare(1, $this->makeUser(1));
        $after = new \DateTimeImmutable();

        $this->assertGreaterThanOrEqual($before, $share->getCreatedAt());
        $this->assertLessThanOrEqual($after, $share->getCreatedAt());
    }
}
