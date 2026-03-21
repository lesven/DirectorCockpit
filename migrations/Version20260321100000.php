<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260321100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create cockpit tables: team, initiative, nicht_vergessen, metadata';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE team (
            id BIGINT NOT NULL,
            name VARCHAR(255) DEFAULT \'\' NOT NULL,
            sub VARCHAR(255) DEFAULT \'\' NOT NULL,
            status VARCHAR(20) DEFAULT \'grey\' NOT NULL,
            fokus TEXT DEFAULT \'\' NOT NULL,
            schritt VARCHAR(500) DEFAULT \'\' NOT NULL,
            PRIMARY KEY(id)
        )');

        $this->addSql('CREATE TABLE initiative (
            id BIGINT NOT NULL,
            name VARCHAR(255) DEFAULT \'\' NOT NULL,
            team BIGINT DEFAULT NULL,
            status VARCHAR(20) DEFAULT \'grey\' NOT NULL,
            projektstatus VARCHAR(20) DEFAULT \'ok\' NOT NULL,
            schritt VARCHAR(500) DEFAULT \'\' NOT NULL,
            frist VARCHAR(20) DEFAULT \'\' NOT NULL,
            notiz TEXT DEFAULT \'\' NOT NULL,
            PRIMARY KEY(id)
        )');

        $this->addSql('CREATE TABLE nicht_vergessen (
            id BIGINT NOT NULL,
            title VARCHAR(255) DEFAULT \'\' NOT NULL,
            body TEXT DEFAULT \'\' NOT NULL,
            PRIMARY KEY(id)
        )');

        $this->addSql('CREATE TABLE metadata (
            id INTEGER NOT NULL,
            kw VARCHAR(20) DEFAULT \'\' NOT NULL,
            PRIMARY KEY(id)
        )');

        $this->addSql("INSERT INTO metadata (id, kw) VALUES (1, '')");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE team');
        $this->addSql('DROP TABLE initiative');
        $this->addSql('DROP TABLE nicht_vergessen');
        $this->addSql('DROP TABLE metadata');
    }
}
