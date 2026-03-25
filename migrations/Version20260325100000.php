<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260325100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create milestone table for initiative milestone planning';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            CREATE TABLE milestone (
                id BIGINT NOT NULL,
                initiative BIGINT NOT NULL,
                aufgabe VARCHAR(255) DEFAULT '' NOT NULL,
                beschreibung TEXT DEFAULT '' NOT NULL,
                owner VARCHAR(255) DEFAULT '' NOT NULL,
                status VARCHAR(20) DEFAULT 'offen' NOT NULL,
                frist VARCHAR(20) DEFAULT '' NOT NULL,
                PRIMARY KEY (id),
                CONSTRAINT fk_milestone_initiative FOREIGN KEY (initiative) REFERENCES initiative (id) ON DELETE CASCADE
            )
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE milestone');
    }
}
