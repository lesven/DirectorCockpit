<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260407200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add nullable customer_id FK to initiative table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE initiative ADD COLUMN customer_id BIGINT DEFAULT NULL');
        $this->addSql('ALTER TABLE initiative ADD CONSTRAINT fk_initiative_customer FOREIGN KEY (customer_id) REFERENCES customer(id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE initiative DROP CONSTRAINT fk_initiative_customer');
        $this->addSql('ALTER TABLE initiative DROP COLUMN customer_id');
    }
}
