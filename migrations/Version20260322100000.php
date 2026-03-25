<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Fügt die vier WSJF-Bewertungsfelder zur initiative-Tabelle hinzu:
 * business_value, time_criticality, risk_reduction, job_size (alle nullable integer).
 */
final class Version20260322100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add WSJF scoring columns to initiative table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE initiative ADD COLUMN business_value INTEGER DEFAULT NULL');
        $this->addSql('ALTER TABLE initiative ADD COLUMN time_criticality INTEGER DEFAULT NULL');
        $this->addSql('ALTER TABLE initiative ADD COLUMN risk_reduction INTEGER DEFAULT NULL');
        $this->addSql('ALTER TABLE initiative ADD COLUMN job_size INTEGER DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE initiative DROP COLUMN business_value');
        $this->addSql('ALTER TABLE initiative DROP COLUMN time_criticality');
        $this->addSql('ALTER TABLE initiative DROP COLUMN risk_reduction');
        $this->addSql('ALTER TABLE initiative DROP COLUMN job_size');
    }
}
