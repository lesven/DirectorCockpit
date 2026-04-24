<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security;

use App\Entity\Team;
use App\Entity\User;
use App\Security\Voter\TeamVoter;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

class TeamVoterTest extends TestCase
{
    private TeamVoter $voter;

    protected function setUp(): void
    {
        $this->voter = new TeamVoter();
    }

    private function token(User $user): UsernamePasswordToken
    {
        return new UsernamePasswordToken($user, 'main', $user->getRoles());
    }

    private function teamWithOwner(?User $owner): Team
    {
        $team = Team::fromArray(['id' => 1, 'name' => 'Test']);
        $team->setCreatedBy($owner);
        return $team;
    }

    public function testAdminCanViewAnyTeam(): void
    {
        $admin = new User('admin@test.de', 'pw', ['ROLE_USER', 'ROLE_ADMIN']);
        $team = $this->teamWithOwner(null);

        $result = $this->voter->vote($this->token($admin), $team, [TeamVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testOwnerCanViewOwnTeam(): void
    {
        $user = new User('user@test.de', 'pw', ['ROLE_USER']);
        // We need the User to have an ID — use reflection
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 42);

        $team = $this->teamWithOwner($user);

        $result = $this->voter->vote($this->token($user), $team, [TeamVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testNonOwnerCannotViewTeam(): void
    {
        $owner = new User('owner@test.de', 'pw', ['ROLE_USER']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($owner, 1);

        $other = new User('other@test.de', 'pw', ['ROLE_USER']);
        $ref->setValue($other, 2);

        $team = $this->teamWithOwner($owner);

        $result = $this->voter->vote($this->token($other), $team, [TeamVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testTeamWithoutOwnerDeniedForNonAdmin(): void
    {
        $user = new User('user@test.de', 'pw', ['ROLE_USER']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 1);

        $team = $this->teamWithOwner(null);

        $result = $this->voter->vote($this->token($user), $team, [TeamVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testTeamWithoutOwnerAllowedForAdmin(): void
    {
        $admin = new User('admin@test.de', 'pw', ['ROLE_USER', 'ROLE_ADMIN']);
        $team = $this->teamWithOwner(null);

        $result = $this->voter->vote($this->token($admin), $team, [TeamVoter::EDIT]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testOwnerCanDeleteOwnTeam(): void
    {
        $user = new User('user@test.de', 'pw', ['ROLE_USER']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 42);

        $team = $this->teamWithOwner($user);

        $result = $this->voter->vote($this->token($user), $team, [TeamVoter::DELETE]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testAbstainsOnUnsupportedAttribute(): void
    {
        $admin = new User('admin@test.de', 'pw', ['ROLE_USER', 'ROLE_ADMIN']);
        $team = $this->teamWithOwner(null);

        $result = $this->voter->vote($this->token($admin), $team, ['UNSUPPORTED']);
        $this->assertSame(VoterInterface::ACCESS_ABSTAIN, $result);
    }
}
