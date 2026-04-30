<?php

declare(strict_types=1);

namespace App\Tests\Integration\Controller;

use App\Entity\Initiative;
use App\Entity\Team;
use App\Entity\User;
use App\Tests\Integration\AuthTestTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class InitiativeControllerTest extends WebTestCase
{
    use AuthTestTrait;

    private const JSON = ['CONTENT_TYPE' => 'application/json'];
    private const TEST_TEAM_IDS = [8001, 8002];
    private const TEST_INI_IDS = [8101, 8102, 8103, 8104, 8105];

    private function cleanup(): void
    {
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->getConnection()->executeStatement(
            'DELETE FROM initiative WHERE id IN (' . implode(',', self::TEST_INI_IDS) . ')'
        );
        $em->getConnection()->executeStatement(
            'DELETE FROM team WHERE id IN (' . implode(',', self::TEST_TEAM_IDS) . ')'
        );
    }

    private function createTeamForUser(User $user, int $id = 8001, string $name = 'User Team'): Team
    {
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $team = Team::fromArray(['id' => $id, 'name' => $name, 'status' => 'grey', 'fokus' => '', 'schritt' => '']);
        $team->setCreatedBy($user);
        $em->persist($team);
        $em->flush();

        return $team;
    }

    public function testNonAdminCannotCreateInitiativeWithoutTeam(): void
    {
        $client = static::createClient();
        $this->cleanup();
        $this->createAndLoginUser($client, 'ini-no-team@test.de');

        $client->request('POST', '/api/initiatives', [], [], self::JSON, json_encode([
            'id' => 8101, 'name' => 'Teamlose Initiative', 'status' => 'grey',
        ]));

        $this->assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('Team ist erforderlich.', $data['error']);
    }

    public function testNonAdminCanCreateInitiativeWithOwnTeam(): void
    {
        $client = static::createClient();
        $this->cleanup();
        $user = $this->createAndLoginUser($client, 'ini-own-team@test.de');
        $this->createTeamForUser($user);

        $client->request('POST', '/api/initiatives', [], [], self::JSON, json_encode([
            'id' => 8102, 'name' => 'Meine Initiative', 'team' => 8001, 'status' => 'grey',
        ]));

        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('Meine Initiative', $data['name']);
        $this->assertSame(8001, $data['team']);
    }

    public function testNonAdminCanUpdateInitiativeInOwnTeam(): void
    {
        $client = static::createClient();
        $this->cleanup();
        $user = $this->createAndLoginUser($client, 'ini-update@test.de');
        $this->createTeamForUser($user);

        // Erstelle Initiative via API
        $client->request('POST', '/api/initiatives', [], [], self::JSON, json_encode([
            'id' => 8103, 'name' => 'Update Test', 'team' => 8001, 'status' => 'grey',
        ]));
        $this->assertResponseStatusCodeSame(201);

        // Update Initiative
        $client->request('PUT', '/api/initiatives/8103', [], [], self::JSON, json_encode([
            'name' => 'Updated Name', 'status' => 'yellow',
        ]));

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('Updated Name', $data['name']);
    }

    public function testNonAdminCannotUpdateInitiativeInForeignTeam(): void
    {
        $client = static::createClient();
        $this->cleanup();

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);

        // Erstelle Owner + Team + Initiative
        $owner = $em->getRepository(User::class)->findOneBy(['email' => 'ini-owner@test.de']);
        if (!$owner) {
            $owner = new User('ini-owner@test.de', 'pw', ['ROLE_USER']);
            $em->persist($owner);
            $em->flush();
        }
        $team = $this->createTeamForUser($owner, 8002, 'Foreign Team');

        $initiative = Initiative::fromArray([
            'id' => 8104, 'name' => 'Foreign Ini', 'team' => 8002, 'status' => 'grey',
        ]);
        $em->persist($initiative);
        $em->flush();

        // Logge als anderer User ein
        $this->createAndLoginUser($client, 'ini-intruder@test.de');
        $client->request('PUT', '/api/initiatives/8104', [], [], self::JSON, json_encode([
            'name' => 'Hacked',
        ]));

        $this->assertResponseStatusCodeSame(403);
    }

    public function testAdminCanCreateInitiativeWithoutTeam(): void
    {
        $client = static::createClient();
        $this->cleanup();
        $this->createAndLoginAdmin($client, 'ini-admin@test.de');

        $client->request('POST', '/api/initiatives', [], [], self::JSON, json_encode([
            'id' => 8105, 'name' => 'Admin Teamlose Ini', 'status' => 'grey',
        ]));

        $this->assertResponseStatusCodeSame(201);
    }

    public function testNonAdminCannotCreateInitiativeInForeignTeam(): void
    {
        $client = static::createClient();
        $this->cleanup();

        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $owner = $em->getRepository(User::class)->findOneBy(['email' => 'ini-team-owner2@test.de']);
        if (!$owner) {
            $owner = new User('ini-team-owner2@test.de', 'pw', ['ROLE_USER']);
            $em->persist($owner);
            $em->flush();
        }
        $this->createTeamForUser($owner, 8002, 'Foreign Team');

        $this->createAndLoginUser($client, 'ini-foreign-create@test.de');
        $client->request('POST', '/api/initiatives', [], [], self::JSON, json_encode([
            'id' => 8101, 'name' => 'Stolen Ini', 'team' => 8002, 'status' => 'grey',
        ]));

        $this->assertResponseStatusCodeSame(403);
    }
}
