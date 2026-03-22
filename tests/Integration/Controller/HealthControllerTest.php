<?php

namespace App\Tests\Integration\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class HealthControllerTest extends WebTestCase
{
    public function testHealthReturnsOk(): void
    {
        $client = static::createClient();
        $client->request('GET', '/health');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('ok', $data['status']);
    }

    /** Antwort muss JSON sein und den 'status'-Schlüssel enthalten. */
    public function testHealthResponseIsJson(): void
    {
        $client = static::createClient();
        $client->request('GET', '/health');

        $this->assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('status', $data);
    }

    /** GET /health ist idempotent – mehrfache Aufrufe liefern dasselbe Ergebnis. */
    public function testHealthIsIdempotent(): void
    {
        $client = static::createClient();

        $client->request('GET', '/health');
        $first = json_decode($client->getResponse()->getContent(), true);

        $client->request('GET', '/health');
        $second = json_decode($client->getResponse()->getContent(), true);

        $this->assertSame($first['status'], $second['status']);
    }
}
