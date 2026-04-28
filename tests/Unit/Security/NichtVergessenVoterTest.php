<?php

declare(strict_types=1);

namespace App\Tests\Unit\Security;

use App\Entity\NichtVergessen;
use App\Entity\User;
use App\Security\Voter\NichtVergessenVoter;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

class NichtVergessenVoterTest extends TestCase
{
    private NichtVergessenVoter $voter;

    protected function setUp(): void
    {
        $this->voter = new NichtVergessenVoter();
    }

    private function token(User $user): UsernamePasswordToken
    {
        return new UsernamePasswordToken($user, 'main', $user->getRoles());
    }

    public function testAdminCanViewAnyNV(): void
    {
        $admin = new User('admin@test.de', 'pw', ['ROLE_USER', 'ROLE_ADMIN']);
        $nv = NichtVergessen::fromArray(['id' => 1, 'title' => 'Test', 'body' => '']);

        $result = $this->voter->vote($this->token($admin), $nv, [NichtVergessenVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testOwnerCanViewOwnNV(): void
    {
        $user = new User('user@test.de', 'pw', ['ROLE_USER']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 42);

        $nv = NichtVergessen::fromArray(['id' => 1, 'title' => 'Test', 'body' => '']);
        $nv->setCreatedBy($user);

        $result = $this->voter->vote($this->token($user), $nv, [NichtVergessenVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_GRANTED, $result);
    }

    public function testNonOwnerCannotViewNV(): void
    {
        $owner = new User('owner@test.de', 'pw', ['ROLE_USER']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($owner, 1);

        $other = new User('other@test.de', 'pw', ['ROLE_USER']);
        $ref->setValue($other, 2);

        $nv = NichtVergessen::fromArray(['id' => 1, 'title' => 'Test', 'body' => '']);
        $nv->setCreatedBy($owner);

        $result = $this->voter->vote($this->token($other), $nv, [NichtVergessenVoter::EDIT]);
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }

    public function testNVWithoutOwnerDeniedForNonAdmin(): void
    {
        $user = new User('user@test.de', 'pw', ['ROLE_USER']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 1);

        $nv = NichtVergessen::fromArray(['id' => 1, 'title' => 'Test', 'body' => '']);

        $result = $this->voter->vote($this->token($user), $nv, [NichtVergessenVoter::VIEW]);
        $this->assertSame(VoterInterface::ACCESS_DENIED, $result);
    }
}
