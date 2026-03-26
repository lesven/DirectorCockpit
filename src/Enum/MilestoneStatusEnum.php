<?php

namespace App\Enum;

enum MilestoneStatusEnum: string
{
    case Offen = 'offen';
    case InBearbeitung = 'in_bearbeitung';
    case Erledigt = 'erledigt';
    case Blockiert = 'blockiert';
}
