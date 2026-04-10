<?php

namespace App\Service;

class InitiativeFilterService
{
    /**
     * Entfernt Initiativen mit Status „fertig" aus dem Ergebnis-Array.
     *
     * @param array<string, mixed> $result  Das rohe loadAll()-Ergebnis
     * @return array{filtered: int, remaining: int, result: array<string, mixed>}
     */
    public function hideFertig(array $result): array
    {
        $before = count($result['initiatives'] ?? []);

        $result['initiatives'] = array_values(
            array_filter(
                $result['initiatives'] ?? [],
                fn(array $ini) => ($ini['status'] ?? '') !== 'fertig',
            )
        );

        return [
            'filtered'  => $before - count($result['initiatives']),
            'remaining' => count($result['initiatives']),
            'result'    => $result,
        ];
    }
}
