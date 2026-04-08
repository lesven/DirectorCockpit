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
        $this->assertArrayHasKey('milestones', $data);
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

    // -------------------------------------------------------------------------
    // Milestone-Tests
    // -------------------------------------------------------------------------

    public function testSyncMilestoneRoundtrip(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [],
            'initiatives' => [
                ['id' => 200, 'name' => 'Test-Ini', 'team' => null, 'status' => 'grey', 'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
            'milestones' => [
                ['id' => 500, 'initiative' => 200, 'aufgabe' => 'Design Review', 'owner' => 'Max', 'status' => 'in_bearbeitung', 'frist' => '2026-04-15'],
            ],
        ];

        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);

        $this->assertCount(1, $data['milestones']);
        $ms = $data['milestones'][0];
        $this->assertSame(500, $ms['id']);
        $this->assertSame(200, $ms['initiative']);
        $this->assertSame('Design Review', $ms['aufgabe']);
        $this->assertSame('Max', $ms['owner']);
        $this->assertSame('in_bearbeitung', $ms['status']);
        $this->assertSame('2026-04-15', $ms['frist']);
    }

    public function testMilestoneWithDefaultValues(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [],
            'initiatives' => [
                ['id' => 200, 'name' => 'Test-Ini', 'team' => null, 'status' => 'grey', 'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
            'milestones' => [
                ['id' => 501, 'initiative' => 200],
            ],
        ];

        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);

        $ms = $data['milestones'][0];
        $this->assertSame('', $ms['aufgabe']);
        $this->assertSame('', $ms['owner']);
        $this->assertSame('offen', $ms['status']);
        $this->assertNull($ms['frist']);
    }

    /** frist = YYYY-MM-DD wird korrekt persistiert und zurückgegeben. */
    public function testMilestoneFristRoundtrip(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [],
            'initiatives' => [
                ['id' => 200, 'name' => 'Ini', 'team' => null, 'status' => 'grey', 'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
            'milestones' => [
                ['id' => 510, 'initiative' => 200, 'aufgabe' => 'Test', 'frist' => '2026-09-15', 'status' => 'offen'],
            ],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('2026-09-15', $data['milestones'][0]['frist']);
    }

    /** frist = '' wird als NULL gespeichert. */
    public function testMilestoneFristEmptyStringBecomesNull(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [],
            'initiatives' => [
                ['id' => 200, 'name' => 'Ini', 'team' => null, 'status' => 'grey', 'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
            'milestones' => [
                ['id' => 511, 'initiative' => 200, 'frist' => ''],
            ],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertNull($data['milestones'][0]['frist']);
    }

    /** frist im Format DD.MM.YYYY (kein YYYY-MM-DD) → 400. */
    public function testMilestoneFristInvalidFormatReturnsBadRequest(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [],
            'initiatives' => [],
            'nicht_vergessen' => [],
            'milestones' => [
                ['id' => 512, 'initiative' => 200, 'frist' => '15.04.2026'],
            ],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseStatusCodeSame(400);
    }

    /** frist für Initiative: YYYY-MM-DD Roundtrip. */
    public function testInitiativeFristRoundtrip(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [],
            'initiatives' => [
                ['id' => 600, 'name' => 'Ini-Frist', 'team' => null, 'status' => 'grey', 'projektstatus' => 'ok', 'schritt' => '', 'frist' => '2027-03-01', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);
        $ini = array_values(array_filter($data['initiatives'], fn($i) => $i['id'] === 600))[0];
        $this->assertSame('2027-03-01', $ini['frist']);
    }

    /** frist für Initiative: ungültiges Format → 400. */
    public function testInitiativeFristInvalidFormatReturnsBadRequest(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'teams' => [],
            'initiatives' => [
                ['id' => 601, 'name' => 'Ini', 'team' => null, 'status' => 'grey', 'projektstatus' => 'ok', 'schritt' => '', 'frist' => 'Q4 2026', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseStatusCodeSame(400);
    }

    // -------------------------------------------------------------------------
    // Kunden-Tests
    // -------------------------------------------------------------------------

    public function testLoadResponseIncludesKundenArray(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/cockpit');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('kunden', $data);
        $this->assertIsArray($data['kunden']);
    }

    public function testSyncKundenRoundtrip(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'kunden' => [
                ['id' => 10, 'name' => 'Acme GmbH'],
                ['id' => 11, 'name' => 'Beta AG'],
            ],
            'teams' => [],
            'initiatives' => [],
            'nicht_vergessen' => [],
        ];

        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);

        $this->assertCount(2, $data['kunden']);
        $names = array_column($data['kunden'], 'name');
        $this->assertContains('Acme GmbH', $names);
        $this->assertContains('Beta AG', $names);
    }

    public function testSyncInitiativeWithCustomerRoundtrip(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'kunden' => [['id' => 20, 'name' => 'Kunde Eins']],
            'teams' => [],
            'initiatives' => [
                ['id' => 700, 'name' => 'Kundenprojekt', 'team' => null, 'customer' => 20,
                 'status' => 'grey', 'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
        ];

        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);

        $ini = $data['initiatives'][0];
        $this->assertSame(20, $ini['customer']);
    }

    public function testSyncInitiativeWithoutCustomerHasNullCustomer(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'kunden' => [],
            'teams' => [],
            'initiatives' => [
                ['id' => 800, 'name' => 'Ohne Kunde', 'team' => null, 'status' => 'grey',
                 'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
        ];

        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);

        $this->assertNull($data['initiatives'][0]['customer']);
    }

    public function testSyncKundeWithEmptyNameReturnsBadRequest(): void
    {
        $client = static::createClient();

        $payload = [
            'kw' => '',
            'kunden' => [['id' => 30, 'name' => '']],
            'teams' => [],
            'initiatives' => [],
            'nicht_vergessen' => [],
        ];

        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseStatusCodeSame(400);
    }

    public function testPayloadWithoutKundenKeyIsBackwardsCompatible(): void
    {
        $client = static::createClient();

        // Payload ohne kunden-Schlüssel – kein Breaking Change
        $payload = [
            'kw' => 'compat',
            'teams' => [['id' => 99, 'name' => 'Compat-Team', 'status' => 'grey', 'fokus' => '', 'schritt' => '']],
            'initiatives' => [],
            'nicht_vergessen' => [],
        ];

        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        $this->assertResponseIsSuccessful();

        $client->request('GET', '/api/cockpit');
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('compat', $data['kw']);
        $this->assertIsArray($data['kunden']); // kunden-Array vorhanden, aber leer
    }

    // -------------------------------------------------------------------------
    // hideFertig-Tests
    // -------------------------------------------------------------------------

    private function seedMixedInitiatives(): \Symfony\Bundle\FrameworkBundle\KernelBrowser
    {
        $client = static::createClient();
        $payload = [
            'kw' => '',
            'teams' => [],
            'kunden' => [],
            'initiatives' => [
                ['id' => 901, 'name' => 'Aktiv',     'team' => null, 'status' => 'yellow',   'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
                ['id' => 902, 'name' => 'Geplant',   'team' => null, 'status' => 'grey',     'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
                ['id' => 903, 'name' => 'Fertig',    'team' => null, 'status' => 'fertig',   'projektstatus' => 'ok', 'schritt' => '', 'frist' => '', 'notiz' => ''],
            ],
            'nicht_vergessen' => [],
        ];
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($payload));
        return $client;
    }

    /** GET ohne hideFertig gibt alle Initiativen zurück (kein Breaking Change). */
    public function testLoadWithoutHideFertigReturnsAllInitiatives(): void
    {
        $client = $this->seedMixedInitiatives();
        $client->request('GET', '/api/cockpit');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $statuses = array_column($data['initiatives'], 'status');
        $this->assertContains('fertig', $statuses, 'Ohne hideFertig müssen Fertige enthalten sein');
    }

    /** GET ?hideFertig=1 filtert Initiativen mit status=fertig heraus. */
    public function testLoadWithHideFertigExcludesFinishedInitiatives(): void
    {
        $client = $this->seedMixedInitiatives();
        $client->request('GET', '/api/cockpit?hideFertig=1');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $statuses = array_column($data['initiatives'], 'status');
        $this->assertNotContains('fertig', $statuses, 'hideFertig=1 darf keine Fertigen zurückgeben');
        $this->assertContains('yellow', $statuses);
        $this->assertContains('grey', $statuses);
    }

    /** GET ?hideFertig=0 verhält sich wie kein Parameter. */
    public function testLoadWithHideFertigFalseReturnsAllInitiatives(): void
    {
        $client = $this->seedMixedInitiatives();
        $client->request('GET', '/api/cockpit?hideFertig=0');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $statuses = array_column($data['initiatives'], 'status');
        $this->assertContains('fertig', $statuses, 'hideFertig=0 muss Fertige enthalten');
    }

    /** GET ?hideFertig=1 bei leerer DB gibt leeres initiatives-Array zurück. */
    public function testLoadWithHideFertigOnEmptyDatabaseReturnsEmptyArray(): void
    {
        // DB leeren
        $client = static::createClient();
        $client->request('PUT', '/api/cockpit', [], [], ['CONTENT_TYPE' => 'application/json'],
            json_encode(['kw' => '', 'teams' => [], 'initiatives' => [], 'nicht_vergessen' => []])
        );

        $client->request('GET', '/api/cockpit?hideFertig=1');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame([], $data['initiatives']);
    }
}

