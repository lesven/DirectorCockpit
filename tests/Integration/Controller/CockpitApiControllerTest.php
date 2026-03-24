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
        $this->assertArrayHasKey('initiatives', $data);
        $this->assertArrayHasKey('nicht_vergessen', $data);
    }

    public function testSyncRoundtrip(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '12',
            'teams' => [
                ['id' => 100, 'name' => 'Test-Team', 'status' => 'grey', 'fokus' => '', 'schritt' => ''],
            ],
            'initiatives' => [
                ['id' => 200, 'name' => 'Test-Ini', 'team' => 100, 'status' => 'yellow', 'projektstatus' => 'ok', 'schritt' => 'Step', 'frist' => '', 'notiz' => '', 'businessValue' => 8, 'timeCriticality' => 5, 'riskReduction' => 3, 'jobSize' => 5],
            ],
            'nicht_vergessen' => [
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
        $this->assertCount(1, $data['initiatives']);
        $this->assertSame('Test-Ini', $data['initiatives'][0]['name']);
        $this->assertSame(8, $data['initiatives'][0]['businessValue']);
        $this->assertSame(5, $data['initiatives'][0]['timeCriticality']);
        $this->assertSame(3, $data['initiatives'][0]['riskReduction']);
        $this->assertSame(5, $data['initiatives'][0]['jobSize']);
        $this->assertCount(1, $data['nicht_vergessen']);
        $this->assertSame('Test-NV', $data['nicht_vergessen'][0]['title']);
    }

    public function testSyncUpdatesExistingEntity(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [['id' => 100, 'name' => 'Original', 'status' => 'grey', 'fokus' => '', 'schritt' => '']],
            'initiatives' => [],
            'nicht_vergessen' => [],
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
                ['id' => 1, 'name' => 'A', 'status' => 'grey', 'fokus' => '', 'schritt' => ''],
                ['id' => 2, 'name' => 'B', 'status' => 'grey', 'fokus' => '', 'schritt' => ''],
            ],
            'initiatives' => [],
            'nicht_vergessen' => [],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));

        $payload['teams'] = [['id' => 1, 'name' => 'A', 'status' => 'grey', 'fokus' => '', 'schritt' => '']];
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

        $this->assertResponseStatusCodeSame(400);
    }

    // -------------------------------------------------------------------------
    // Phase 2: Neue Integrationstests für bisher ungetestete Pfade
    // -------------------------------------------------------------------------

    /** Payload enthält nur 'kw', keine Entity-Arrays – muss erfolgreich sein. */
    public function testSyncWithOnlyKwSucceeds(): void
    {
        $client = static::createClient();
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'],
            json_encode(['kw' => '10'])
        );
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('10', $data['kw']);
    }

    /** Leerer Body ist kein valides JSON-Objekt → 400. */
    public function testSyncWithEmptyBodyReturnsBadRequest(): void
    {
        $client = static::createClient();
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], '');

        $this->assertResponseStatusCodeSame(400);
    }

    /** Entity-Array enthält ein nicht-Array-Element → 400 (ValidationException). */
    public function testSyncWithNonArrayEntityItemReturnsBadRequest(): void
    {
        $client = static::createClient();
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'],
            json_encode(['teams' => ['kein-objekt']])
        );

        $this->assertResponseStatusCodeSame(400);
    }

    /** Entity-Item ohne 'id'-Feld → 400 (ValidationException). */
    public function testSyncWithMissingIdFieldReturnsError(): void
    {
        $client = static::createClient();
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'],
            json_encode(['teams' => [['name' => 'kein-id']]])
        );

        $this->assertResponseStatusCodeSame(400);
    }

    /** WSJF-Felder mit null-Werten werden korrekt persistiert. */
    public function testSyncInitiativeWithNullWsjfFields(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [],
            'initiatives' => [
                ['id' => 500, 'name' => 'Ohne WSJF', 'team' => null, 'status' => 'grey', 'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);
        $ini = $data['initiatives'][0];

        $this->assertNull($ini['businessValue']);
        $this->assertNull($ini['timeCriticality']);
        $this->assertNull($ini['riskReduction']);
        $this->assertNull($ini['jobSize']);
    }
}
