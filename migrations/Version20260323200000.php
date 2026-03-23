<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260323200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add ROAM status and ROAM note fields to risk table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            ALTER TABLE risk
                ADD COLUMN roam_status VARCHAR(20) DEFAULT NULL,
                ADD COLUMN roam_notiz TEXT DEFAULT '' NOT NULL
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            ALTER TABLE risk
                DROP COLUMN roam_status,
                DROP COLUMN roam_notiz
        SQL);
    }
}
