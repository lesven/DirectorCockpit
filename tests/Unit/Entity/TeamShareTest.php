<?php

declare(strict_types=1);

namespace App\Tests\Unit\Entity;

use App\Entity\Team;
use App\Entity\TeamShare;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class TeamShareTest extends TestCase
{
    private function makeUser(int $id, string $email = 'user@test.de'): User
    {
        $user = new User($email, 'pw', ['ROLE_USER']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, $id);
        return $user;
    }

    private function makeTeam(int $id): Team
    {
        return Team::fromArray(['id' => $id, 'name' => 'Test Team']);
    }

    public function testConstructorSetsFields(): void
    {
        $team = $this->makeTeam(10);
        $user = $this->makeUser(7, 'shared@test.de');
        $share = new TeamShare($team, $user);

        $this->assertSame($team, $share->getTeam());
        $this->assertSame($user, $share->getSharedWith());
        $this->assertInstanceOf(\DateTimeImmutable::class, $share->getCreatedAt());
    }

    public function testCreatedAtIsNearNow(): void
    {
        $before = new \DateTimeImmutable();
        $share = new TeamShare($this->makeTeam(1), $this->makeUser(1));
        $after = new \DateTimeImmutable();

        $this->assertGreaterThanOrEqual($before, $share->getCreatedAt());
        $this->assertLessThanOrEqual($after, $share->getCreatedAt());
    }
}
