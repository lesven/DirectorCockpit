<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260324000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Increase schritt field length from 500 to 550 characters';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            ALTER TABLE initiative
                ALTER COLUMN schritt TYPE VARCHAR(550)
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            ALTER TABLE initiative
                ALTER COLUMN schritt TYPE VARCHAR(500)
        SQL);
    }
}
