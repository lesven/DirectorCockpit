<?php

namespace App\Tests\Unit\Service;

use App\Service\PayloadValidator;
use App\Service\SyncException;
use PHPUnit\Framework\TestCase;

class PayloadValidatorTest extends TestCase
{
    private PayloadValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new PayloadValidator();
    }

    public function testValidPayloadPasses(): void
    {
        $this->validator->validate(
            ['teams' => [['id' => 1, 'name' => 'A']], 'initiatives' => []],
            ['teams', 'initiatives', 'nicht_vergessen']
        );

        $this->addToAssertionCount(1); // no exception = pass
    }

    public function testMissingEntityKeyIsAllowed(): void
    {
        $this->validator->validate(
            ['kw' => '10'],
            ['teams', 'initiatives', 'nicht_vergessen']
        );

        $this->addToAssertionCount(1);
    }

    public function testEmptyArraysAreValid(): void
    {
        $this->validator->validate(
            ['teams' => [], 'initiatives' => [], 'nicht_vergessen' => []],
            ['teams', 'initiatives', 'nicht_vergessen']
        );

        $this->addToAssertionCount(1);
    }

    public function testNonArrayEntityValueThrows(): void
    {
        $this->expectException(SyncException::class);
        $this->expectExceptionMessageMatches("/muss ein Array sein/");

        $this->validator->validate(
            ['teams' => 'not-an-array'],
            ['teams']
        );
    }

    public function testNonArrayItemThrows(): void
    {
        $this->expectException(SyncException::class);
        $this->expectExceptionMessageMatches("/muss ein Objekt mit 'id' sein/");

        $this->validator->validate(
            ['teams' => ['just-a-string']],
            ['teams']
        );
    }

    public function testItemWithoutIdThrows(): void
    {
        $this->expectException(SyncException::class);
        $this->expectExceptionMessageMatches("/muss ein Objekt mit 'id' sein/");

        $this->validator->validate(
            ['teams' => [['name' => 'no id here']]],
            ['teams']
        );
    }

    public function testMultipleEntityKeysValidatedIndependently(): void
    {
        $this->expectException(SyncException::class);
        $this->expectExceptionMessageMatches("/'initiatives\\[0\\]'/");

        $this->validator->validate(
            [
                'teams' => [['id' => 1]],
                'initiatives' => [['name' => 'missing id']],
            ],
            ['teams', 'initiatives']
        );
    }

    public function testUnknownKeysAreIgnored(): void
    {
        $this->validator->validate(
            ['extra_key' => 'whatever', 'teams' => [['id' => 1]]],
            ['teams']
        );

        $this->addToAssertionCount(1);
    }
}
