<?php

declare(strict_types=1);

namespace App\Tests\Integration\Controller;

use App\Tests\Integration\AuthTestTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class AdminControllerTest extends WebTestCase
{
    use AuthTestTrait;

    private function adminPayload(string $email = 'new@test.de', string $password = 'NewStrong!Pass99Z'): string
    {
        return json_encode(['email' => $email, 'password' => $password, 'roles' => ['ROLE_USER']]);
    }

    // ─── GET /api/admin/users ─────────────────────────────────────────────────

    public function testListUsersAsAdmin(): void
    {
        $client = static::createClient();
        $this->createAndLoginAdmin($client, 'listadmin@test.de');

        $client->request('GET', '/api/admin/users');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertIsArray($data);
        // At least the admin we just created
        $this->assertNotEmpty($data);
    }

    public function testListUsersAsRegularUserReturns403(): void
    {
        $client = static::createClient();
        $this->createAndLoginUser($client, 'regular@test.de', 'pw');

        $client->request('GET', '/api/admin/users');

        $this->assertResponseStatusCodeSame(403);
    }

    public function testListUsersUnauthenticatedReturns401(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/admin/users');

        $this->assertResponseStatusCodeSame(401);
    }

    // ─── POST /api/admin/users ────────────────────────────────────────────────

    public function testCreateUserAsAdmin(): void
    {
        $client = static::createClient();
        $this->createAndLoginAdmin($client, 'createadmin-' . uniqid() . '@test.de');
        $email = 'created-' . uniqid() . '@test.de';

        $client->request(
            'POST',
            '/api/admin/users',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => $email, 'password' => 'NewStrong!Pass99Z', 'roles' => ['ROLE_USER']])
        );

        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame($email, $data['email']);
    }

    public function testCreateUserWithDuplicateEmailReturns422(): void
    {
        $client = static::createClient();
        $this->createAndLoginAdmin($client, 'dupeadmin-' . uniqid() . '@test.de');
        $email = 'dupe-' . uniqid() . '@test.de';
        // First creation
        $client->request('POST', '/api/admin/users', [], [], ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => $email, 'password' => 'NewStrong!Pass99Z', 'roles' => ['ROLE_USER']])
        );
        $this->assertResponseStatusCodeSame(201);
        // Second attempt with same email
        $client->request('POST', '/api/admin/users', [], [], ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => $email, 'password' => 'NewStrong!Pass99Z', 'roles' => ['ROLE_USER']])
        );
        $this->assertResponseStatusCodeSame(422);
    }

    public function testCreateUserAsRegularUserReturns403(): void
    {
        $client = static::createClient();
        $this->createAndLoginUser($client, 'nonadmin@test.de', 'pw');

        $client->request('POST', '/api/admin/users', [], [], ['CONTENT_TYPE' => 'application/json'], $this->adminPayload('x@y.de'));

        $this->assertResponseStatusCodeSame(403);
    }

    // ─── PUT /api/admin/users/{id}/role ──────────────────────────────────────

    public function testChangeRoleAsAdmin(): void
    {
        $client = static::createClient();
        $admin = $this->createAndLoginAdmin($client, 'roleadmin@test.de');
        $user = $this->createAndLoginUser($client, 'roletarget@test.de', 'pw');
        $client->loginUser($admin); // re-login as admin

        $client->request(
            'PUT',
            '/api/admin/users/' . $user->getId() . '/role',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['roles' => ['ROLE_USER', 'ROLE_ADMIN']])
        );

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertContains('ROLE_ADMIN', $data['roles']);
    }

    public function testChangeRoleOfNonexistentUserReturns404(): void
    {
        $client = static::createClient();
        $this->createAndLoginAdmin($client, 'notfoundadmin@test.de');

        $client->request(
            'PUT',
            '/api/admin/users/999999/role',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['roles' => ['ROLE_USER']])
        );

        $this->assertResponseStatusCodeSame(404);
    }

    // ─── DELETE /api/admin/users/{id} ────────────────────────────────────────

    public function testDeleteUserAsAdmin(): void
    {
        $client = static::createClient();
        $admin = $this->createAndLoginAdmin($client, 'deladmin@test.de');
        $user = $this->createAndLoginUser($client, 'delvictim@test.de', 'pw');
        $client->loginUser($admin);

        $client->request('DELETE', '/api/admin/users/' . $user->getId());

        $this->assertResponseStatusCodeSame(204);
    }

    public function testDeleteSelfReturns400(): void
    {
        $client = static::createClient();
        $admin = $this->createAndLoginAdmin($client, 'selfdeladmin@test.de');

        $client->request('DELETE', '/api/admin/users/' . $admin->getId());

        $this->assertResponseStatusCodeSame(400);
    }

    public function testDeleteNonexistentUserReturns404(): void
    {
        $client = static::createClient();
        $this->createAndLoginAdmin($client, 'missingadmin@test.de');

        $client->request('DELETE', '/api/admin/users/999999');

        $this->assertResponseStatusCodeSame(404);
    }
}
