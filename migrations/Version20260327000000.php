<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260327000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove beschreibung column from milestone table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE milestone DROP COLUMN beschreibung');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE milestone ADD COLUMN beschreibung TEXT DEFAULT '' NOT NULL");
    }
}
