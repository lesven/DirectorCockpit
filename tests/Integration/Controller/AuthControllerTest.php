<?php

declare(strict_types=1);

namespace App\Tests\Integration\Controller;

use App\Tests\Integration\AuthTestTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class AuthControllerTest extends WebTestCase
{
    use AuthTestTrait;

    // ─── POST /api/login ──────────────────────────────────────────────────────

    public function testLoginWithValidCredentialsReturnsUserData(): void
    {
        $client = static::createClient();
        // Create user in DB so the json_login authenticator can find it
        $this->createAndLoginUser($client, 'login@test.de', 'mypassword');
        // We test the endpoint manually (without loginUser) to exercise json_login
        $client->getCookieJar()->clear();

        $client->request(
            'POST',
            '/api/login',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => 'login@test.de', 'password' => 'mypassword'])
        );

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('login@test.de', $data['email']);
        $this->assertArrayHasKey('roles', $data);
        $this->assertArrayHasKey('id', $data);
    }

    public function testLoginWithInvalidCredentialsReturns401(): void
    {
        $client = static::createClient();

        $client->request(
            'POST',
            '/api/login',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['email' => 'nobody@test.de', 'password' => 'wrong'])
        );

        $this->assertResponseStatusCodeSame(401);
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('error', $data);
    }

    // ─── GET /api/me ─────────────────────────────────────────────────────────

    public function testMeReturnsUserDataWhenAuthenticated(): void
    {
        $client = static::createClient();
        $user = $this->createAndLoginUser($client, 'me@test.de', 'pw', ['ROLE_USER']);

        $client->request('GET', '/api/me');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('me@test.de', $data['email']);
        $this->assertContains('ROLE_USER', $data['roles']);
    }

    public function testMeReturns401WhenNotAuthenticated(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/me');

        $this->assertResponseStatusCodeSame(401);
    }

    // ─── PUT /api/user/password ───────────────────────────────────────────────

    public function testChangePasswordSuccessfully(): void
    {
        $client = static::createClient();
        $email = 'pwchange-' . uniqid() . '@test.de';
        $this->createAndLoginUser($client, $email, 'oldpassword');

        $client->request(
            'PUT',
            '/api/user/password',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'currentPassword' => 'oldpassword',
                'newPassword' => 'NewStrong!Pass99Z',
            ])
        );

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('message', $data);
    }

    public function testChangePasswordReturns422OnWrongCurrentPassword(): void
    {
        $client = static::createClient();
        $this->createAndLoginUser($client, 'pwwrong@test.de', 'correctpassword');

        $client->request(
            'PUT',
            '/api/user/password',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'currentPassword' => 'wrongpassword',
                'newPassword' => 'NewStrong!Pass99Z',
            ])
        );

        $this->assertResponseStatusCodeSame(422);
    }

    public function testChangePasswordReturns422OnWeakNewPassword(): void
    {
        $client = static::createClient();
        $this->createAndLoginUser($client, 'pwweak@test.de', 'mypassword');

        $client->request(
            'PUT',
            '/api/user/password',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'currentPassword' => 'mypassword',
                'newPassword' => 'weak',
            ])
        );

        $this->assertResponseStatusCodeSame(422);
    }

    public function testChangePasswordReturns401WhenNotAuthenticated(): void
    {
        $client = static::createClient();

        $client->request(
            'PUT',
            '/api/user/password',
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['currentPassword' => 'x', 'newPassword' => 'y'])
        );

        $this->assertResponseStatusCodeSame(401);
    }
}
