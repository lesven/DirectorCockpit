<?php

namespace App\Tests\Unit\Service;

use App\Service\PayloadValidator;
use App\Service\SyncException;
use App\Service\ValidationException;
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
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches("/muss ein Array sein/");

        $this->validator->validate(
            ['teams' => 'not-an-array'],
            ['teams']
        );
    }

    public function testNonArrayItemThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches("/muss ein Objekt mit 'id' sein/");

        $this->validator->validate(
            ['teams' => ['just-a-string']],
            ['teams']
        );
    }

    public function testItemWithoutIdThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches("/muss ein Objekt mit 'id' sein/");

        $this->validator->validate(
            ['teams' => [['name' => 'no id here']]],
            ['teams']
        );
    }

    public function testMultipleEntityKeysValidatedIndependently(): void
    {
        $this->expectException(ValidationException::class);
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

    // --- WSJF-Feldvalidierung ---

    public function testValidWsjfFibonacciValuesPass(): void
    {
        foreach ([1, 2, 3, 5, 8, 13, 21] as $value) {
            $this->validator->validate(
                ['initiatives' => [['id' => 1, 'businessValue' => $value, 'timeCriticality' => $value, 'riskReduction' => $value, 'jobSize' => $value]]],
                ['initiatives']
            );
        }
        $this->addToAssertionCount(1);
    }

    public function testNullWsjfFieldsAreAllowed(): void
    {
        $this->validator->validate(
            ['initiatives' => [['id' => 1, 'businessValue' => null, 'timeCriticality' => null, 'riskReduction' => null, 'jobSize' => null]]],
            ['initiatives']
        );
        $this->addToAssertionCount(1);
    }

    public function testMissingWsjfFieldsAreAllowed(): void
    {
        $this->validator->validate(
            ['initiatives' => [['id' => 1, 'name' => 'Test']]],
            ['initiatives']
        );
        $this->addToAssertionCount(1);
    }

    public function testInvalidBusinessValueThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/businessValue.*ungültig/u');

        $this->validator->validate(
            ['initiatives' => [['id' => 1, 'businessValue' => 4]]],
            ['initiatives']
        );
    }

    public function testInvalidTimeCriticalityThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/timeCriticality.*ungültig/u');

        $this->validator->validate(
            ['initiatives' => [['id' => 1, 'timeCriticality' => 6]]],
            ['initiatives']
        );
    }

    public function testInvalidRiskReductionThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/riskReduction.*ungültig/u');

        $this->validator->validate(
            ['initiatives' => [['id' => 1, 'riskReduction' => 0]]],
            ['initiatives']
        );
    }

    public function testInvalidJobSizeThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/jobSize.*ungültig/u');

        $this->validator->validate(
            ['initiatives' => [['id' => 1, 'jobSize' => 99]]],
            ['initiatives']
        );
    }

    public function testNegativeWsjfValueThrows(): void
    {
        $this->expectException(ValidationException::class);

        $this->validator->validate(
            ['initiatives' => [['id' => 1, 'businessValue' => -1]]],
            ['initiatives']
        );
    }

    public function testValidationExceptionIsSubtypeOfSyncException(): void
    {
        // Stellt sicher dass Controller SyncException als Catch-All für DB-Fehler nutzen kann
        $this->expectException(SyncException::class);

        $this->validator->validate(
            ['initiatives' => [['id' => 1, 'businessValue' => 4]]],
            ['initiatives']
        );
    }

    public function testWsjfValidationDoesNotApplyToOtherEntities(): void
    {
        // businessValue bei teams soll nicht validiert werden
        $this->validator->validate(
            ['teams' => [['id' => 1, 'businessValue' => 4]]],
            ['teams']
        );
        $this->addToAssertionCount(1);
    }
}
