<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260325200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add bemerkung column to milestone table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("ALTER TABLE milestone ADD COLUMN bemerkung TEXT DEFAULT '' NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE milestone DROP COLUMN bemerkung');
    }
}
