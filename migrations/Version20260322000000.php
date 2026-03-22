<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Fügt den Foreign-Key-Constraint initiative.team → team.id hinzu
 * und behebt die Typ-Inkonsistenz metadata.id (INTEGER → BIGINT).
 *
 * Voraussetzung (wurde geprüft): keine verwaisten initiative.team-Werte.
 *
 * Rollback: down() entfernt den FK und setzt metadata.id zurück auf INTEGER.
 */
final class Version20260322000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add FK initiative→team; fix metadata.id type INTEGER→BIGINT';
    }

    public function up(Schema $schema): void
    {
        // 4.3: metadata.id von INTEGER auf BIGINT angleichen (war inkonsistent).
        // PostgreSQL: ALTER COLUMN braucht USING-Cast bei Typ-Änderung.
        $this->addSql('ALTER TABLE metadata ALTER COLUMN id TYPE BIGINT USING id::BIGINT');

        // 4.2: Referenzielle Integrität für initiative.team → team.id.
        // ON DELETE SET NULL: löscht das Team, setzt initiative.team auf NULL
        // statt der Initiative zu blockieren oder sie zu löschen.
        $this->addSql('ALTER TABLE initiative ADD CONSTRAINT fk_initiative_team
            FOREIGN KEY (team) REFERENCES team (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE initiative DROP CONSTRAINT fk_initiative_team');
        $this->addSql('ALTER TABLE metadata ALTER COLUMN id TYPE INTEGER USING id::INTEGER');
    }
}
