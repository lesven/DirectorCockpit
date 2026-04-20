<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\UserService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:create-admin',
    description: 'Erstellt einen neuen Admin-Benutzer.',
)]
class CreateAdminCommand extends Command
{
    public function __construct(private readonly UserService $userService)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('email', null, InputOption::VALUE_OPTIONAL, 'E-Mail-Adresse des Admins')
            ->addOption('password', null, InputOption::VALUE_OPTIONAL, 'Passwort des Admins');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Admin-Benutzer erstellen');

        $email = $this->resolveStringOption($input->getOption('email'), fn () => $io->ask('E-Mail-Adresse'));
        $password = $this->resolveStringOption($input->getOption('password'), fn () => $io->askHidden('Passwort (min. 12 Zeichen, Groß/Klein/Zahl/Sonderzeichen)'));

        if ($email === null || $password === null) {
            $io->error('E-Mail und Passwort dürfen nicht leer sein.');
            return Command::FAILURE;
        }

        try {
            $user = $this->userService->createUser($email, $password, ['ROLE_USER', 'ROLE_ADMIN']);
        } catch (\InvalidArgumentException $e) {
            $io->error($e->getMessage());
            return Command::FAILURE;
        }

        $io->success(sprintf('Admin-Benutzer "%s" (ID %d) erfolgreich erstellt.', $user->getEmail(), $user->getId()));

        return Command::SUCCESS;
    }

    private function resolveStringOption(mixed $option, callable $ask): ?string
    {
        if (is_string($option) && $option !== '') {
            return $option;
        }
        $value = $ask();
        return is_string($value) && $value !== '' ? $value : null;
    }
}
