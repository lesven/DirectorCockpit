<?php

namespace App\Entity;

interface SyncableEntity
{
    public function getId(): int;

    public function toArray(): array;

    public static function fromArray(array $data): static;

    public function updateFromArray(array $data): void;
}
