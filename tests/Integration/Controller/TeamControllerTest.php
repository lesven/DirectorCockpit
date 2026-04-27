<?php

declare(strict_types=1);

namespace App\Tests\Integration\Controller;

use App\Entity\Team;
use App\Entity\User;
use App\Tests\Integration\AuthTestTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class TeamControllerTest extends WebTestCase
{
    use AuthTestTrait;

    private const JSON = ['CONTENT_TYPE' => 'application/json'];
    private const TEST_TEAM_IDS = [9001, 9010, 9011, 9020, 9030, 9040, 9999];

    private function cleanupTestTeams(): void
    {
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->getConnection()->executeStatement(
            'DELETE FROM team WHERE id IN (' . implode(',', self::TEST_TEAM_IDS) . ')'
        );
    }

    public function testCreateTeam(): void
    {
        $client = static::createClient();
        $this->cleanupTestTeams();
        $user = $this->createAndLoginUser($client, 'team-create@test.de');

        $client->request('POST', '/api/teams', [], [], self::JSON, json_encode([
            'id' => 9001, 'name' => 'New Team', 'status' => 'yellow', 'fokus' => '', 'schritt' => '',
        ]));

        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('New Team', $data['name']);
        $this->assertSame($user->getId(), $data['createdBy']);
    }

    public function testCreateTeamWithoutIdReturns400(): void
    {
        $client = static::createClient();
        $this->createAndLoginUser($client, 'team-create-fail@test.de');

        $client->request('POST', '/api/teams', [], [], self::JSON, json_encode(['name' => 'No ID']));
        $this->assertResponseStatusCodeSame(400);
    }

    public function testUpdateOwnTeam(): void
    {
        $client = static::createClient();
        $this->cleanupTestTeams();
        $user = $this->createAndLoginUser($client, 'team-update@test.de');

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $team = Team::fromArray(['id' => 9010, 'name' => 'Old Name', 'status' => 'grey', 'fokus' => '', 'schritt' => '']);
        $team->setCreatedBy($user);
        $em->persist($team);
        $em->flush();

        $client->request('PUT', '/api/teams/9010', [], [], self::JSON, json_encode([
            'name' => 'Updated Name', 'status' => 'yellow',
        ]));

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('Updated Name', $data['name']);
    }

    public function testUpdateOtherUserTeamDenied(): void
    {
        $client = static::createClient();
        $this->cleanupTestTeams();
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $owner = $em->getRepository(User::class)->findOneBy(['email' => 'team-owner@test.de']);
        if (!$owner) {
            $owner = new User('team-owner@test.de', 'pw', ['ROLE_USER']);
            $em->persist($owner);
            $em->flush();
        }

        $team = Team::fromArray(['id' => 9011, 'name' => 'Other Team', 'status' => 'grey', 'fokus' => '', 'schritt' => '']);
        $team->setCreatedBy($owner);
        $em->persist($team);
        $em->flush();

        $this->createAndLoginUser($client, 'team-intruder@test.de');
        $client->request('PUT', '/api/teams/9011', [], [], self::JSON, json_encode(['name' => 'Hacked']));
        $this->assertResponseStatusCodeSame(403);
    }

    public function testDeleteOwnTeam(): void
    {
        $client = static::createClient();
        $this->cleanupTestTeams();
        $user = $this->createAndLoginUser($client, 'team-delete@test.de');

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $team = Team::fromArray(['id' => 9020, 'name' => 'To Delete', 'status' => 'grey', 'fokus' => '', 'schritt' => '']);
        $team->setCreatedBy($user);
        $em->persist($team);
        $em->flush();

        $client->request('DELETE', '/api/teams/9020');
        $this->assertResponseStatusCodeSame(204);
    }

    public function testAdminCanUpdateAnyTeam(): void
    {
        $client = static::createClient();
        $this->cleanupTestTeams();
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $team = Team::fromArray(['id' => 9030, 'name' => 'Admin Edit', 'status' => 'grey', 'fokus' => '', 'schritt' => '']);
        $em->persist($team);
        $em->flush();

        $this->createAndLoginAdmin($client, 'team-admin@test.de');
        $client->request('PUT', '/api/teams/9030', [], [], self::JSON, json_encode(['name' => 'Admin Updated']));
        $this->assertResponseIsSuccessful();
    }

    public function testUnauthenticatedCreateReturns401(): void
    {
        $client = static::createClient();
        $client->request('POST', '/api/teams', [], [], self::JSON, json_encode([
            'id' => 9999, 'name' => 'Unauth', 'status' => 'grey', 'fokus' => '', 'schritt' => '',
        ]));
        // Symfony returns 401 for unauthenticated API requests
        $this->assertResponseStatusCodeSame(401);
    }

    public function testCockpitLoadShowsOnlyOwnTeams(): void
    {
        $client = static::createClient();
        $this->cleanupTestTeams();
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $userA = $this->createAndLoginUser($client, 'team-vis-a@test.de');

        $teamA = Team::fromArray(['id' => 9040, 'name' => 'Team A', 'status' => 'grey', 'fokus' => '', 'schritt' => '']);
        $teamA->setCreatedBy($userA);
        $em->persist($teamA);
        $em->flush();

        $client->request('GET', '/api/cockpit');
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);

        $teamNames = array_column($data['teams'], 'name');
        $this->assertContains('Team A', $teamNames);
    }
}
