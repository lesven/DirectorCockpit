<?php

namespace App\DataFixtures;

use App\Entity\Initiative;
use App\Entity\Team;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class DefaultDataFixture extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        /** @var array{teams: list<array<string,mixed>>, initiatives: list<array<string,mixed>>} $data */
        $data = json_decode(
            file_get_contents(__DIR__ . '/../../public/default_data.json'),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        foreach ($data['teams'] as $row) {
            $manager->persist(Team::fromArray($row));
        }

        foreach ($data['initiatives'] as $row) {
            $manager->persist(Initiative::fromArray($row));
        }

        $manager->flush();
    }
}
