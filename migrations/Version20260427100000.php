<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260427100000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add team_share and initiative_share tables for team/initiative sharing between users';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE team_share (
            id SERIAL NOT NULL,
            team_id BIGINT NOT NULL,
            shared_with_id INT NOT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('COMMENT ON COLUMN team_share.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('ALTER TABLE team_share ADD CONSTRAINT FK_TEAM_SHARE_TEAM FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE team_share ADD CONSTRAINT FK_TEAM_SHARE_USER FOREIGN KEY (shared_with_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_TEAM_SHARE_TEAM ON team_share (team_id)');
        $this->addSql('CREATE INDEX IDX_TEAM_SHARE_USER ON team_share (shared_with_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_TEAM_SHARE ON team_share (team_id, shared_with_id)');

        $this->addSql('CREATE TABLE initiative_share (
            id SERIAL NOT NULL,
            initiative BIGINT NOT NULL,
            shared_with_id INT NOT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('COMMENT ON COLUMN initiative_share.created_at IS \'(DC2Type:datetime_immutable)\'');
        $this->addSql('ALTER TABLE initiative_share ADD CONSTRAINT FK_INITIATIVE_SHARE_USER FOREIGN KEY (shared_with_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_INITIATIVE_SHARE_INITIATIVE ON initiative_share (initiative)');
        $this->addSql('CREATE INDEX IDX_INITIATIVE_SHARE_USER ON initiative_share (shared_with_id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_INITIATIVE_SHARE ON initiative_share (initiative, shared_with_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE team_share DROP CONSTRAINT FK_TEAM_SHARE_TEAM');
        $this->addSql('ALTER TABLE team_share DROP CONSTRAINT FK_TEAM_SHARE_USER');
        $this->addSql('DROP TABLE team_share');

        $this->addSql('ALTER TABLE initiative_share DROP CONSTRAINT FK_INITIATIVE_SHARE_USER');
        $this->addSql('DROP TABLE initiative_share');
    }
}
