<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260322200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove sub column from team table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE team DROP COLUMN sub');
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE team ADD COLUMN sub VARCHAR(255) DEFAULT '' NOT NULL");
    }
}
