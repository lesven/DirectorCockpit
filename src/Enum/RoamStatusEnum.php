<?php

namespace App\Enum;

enum RoamStatusEnum: string
{
    case Resolved = 'resolved';
    case Owned = 'owned';
    case Accepted = 'accepted';
    case Mitigated = 'mitigated';
}
