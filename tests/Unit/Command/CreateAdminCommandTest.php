<?php

declare(strict_types=1);

namespace App\Tests\Unit\Command;

use App\Command\CreateAdminCommand;
use App\Entity\User;
use App\Service\UserService;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Application;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

class CreateAdminCommandTest extends TestCase
{
    private UserService&MockObject $userService;
    private CommandTester $tester;

    protected function setUp(): void
    {
        $this->userService = $this->createMock(UserService::class);
        $command = new CreateAdminCommand($this->userService);

        $app = new Application();
        $app->add($command);
        $this->tester = new CommandTester($app->find('app:create-admin'));
    }

    public function testCommandCreatesAdminWithOptions(): void
    {
        $user = new User('admin@test.de', 'hashed', ['ROLE_USER', 'ROLE_ADMIN']);
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 1);

        $this->userService
            ->expects($this->once())
            ->method('createUser')
            ->with('admin@test.de', 'SecureP@ss99!Z', ['ROLE_USER', 'ROLE_ADMIN'])
            ->willReturn($user);

        $exitCode = $this->tester->execute([
            '--email' => 'admin@test.de',
            '--password' => 'SecureP@ss99!Z',
        ]);

        $this->assertSame(Command::SUCCESS, $exitCode);
        $this->assertStringContainsString('erfolgreich', $this->tester->getDisplay());
    }

    public function testCommandFailsWhenUserServiceThrows(): void
    {
        $this->userService
            ->method('createUser')
            ->willThrowException(new \InvalidArgumentException('E-Mail bereits vergeben'));

        $exitCode = $this->tester->execute([
            '--email' => 'dupe@test.de',
            '--password' => 'SecureP@ss99!Z',
        ]);

        $this->assertSame(Command::FAILURE, $exitCode);
        $this->assertStringContainsString('E-Mail bereits vergeben', $this->tester->getDisplay());
    }
}
