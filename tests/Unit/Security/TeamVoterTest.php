<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security;

use App\Entity\Team;
use App\Entity\TeamShare;
use App\Entity\User;
use App\Repository\TeamShareRepository;
use App\Security\Voter\TeamVoter;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

class TeamVoterTest extends TestCase
{
    private TeamShareRepository&MockObject $shareRepo;
    private TeamVoter $voter;

    protected function setUp(): void
    {
        $this->shareRepo = $this->createMock(TeamShareRepository::class);
        $this->voter = new TeamVoter($this->shareRepo);
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

    private function userWithId(int $id, string $email = 'user@test.de', array $roles = ['ROLE_USER']): User
    {
        $user = new User($email, 'pw', $roles);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, $id);
        return $user;
    }

    public function testAdminCanViewAnyTeam(): void
    {
        $admin = $this->userWithId(1, 'admin@test.de', ['ROLE_USER', 'ROLE_ADMIN']);
        $team = $this->teamWithOwner(null);

        $result = $this->voter->vote($this->token($admin), $team, [TeamVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testOwnerCanViewOwnTeam(): void
    {
        $user = $this->userWithId(42);
        $team = $this->teamWithOwner($user);

        $this->shareRepo->expects($this->never())->method('findOneByTeamAndUser');

        $result = $this->voter->vote($this->token($user), $team, [TeamVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testSharedUserCanViewTeam(): void
    {
        $owner = $this->userWithId(1, 'owner@test.de');
        $shared = $this->userWithId(2, 'shared@test.de');
        $team = $this->teamWithOwner($owner);

        $this->shareRepo->method('findOneByTeamAndUser')->willReturn(new TeamShare($team, $shared));

        $result = $this->voter->vote($this->token($shared), $team, [TeamVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testSharedUserCanEditTeam(): void
    {
        $owner = $this->userWithId(1, 'owner@test.de');
        $shared = $this->userWithId(2, 'shared@test.de');
        $team = $this->teamWithOwner($owner);

        $this->shareRepo->method('findOneByTeamAndUser')->willReturn(new TeamShare($team, $shared));

        $result = $this->voter->vote($this->token($shared), $team, [TeamVoter::EDIT]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testSharedUserCannotDeleteTeam(): void
    {
        $owner = $this->userWithId(1, 'owner@test.de');
        $shared = $this->userWithId(2, 'shared@test.de');
        $team = $this->teamWithOwner($owner);

        $this->shareRepo->expects($this->never())->method('findOneByTeamAndUser');

        $result = $this->voter->vote($this->token($shared), $team, [TeamVoter::DELETE]);
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testSharedUserCannotManageTeam(): void
    {
        $owner = $this->userWithId(1, 'owner@test.de');
        $shared = $this->userWithId(2, 'shared@test.de');
        $team = $this->teamWithOwner($owner);

        $this->shareRepo->expects($this->never())->method('findOneByTeamAndUser');

        $result = $this->voter->vote($this->token($shared), $team, [TeamVoter::MANAGE]);
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testNonOwnerNonSharedCannotViewTeam(): void
    {
        $owner = $this->userWithId(1, 'owner@test.de');
        $other = $this->userWithId(2, 'other@test.de');
        $team = $this->teamWithOwner($owner);

        $this->shareRepo->method('findOneByTeamAndUser')->willReturn(null);

        $result = $this->voter->vote($this->token($other), $team, [TeamVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testOwnerCanManageTeam(): void
    {
        $user = $this->userWithId(42);
        $team = $this->teamWithOwner($user);

        $result = $this->voter->vote($this->token($user), $team, [TeamVoter::MANAGE]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testTeamWithoutOwnerDeniedForNonAdmin(): void
    {
        $user = $this->userWithId(1);
        $team = $this->teamWithOwner(null);

        $this->shareRepo->method('findOneByTeamAndUser')->willReturn(null);

        $result = $this->voter->vote($this->token($user), $team, [TeamVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testTeamWithoutOwnerAllowedForAdmin(): void
    {
        $admin = $this->userWithId(1, 'admin@test.de', ['ROLE_USER', 'ROLE_ADMIN']);
        $team = $this->teamWithOwner(null);

        $result = $this->voter->vote($this->token($admin), $team, [TeamVoter::EDIT]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testOwnerCanDeleteOwnTeam(): void
    {
        $user = $this->userWithId(42);
        $team = $this->teamWithOwner($user);

        $result = $this->voter->vote($this->token($user), $team, [TeamVoter::DELETE]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testAbstainsOnUnsupportedAttribute(): void
    {
        $admin = $this->userWithId(1, 'admin@test.de', ['ROLE_USER', 'ROLE_ADMIN']);
        $team = $this->teamWithOwner(null);

        $result = $this->voter->vote($this->token($admin), $team, ['UNSUPPORTED']);
        $this->assertSame(VoterInterface::ACCESS_ABSTAIN, $result);
    }
}
