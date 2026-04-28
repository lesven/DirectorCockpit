<?php

declare(strict_types=1);

namespace App\Tests\Integration\Controller;

use App\Entity\Team;
use App\Entity\TeamShare;
use App\Entity\User;
use App\Tests\Integration\AuthTestTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class TeamShareControllerTest extends WebTestCase
{
    use AuthTestTrait;

    private function getEm(): EntityManagerInterface
    {
        return static::getContainer()->get(EntityManagerInterface::class);
    }

    private function createTeamWithOwner(User $owner, string $name = 'Share-Test-Team'): Team
    {
        $team = Team::fromArray(['id' => random_int(900000, 999999), 'name' => $name]);
        $team->setCreatedBy($owner);
        $em = $this->getEm();
        $em->persist($team);
        $em->flush();
        return $team;
    }

    /** Test: Owner kann Shares auflisten */
    public function testOwnerCanListShares(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-list@test.de', 'pw');
        $team = $this->createTeamWithOwner($owner);

        $client->request('GET', "/api/teams/{$team->getId()}/shares");
        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertIsArray($data);
        $this->assertEmpty($data);
    }

    /** Test: Owner kann User hinzufügen */
    public function testOwnerCanAddShare(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-add@test.de', 'pw');
        $target = $this->createAndLoginUser($client, 'ts-target-add@test.de', 'pw');
        // Re-login as owner after creating target
        $client->loginUser($owner);

        $team = $this->createTeamWithOwner($owner);

        $client->request('POST', "/api/teams/{$team->getId()}/shares", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['userId' => $target->getId()]));
        $this->assertResponseStatusCodeSame(201);

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame($target->getId(), $data['id']);
        $this->assertSame($target->getEmail(), $data['email']);
    }

    /** Test: Doppeltes Teilen gibt 409 */
    public function testDuplicateShareReturnsConflict(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-dup@test.de', 'pw');
        $target = $this->createAndLoginUser($client, 'ts-target-dup@test.de', 'pw');
        $client->loginUser($owner);

        $team = $this->createTeamWithOwner($owner);

        // First share
        $client->request('POST', "/api/teams/{$team->getId()}/shares", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['userId' => $target->getId()]));
        $this->assertResponseStatusCodeSame(201);

        // Second share (duplicate)
        $client->request('POST', "/api/teams/{$team->getId()}/shares", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['userId' => $target->getId()]));
        $this->assertResponseStatusCodeSame(409);
    }

    /** Test: Owner kann sich selbst nicht teilen (400) */
    public function testOwnerCannotShareWithSelf(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-self@test.de', 'pw');
        $team = $this->createTeamWithOwner($owner);

        $client->request('POST', "/api/teams/{$team->getId()}/shares", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['userId' => $owner->getId()]));
        $this->assertResponseStatusCodeSame(400);
    }

    /** Test: Nicht-Owner kann keine Shares hinzufügen (403) */
    public function testNonOwnerCannotAddShare(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-perm@test.de', 'pw');
        $other = $this->createAndLoginUser($client, 'ts-other-perm@test.de', 'pw');
        $target = $this->createAndLoginUser($client, 'ts-target-perm@test.de', 'pw');

        $team = $this->createTeamWithOwner($owner);

        // Share team with other user so they have VIEW access
        $share = new TeamShare($team, $other);
        $this->getEm()->persist($share);
        $this->getEm()->flush();

        // Login as other (has VIEW/EDIT but not MANAGE)
        $client->loginUser($other);

        $client->request('POST', "/api/teams/{$team->getId()}/shares", [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['userId' => $target->getId()]));
        $this->assertResponseStatusCodeSame(403);
    }

    /** Test: Owner kann Share entfernen */
    public function testOwnerCanRemoveShare(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-remove@test.de', 'pw');
        $target = $this->createAndLoginUser($client, 'ts-target-remove@test.de', 'pw');
        $client->loginUser($owner);

        $team = $this->createTeamWithOwner($owner);
        $share = new TeamShare($team, $target);
        $this->getEm()->persist($share);
        $this->getEm()->flush();

        $client->request('DELETE', "/api/teams/{$team->getId()}/shares/{$target->getId()}");
        $this->assertResponseStatusCodeSame(204);

        // Verify removed
        $client->request('GET', "/api/teams/{$team->getId()}/shares");
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertEmpty($data);
    }

    /** Test: Nicht-existierende Freigabe entfernen gibt 404 */
    public function testRemoveNonExistentShareReturnsNotFound(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-404@test.de', 'pw');
        $target = $this->createAndLoginUser($client, 'ts-target-404@test.de', 'pw');
        $client->loginUser($owner);

        $team = $this->createTeamWithOwner($owner);

        $client->request('DELETE', "/api/teams/{$team->getId()}/shares/{$target->getId()}");
        $this->assertResponseStatusCodeSame(404);
    }

    /** Test: Geteilter User sieht Team im Cockpit */
    public function testSharedUserSeesTeamInCockpit(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-cockpit@test.de', 'pw');
        $shared = $this->createAndLoginUser($client, 'ts-shared-cockpit@test.de', 'pw');

        $team = $this->createTeamWithOwner($owner);

        // Share team
        $share = new TeamShare($team, $shared);
        $this->getEm()->persist($share);
        $this->getEm()->flush();

        // Login as shared user and check cockpit
        $client->loginUser($shared);
        $client->request('GET', '/api/cockpit');
        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $teamIds = array_column($data['teams'], 'id');
        $this->assertContains($team->getId(), $teamIds);
    }

    /** Test: Nicht-geteilter User sieht fremdes Team NICHT im Cockpit */
    public function testUnsharedUserDoesNotSeeTeamInCockpit(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-noshare@test.de', 'pw');
        $other = $this->createAndLoginUser($client, 'ts-other-noshare@test.de', 'pw');

        $team = $this->createTeamWithOwner($owner);

        $client->loginUser($other);
        $client->request('GET', '/api/cockpit');
        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $teamIds = array_column($data['teams'], 'id');
        $this->assertNotContains($team->getId(), $teamIds);
    }

    /** Test: Team-Detail-Endpoint liefert isOwner=true für Owner */
    public function testTeamDetailEndpointReturnsIsOwnerTrue(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-detail@test.de', 'pw');
        $team = $this->createTeamWithOwner($owner);

        $client->request('GET', "/api/teams/{$team->getId()}");
        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('team', $data);
        $this->assertArrayHasKey('shares', $data);
        $this->assertArrayHasKey('isOwner', $data);
        $this->assertTrue($data['isOwner']);
    }

    /** Test: Geteilter User hat isOwner=false am Team-Detail-Endpoint */
    public function testTeamDetailEndpointReturnsIsOwnerFalseForSharedUser(): void
    {
        $client = static::createClient();
        $owner = $this->createAndLoginUser($client, 'ts-owner-detail2@test.de', 'pw');
        $shared = $this->createAndLoginUser($client, 'ts-shared-detail2@test.de', 'pw');

        $team = $this->createTeamWithOwner($owner);
        $share = new TeamShare($team, $shared);
        $this->getEm()->persist($share);
        $this->getEm()->flush();

        $client->loginUser($shared);
        $client->request('GET', "/api/teams/{$team->getId()}");
        $this->assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertFalse($data['isOwner']);
    }
}
