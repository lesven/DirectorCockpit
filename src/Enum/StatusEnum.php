<?php

namespace App\Enum;

/**
 * Gültige Ampel-Statuswerte für Teams und Initiativen.
 * Ersetzt die bisher verstreuten Magic-Strings 'grey', 'yellow', 'fertig', 'ungeplant', 'green'.
 */
enum StatusEnum: string
{
    case Grey = 'grey';
    case Yellow = 'yellow';
    case Fertig = 'fertig';
    case Ungeplant = 'ungeplant';
    case Green = 'green';
}
