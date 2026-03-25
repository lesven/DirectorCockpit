<?php

namespace App\Entity;

interface SyncableEntity
{
    public function getId(): int;

    /** @return array<string, mixed> */
    public function toArray(): array;

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): static;

    /** @param array<string, mixed> $data */
    public function updateFromArray(array $data): void;
}
