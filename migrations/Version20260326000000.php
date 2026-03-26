<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Konvertiert frist-Felder in initiative und milestone von VARCHAR(20) auf DATE NULL.
 *
 * Unterstützte Eingangsformate:  YYYY-MM-DD  |  DD.MM.YYYY
 * Ungültige Werte werden auf NULL gesetzt; eine Warnung erscheint auf der Konsole.
 */
final class Version20260326000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Konvertiert frist (VARCHAR→DATE NULL) in initiative und milestone; migriert Bestandsdaten';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE milestone  ADD COLUMN frist_new DATE DEFAULT NULL');
        $this->addSql('ALTER TABLE initiative ADD COLUMN frist_new DATE DEFAULT NULL');
    }

    public function postUp(Schema $schema): void
    {
        $this->migrateFristColumn('milestone');
        $this->migrateFristColumn('initiative');

        $this->connection->executeStatement('ALTER TABLE milestone  DROP COLUMN frist');
        $this->connection->executeStatement('ALTER TABLE milestone  RENAME COLUMN frist_new TO frist');
        $this->connection->executeStatement('ALTER TABLE initiative DROP COLUMN frist');
        $this->connection->executeStatement('ALTER TABLE initiative RENAME COLUMN frist_new TO frist');
    }

    private function migrateFristColumn(string $table): void
    {
        /** @var list<array{id: mixed, frist: string}> $rows */
        $rows = $this->connection->fetchAllAssociative(
            "SELECT id, frist FROM {$table} WHERE frist IS NOT NULL AND frist <> ''"
        );

        foreach ($rows as $row) {
            $converted = $this->parseDate((string) $row['frist']);
            if ($converted !== null) {
                $this->connection->executeStatement(
                    "UPDATE {$table} SET frist_new = ? WHERE id = ?",
                    [$converted, $row['id']]
                );
            } else {
                $this->write(sprintf(
                    '<warning>%s[id=%s].frist="%s" konnte nicht geparst werden – wird auf NULL gesetzt</warning>',
                    $table,
                    (string) $row['id'],
                    $row['frist']
                ));
            }
        }
    }

    /** Parst DD.MM.YYYY oder YYYY-MM-DD; gibt SQL-Datumsstring oder null zurück. */
    private function parseDate(string $value): ?string
    {
        $date = \DateTimeImmutable::createFromFormat('Y-m-d', $value);
        if ($date !== false && $date->format('Y-m-d') === $value) {
            return $date->format('Y-m-d');
        }

        $date = \DateTimeImmutable::createFromFormat('d.m.Y', $value);
        if ($date !== false) {
            return $date->format('Y-m-d');
        }

        return null;
    }

    public function down(Schema $schema): void
    {
        $this->addSql("ALTER TABLE milestone  ADD COLUMN frist_old VARCHAR(20) DEFAULT '' NOT NULL");
        $this->addSql("ALTER TABLE initiative ADD COLUMN frist_old VARCHAR(20) DEFAULT '' NOT NULL");
    }

    public function postDown(Schema $schema): void
    {
        foreach (['milestone', 'initiative'] as $table) {
            $rows = $this->connection->fetchAllAssociative(
                "SELECT id, frist FROM {$table} WHERE frist IS NOT NULL"
            );
            foreach ($rows as $row) {
                $this->connection->executeStatement(
                    "UPDATE {$table} SET frist_old = ? WHERE id = ?",
                    [$row['frist'], $row['id']]
                );
            }
            $this->connection->executeStatement("ALTER TABLE {$table} DROP COLUMN frist");
            $this->connection->executeStatement("ALTER TABLE {$table} RENAME COLUMN frist_old TO frist");
        }
    }
}
