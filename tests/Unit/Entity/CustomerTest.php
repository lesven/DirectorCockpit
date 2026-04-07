<?php

namespace App\Tests\Unit\Entity;

use App\Entity\Customer;
use PHPUnit\Framework\TestCase;

class CustomerTest extends TestCase
{
    private function fullData(): array
    {
        return [
            'id'   => 5,
            'name' => 'Acme GmbH',
        ];
    }

    public function testFromArrayAndToArrayRoundtrip(): void
    {
        $customer = Customer::fromArray($this->fullData());
        $arr = $customer->toArray();

        $this->assertSame(5, $arr['id']);
        $this->assertSame('Acme GmbH', $arr['name']);
    }

    public function testFromArrayWithDefaults(): void
    {
        $customer = Customer::fromArray(['id' => 1]);
        $arr = $customer->toArray();

        $this->assertSame(1, $arr['id']);
        $this->assertSame('', $arr['name']);
    }

    public function testUpdateFromArrayUpdatesName(): void
    {
        $customer = Customer::fromArray(['id' => 1, 'name' => 'Alt']);
        $customer->updateFromArray(['name' => 'Neu']);

        $this->assertSame('Neu', $customer->toArray()['name']);
    }

    public function testUpdateFromArrayKeepsNameWhenKeyAbsent(): void
    {
        $customer = Customer::fromArray(['id' => 1, 'name' => 'Unverändert']);
        $customer->updateFromArray([]);

        $this->assertSame('Unverändert', $customer->toArray()['name']);
    }

    public function testGetIdReturnsCorrectId(): void
    {
        $customer = Customer::fromArray(['id' => 42, 'name' => 'Test']);
        $this->assertSame(42, $customer->getId());
    }
}
