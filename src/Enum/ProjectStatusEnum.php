<?php

namespace App\Enum;

/**
 * Gültige Statuswerte für den Projektstatus einer Initiative.
 * Ersetzt die bisher verstreuten Magic-Strings 'ok' und 'kritisch'.
 */
enum ProjectStatusEnum: string
{
    case Ok = 'ok';
    case Kritisch = 'kritisch';
}
