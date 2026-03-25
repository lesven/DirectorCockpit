<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260323100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create risk table for initiative risk management';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE risk (
                id BIGINT NOT NULL,
                initiative BIGINT NOT NULL,
                bezeichnung VARCHAR(255) DEFAULT '' NOT NULL,
                beschreibung TEXT DEFAULT '' NOT NULL,
                eintrittswahrscheinlichkeit INTEGER DEFAULT 1 NOT NULL,
                schadensausmass INTEGER DEFAULT 1 NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT fk_risk_initiative FOREIGN KEY (initiative) REFERENCES initiative (id) ON DELETE CASCADE
            )
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE risk');
    }
}
