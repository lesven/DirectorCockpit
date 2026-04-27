<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260424100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add created_by_id to team and nicht_vergessen for ownership-based visibility';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE team ADD created_by_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE team ADD CONSTRAINT FK_TEAM_CREATED_BY FOREIGN KEY (created_by_id) REFERENCES "user" (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_TEAM_CREATED_BY ON team (created_by_id)');

        $this->addSql('ALTER TABLE nicht_vergessen ADD created_by_id INT DEFAULT NULL');
        $this->addSql('ALTER TABLE nicht_vergessen ADD CONSTRAINT FK_NV_CREATED_BY FOREIGN KEY (created_by_id) REFERENCES "user" (id) ON DELETE SET NULL');
        $this->addSql('CREATE INDEX IDX_NV_CREATED_BY ON nicht_vergessen (created_by_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE team DROP CONSTRAINT FK_TEAM_CREATED_BY');
        $this->addSql('DROP INDEX IDX_TEAM_CREATED_BY');
        $this->addSql('ALTER TABLE team DROP created_by_id');

        $this->addSql('ALTER TABLE nicht_vergessen DROP CONSTRAINT FK_NV_CREATED_BY');
        $this->addSql('DROP INDEX IDX_NV_CREATED_BY');
        $this->addSql('ALTER TABLE nicht_vergessen DROP created_by_id');
    }
}
