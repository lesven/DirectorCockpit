<?php

declare(strict_types=1);

namespace App\Tests\Integration\Controller;

use App\Entity\Initiative;
use App\Entity\InitiativeShare;
use App\Entity\Team;
use App\Entity\TeamShare;
use App\Entity\User;
use App\Tests\Integration\AuthTestTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class InitiativeShareControllerTest extends WebTestCase
{
    use AuthTestTrait;

    private function getEm(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function createTeamWithOwner(User $owner, string $name = 'IS-Test-Team'): Team
    {
        $team = Team::fromArray(['id' => random_int(800000, 899999), 'name' => $name]);
        $team->setCreatedBy($owner);
        $em = $this->getEm();
        $em->persist($team);
        $em->flush();
        return $team;
    }

    private function createInitiative(int $teamId): Initiative
    {
        $ini = Initiative::fromArray([
            'id' => random_int(700000, 799999),
            'name' => 'Test-Initiative',
            'team' => $teamId,
            'status' => 'grey',
            'projektstatus' => 'ok',
            'schritt' => '',
        ]);
        $em = $this->getEm();
        $em->persist($ini);
        $em->flush();
        return $ini;
    }

    /** Test: Owner kann Shares einer Initiative auflisten */
    public function testOwnerCanListInitiativeShares(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'is-owner-list@test.de', 'pw');
        $team = $this->createTeamWithOwner($owner);
        $ini = $this->createInitiative($team->getId());

        $client->request('GET', "/api/initiatives/{$ini->getId()}/shares");
        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    /** Test: Owner kann User zur Initiative hinzufügen */
    public function testOwnerCanAddInitiativeShare(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'is-owner-add@test.de', 'pw');
        $target = $this->createAndLoginUser($client, 'is-target-add@test.de', 'pw');
        $client->loginUser($owner);

        $team = $this->createTeamWithOwner($owner);
        $ini = $this->createInitiative($team->getId());

        $client->request('POST', "/api/initiatives/{$ini->getId()}/shares", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['userId' => $target->getId()]));
        $this->assertResponseStatusCodeSame(201);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame($target->getId(), $data['id']);
    }

    /** Test: Doppeltes Teilen gibt 409 */
    public function testDuplicateInitiativeShareReturnsConflict(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'is-owner-dup@test.de', 'pw');
        $target = $this->createAndLoginUser($client, 'is-target-dup@test.de', 'pw');
        $client->loginUser($owner);

        $team = $this->createTeamWithOwner($owner);
        $ini = $this->createInitiative($team->getId());

        $client->request('POST', "/api/initiatives/{$ini->getId()}/shares", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['userId' => $target->getId()]));
        $this->assertResponseStatusCodeSame(201);

        $client->request('POST', "/api/initiatives/{$ini->getId()}/shares", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['userId' => $target->getId()]));
        $this->assertResponseStatusCodeSame(409);
    }

    /** Test: Geteilter User (nur Initiative-Share ohne Team-Share) sieht Initiative im Cockpit */
    public function testUserWithInitiativeShareOnlySeesInitiativeInCockpit(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'is-owner-cockpit@test.de', 'pw');
        $shared = $this->createAndLoginUser($client, 'is-shared-cockpit@test.de', 'pw');

        $team = $this->createTeamWithOwner($owner);
        $ini = $this->createInitiative($team->getId());

        // Only initiative share, no team share
        $share = new InitiativeShare($ini->getId(), $shared);
        $this->getEm()->persist($share);
        $this->getEm()->flush();

        $client->loginUser($shared);
        $client->request('GET', '/api/cockpit');
        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $iniIds = array_column($data['initiatives'], 'id');
        $this->assertContains($ini->getId(), $iniIds);

        // Team should NOT appear (only initiative is shared, not the team)
        $teamIds = array_column($data['teams'], 'id');
        $this->assertNotContains($team->getId(), $teamIds);
    }

    /** Test: User mit Team-Share kann Initiative-Edit-Endpoint aufrufen */
    public function testUserWithTeamShareCanEditInitiative(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'is-owner-edit@test.de', 'pw');
        $shared = $this->createAndLoginUser($client, 'is-shared-edit@test.de', 'pw');

        $team = $this->createTeamWithOwner($owner);
        $ini = $this->createInitiative($team->getId());

        $teamShare = new TeamShare($team, $shared);
        $this->getEm()->persist($teamShare);
        $this->getEm()->flush();

        $client->loginUser($shared);
        $client->request('PUT', "/api/initiatives/{$ini->getId()}", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['name' => 'Updated Name']));
        $this->assertResponseIsSuccessful();
    }

    /** Test: User ohne Share kann Initiative NICHT bearbeiten (403) */
    public function testUserWithoutShareCannotEditInitiative(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'is-owner-noauth@test.de', 'pw');
        $other = $this->createAndLoginUser($client, 'is-other-noauth@test.de', 'pw');

        $team = $this->createTeamWithOwner($owner);
        $ini = $this->createInitiative($team->getId());

        $client->loginUser($other);
        $client->request('PUT', "/api/initiatives/{$ini->getId()}", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['name' => 'Hacked Name']));
        $this->assertResponseStatusCodeSame(403);
    }

    /** Test: Owner kann Share entfernen */
    public function testOwnerCanRemoveInitiativeShare(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'is-owner-rem@test.de', 'pw');
        $target = $this->createAndLoginUser($client, 'is-target-rem@test.de', 'pw');
        $client->loginUser($owner);

        $team = $this->createTeamWithOwner($owner);
        $ini = $this->createInitiative($team->getId());

        $share = new InitiativeShare($ini->getId(), $target);
        $this->getEm()->persist($share);
        $this->getEm()->flush();

        $client->request('DELETE', "/api/initiatives/{$ini->getId()}/shares/{$target->getId()}");
        $this->assertResponseStatusCodeSame(204);
    }
}
