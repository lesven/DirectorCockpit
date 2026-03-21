<?php

namespace App\Tests\Integration\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class CockpitApiControllerTest extends WebTestCase
{
    public function testLoadReturnsJson(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/cockpit');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertIsArray($data);
        $this->assertArrayHasKey('kw', $data);
        $this->assertArrayHasKey('teams', $data);
        $this->assertArrayHasKey('inis', $data);
        $this->assertArrayHasKey('nvs', $data);
    }

    public function testSyncRoundtrip(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '12',
            'teams' => [
                ['id' => 100, 'name' => 'Test-Team', 'sub' => 'Sub', 'status' => 'grey', 'fokus' => '', 'schritt' => ''],
            ],
            'inis' => [
                ['id' => 200, 'name' => 'Test-Ini', 'team' => 100, 'status' => 'yellow', 'projektstatus' => 'ok', 'schritt' => 'Step', 'frist' => '', 'notiz' => ''],
            ],
            'nvs' => [
                ['id' => 300, 'title' => 'Test-NV', 'body' => 'Body'],
            ],
        ];

        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);

        $this->assertSame('12', $data['kw']);
        $this->assertCount(1, $data['teams']);
        $this->assertSame('Test-Team', $data['teams'][0]['name']);
        $this->assertCount(1, $data['inis']);
        $this->assertSame('Test-Ini', $data['inis'][0]['name']);
        $this->assertCount(1, $data['nvs']);
        $this->assertSame('Test-NV', $data['nvs'][0]['title']);
    }

    public function testSyncUpdatesExistingEntity(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [['id' => 100, 'name' => 'Original', 'sub' => '', 'status' => 'grey', 'fokus' => '', 'schritt' => '']],
            'inis' => [],
            'nvs' => [],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $payload['teams'][0]['name'] = 'Updated';
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('Updated', $data['teams'][0]['name']);
        $this->assertCount(1, $data['teams']);
    }

    public function testSyncDeletesMissingEntities(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [
                ['id' => 1, 'name' => 'A', 'sub' => '', 'status' => 'grey', 'fokus' => '', 'schritt' => ''],
                ['id' => 2, 'name' => 'B', 'sub' => '', 'status' => 'grey', 'fokus' => '', 'schritt' => ''],
            ],
            'inis' => [],
            'nvs' => [],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));

        $payload['teams'] = [['id' => 1, 'name' => 'A', 'sub' => '', 'status' => 'grey', 'fokus' => '', 'schritt' => '']];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertCount(1, $data['teams']);
        $this->assertSame('A', $data['teams'][0]['name']);
    }

    public function testInvalidJsonReturnsBadRequest(): void
    {
        $client = static::createClient();
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], 'not-json');

        $this->assertResponseStatusCodeSame(400);
    }

    public function testInvalidPayloadStructureReturnsBadRequest(): void
    {
        $client = static::createClient();
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode([
            'teams' => 'not-an-array',
        ]));

        $this->assertResponseStatusCodeSame(500);
    }
}
