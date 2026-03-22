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
        $teams = [
            ['id' => 1, 'name' => 'IT Service', 'sub' => 'Endgeräte & User', 'status' => 'green', 'fokus' => '', 'schritt' => ''],
            ['id' => 2, 'name' => 'IT Infrastruktur', 'sub' => 'RZ, Netzwerk, Betrieb', 'status' => 'green', 'fokus' => '', 'schritt' => ''],
            ['id' => 3, 'name' => 'DevOps', 'sub' => 'K8s, GitLab, Azure DevOps', 'status' => 'yellow', 'fokus' => '', 'schritt' => ''],
            ['id' => 4, 'name' => 'Konzernapplikationen', 'sub' => 'Navision, MSSQL, CRM', 'status' => 'green', 'fokus' => '', 'schritt' => ''],
        ];

        foreach ($teams as $data) {
            $manager->persist(Team::fromArray($data));
        }

        $initiatives = [
            ['id' => 1, 'name' => 'Update Azure DevOps', 'team' => 3, 'status' => 'yellow', 'projektstatus' => 'ok', 'schritt' => 'Versionsplanung abschließen', 'frist' => '', 'notiz' => ''],
            ['id' => 2, 'name' => 'Update GitLab', 'team' => 3, 'status' => 'yellow', 'projektstatus' => 'ok', 'schritt' => 'Upgrade-Pfad definieren', 'frist' => '', 'notiz' => ''],
            ['id' => 3, 'name' => 'Onboarding SVA Fortinet', 'team' => 2, 'status' => 'green', 'projektstatus' => 'ok', 'schritt' => 'Kick-off durchführen', 'frist' => '', 'notiz' => ''],
            ['id' => 4, 'name' => 'Onboarding SVA MSSQL', 'team' => 4, 'status' => 'green', 'projektstatus' => 'ok', 'schritt' => 'Anforderungen & SLA klären', 'frist' => '', 'notiz' => ''],
        ];

        foreach ($initiatives as $data) {
            $manager->persist(Initiative::fromArray($data));
        }

        $manager->flush();
    }
}
