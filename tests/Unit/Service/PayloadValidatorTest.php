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

    // --- Milestone-Status-Validierung ---

    public function testValidMilestonePayloadPasses(): void
    {
        $this->validator->validate(
            ['milestones' => [['id' => 1, 'initiative' => 1, 'aufgabe' => 'Test', 'status' => 'offen']]],
            ['milestones']
        );

        $this->addToAssertionCount(1);
    }

    public function testAllValidMilestoneStatusesPass(): void
    {
        foreach (['offen', 'in_bearbeitung', 'erledigt', 'blockiert'] as $status) {
            $this->validator->validate(
                ['milestones' => [['id' => 1, 'status' => $status]]],
                ['milestones']
            );
        }
        $this->addToAssertionCount(1);
    }

    public function testMilestoneWithoutIdThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches("/muss ein Objekt mit 'id' sein/");

        $this->validator->validate(
            ['milestones' => [['aufgabe' => 'no id']]],
            ['milestones']
        );
    }

    public function testInvalidMilestoneStatusThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/status.*ungültig/u');

        $this->validator->validate(
            ['milestones' => [['id' => 1, 'status' => 'done']]],
            ['milestones']
        );
    }

    public function testMilestoneWithNullStatusIsAllowed(): void
    {
        $this->validator->validate(
            ['milestones' => [['id' => 1, 'status' => null]]],
            ['milestones']
        );

        $this->addToAssertionCount(1);
    }

    public function testMilestoneWithoutStatusKeyIsAllowed(): void
    {
        $this->validator->validate(
            ['milestones' => [['id' => 1, 'aufgabe' => 'Test']]],
            ['milestones']
        );

        $this->addToAssertionCount(1);
    }

    public function testNegativeWsjfValueThrows(): void
    {
        $this->expectException(ValidationException::class);

        $this->validator->validate(
            ['initiatives' => [['id' => 1, 'businessValue' => -1]]],
            ['initiatives']
        );
    }

    public function testValidationExceptionIsInvalidArgumentException(): void
    {
        // ValidationException ist ein Client-Eingabefehler (4xx) und erbt von \InvalidArgumentException,
        // nicht von SyncException (5xx). Der Controller fängt beide explizit ab.
        $this->expectException(\InvalidArgumentException::class);

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

    // --- ID-Typ-Validierung (E-4) ---

    public function testZeroIdThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/positive ganze Zahl/');

        $this->validator->validate(
            ['teams' => [['id' => 0, 'name' => 'Test']]],
            ['teams']
        );
    }

    public function testNegativeIdThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/positive ganze Zahl/');

        $this->validator->validate(
            ['teams' => [['id' => -1, 'name' => 'Test']]],
            ['teams']
        );
    }

    public function testStringIdThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/positive ganze Zahl/');

        $this->validator->validate(
            ['teams' => [['id' => 'foo', 'name' => 'Test']]],
            ['teams']
        );
    }

    public function testValidPositiveIdPasses(): void
    {
        $this->validator->validate(
            ['teams' => [['id' => 1, 'name' => 'Test']]],
            ['teams']
        );
        $this->addToAssertionCount(1);
    }

    /**
     * REGRESSION S-3:
     * Beliebige Strings bei risks.roamStatus dürfen die Validierung nicht passieren.
     * RoamStatusEnum definiert die erlaubten Werte ('report', 'on_track', 'at_risk', 'mitigated').
     *
     * Status: ROT bis roamStatus-Validierung in PayloadValidator ergänzt wird.
     */
    public function testInvalidRoamStatusInRiskThrows(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/roamStatus/');

        $this->validator->validate(
            ['risks' => [['id' => 1, 'initiative' => 1, 'roamStatus' => 'invalid_value']]],
            ['risks']
        );
    }

    public function testNullRoamStatusInRiskIsAllowed(): void
    {
        $this->validator->validate(
            ['risks' => [['id' => 1, 'initiative' => 1, 'roamStatus' => null]]],
            ['risks']
        );
        $this->addToAssertionCount(1);
    }

    public function testMissingRoamStatusInRiskIsAllowed(): void
    {
        $this->validator->validate(
            ['risks' => [['id' => 1, 'initiative' => 1, 'bezeichnung' => 'Test']]],
            ['risks']
        );
        $this->addToAssertionCount(1);
    }

    // --- Mehrere Items: Index-Korrektheit beim Refactoring absichern ---

    public function testSecondItemInvalidReportsCorrectIndex(): void
    {
        // Erstes Item gültig, zweites ungültig → Fehlermeldung muss Index 1 zeigen
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/teams\[1\]/');

        $this->validator->validate(
            ['teams' => [
                ['id' => 1, 'name' => 'ok'],
                ['name' => 'missing id'],
            ]],
            ['teams']
        );
    }

    public function testThirdItemInvalidWsjfReportsCorrectIndex(): void
    {
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches('/initiatives\[2\]/');

        $this->validator->validate(
            ['initiatives' => [
                ['id' => 1, 'businessValue' => 1],
                ['id' => 2, 'businessValue' => 2],
                ['id' => 3, 'businessValue' => 4], // 4 ist kein Fibonacci-Wert
            ]],
            ['initiatives']
        );
    }

    public function testValidItemsBeforeInvalidDoNotPreventValidation(): void
    {
        // Mehrere gültige Items + ein ungültiges am Ende
        $this->expectException(ValidationException::class);

        $this->validator->validate(
            ['risks' => [
                ['id' => 1, 'roamStatus' => 'report'],
                ['id' => 2, 'roamStatus' => 'on_track'],
                ['id' => 3, 'roamStatus' => 'INVALID'],
            ]],
            ['risks']
        );
    }

    public function testMultipleEntitiesFirstInvalidStopsEarly(): void
    {
        // Nur teams wird validiert; die initiative mit ungültigem WSJF bleibt
        // ungeprüft, weil teams bereits fehlschlägt
        $this->expectException(ValidationException::class);
        $this->expectExceptionMessageMatches("/teams\[0\]/");

        $this->validator->validate(
            [
                'teams'       => [['name' => 'no id']],
                'initiatives' => [['id' => 1, 'businessValue' => 4]],
            ],
            ['teams', 'initiatives']
        );
    }

    public function testAllItemsValidPassesCompletely(): void
    {
        // Vollständig gemischter valider Payload über alle Entity-Typen
        $this->validator->validate(
            [
                'teams'          => [['id' => 1, 'name' => 'T1'], ['id' => 2, 'name' => 'T2']],
                'initiatives'    => [['id' => 10, 'businessValue' => 5, 'jobSize' => 3]],
                'milestones'     => [['id' => 20, 'status' => 'offen'], ['id' => 21, 'status' => 'erledigt']],
                'risks'          => [['id' => 30, 'roamStatus' => 'mitigated']],
                'nicht_vergessen'=> [['id' => 40, 'title' => 'Foo']],
            ],
            ['teams', 'initiatives', 'milestones', 'risks', 'nicht_vergessen']
        );
        $this->addToAssertionCount(1);
    }
}
