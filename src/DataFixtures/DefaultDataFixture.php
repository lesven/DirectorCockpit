<?php

namespace App\DataFixtures;

use App\Entity\Customer;
use App\Entity\Initiative;
use App\Entity\Team;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\UserService;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class DefaultDataFixture extends Fixture
{
    public function __construct(
        private readonly UserService $userService,
        private readonly UserRepository $userRepository,
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        /** @var array{kunden?: list<array<string,mixed>>, teams: list<array<string,mixed>>, initiatives: list<array<string,mixed>>} $data */
        $data = json_decode(
            file_get_contents(__DIR__ . '/../../public/default_data.json'),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($data['kunden'] ?? [] as $row) {
            $manager->persist(Customer::fromArray($row));
        }

        foreach ($data['teams'] as $row) {
            $manager->persist(Team::fromArray($row));
        }

        foreach ($data['initiatives'] as $row) {
            $manager->persist(Initiative::fromArray($row));
        }

        // Seed E2E test admin user (for automated tests)
        $e2eEmail = 'e2e-admin@test.internal';
        if ($this->userRepository->findByEmail($e2eEmail) === null) {
            $e2eAdmin = $this->userService->createUser($e2eEmail, 'E2eAdmin!2025X', ['ROLE_USER', 'ROLE_ADMIN']);
            $manager->persist($e2eAdmin);
        }

        $manager->flush();
    }
}
