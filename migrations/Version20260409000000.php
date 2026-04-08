<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260409000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add initiative_blocked_by join table for self-referential blockedBy relation';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE initiative_blocked_by (
            initiative_id BIGINT NOT NULL,
            blocked_by_initiative_id BIGINT NOT NULL,
            PRIMARY KEY (initiative_id, blocked_by_initiative_id),
            CONSTRAINT fk_ibb_initiative FOREIGN KEY (initiative_id) REFERENCES initiative(id) ON DELETE CASCADE,
            CONSTRAINT fk_ibb_blocked_by FOREIGN KEY (blocked_by_initiative_id) REFERENCES initiative(id) ON DELETE CASCADE
        )');
        $this->addSql('CREATE INDEX idx_ibb_initiative_id ON initiative_blocked_by (initiative_id)');
        $this->addSql('CREATE INDEX idx_ibb_blocked_by_id ON initiative_blocked_by (blocked_by_initiative_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE initiative_blocked_by');
    }
}
