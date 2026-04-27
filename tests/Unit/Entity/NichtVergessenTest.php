<?php

namespace App\Tests\Unit\Entity;

use App\Entity\NichtVergessen;
use App\Entity\User;
use PHPUnit\Framework\TestCase;

class NichtVergessenTest extends TestCase
{
    public function testFromArrayAndToArrayRoundtrip(): void
    {
        $nv = NichtVergessen::fromArray(['id' => 5, 'title' => 'Wichtig', 'body' => 'Details']);
        $arr = $nv->toArray();

        $this->assertSame(5, $arr['id']);
        $this->assertSame('Wichtig', $arr['title']);
        $this->assertSame('Details', $arr['body']);
    }

    public function testFromArrayWithDefaults(): void
    {
        $nv = NichtVergessen::fromArray(['id' => 1]);
        $arr = $nv->toArray();

        $this->assertSame('', $arr['title']);
        $this->assertSame('', $arr['body']);
    }

    public function testUpdateFromArrayUpdatesFields(): void
    {
        $nv = NichtVergessen::fromArray(['id' => 1, 'title' => 'Alt', 'body' => 'Alter Text']);
        $nv->updateFromArray(['title' => 'Neu', 'body' => 'Neuer Text']);

        $arr = $nv->toArray();
        $this->assertSame('Neu', $arr['title']);
        $this->assertSame('Neuer Text', $arr['body']);
    }

    public function testUpdateFromArrayKeepsExistingWhenKeysAbsent(): void
    {
        $nv = NichtVergessen::fromArray(['id' => 1, 'title' => 'Bleibt', 'body' => 'Auch']);
        $nv->updateFromArray([]);

        $arr = $nv->toArray();
        $this->assertSame('Bleibt', $arr['title']);
        $this->assertSame('Auch', $arr['body']);
    }

    public function testGetIdReturnsCorrectValue(): void
    {
        $nv = NichtVergessen::fromArray(['id' => 33]);
        $this->assertSame(33, $nv->getId());
    }

    public function testCreatedByDefaultsToNull(): void
    {
        $nv = NichtVergessen::fromArray(['id' => 1]);
        $this->assertNull($nv->getCreatedBy());
        $this->assertNull($nv->toArray()['createdBy']);
    }

    public function testSetCreatedByAndToArray(): void
    {
        $nv = NichtVergessen::fromArray(['id' => 1]);
        $user = new User('test@example.com', 'hashed', ['ROLE_USER']);
        $nv->setCreatedBy($user);
        $this->assertSame($user, $nv->getCreatedBy());
    }
}
