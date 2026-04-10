<?php

namespace App\Domain\Service;

/**
 * Simple Feature-Flag-System für schrittweise Refactorings.
 * Flags können über Umgebungsvariablen oder Konstruktor gesteuert werden.
 *
 * Verwendung:
 *   - Production: Flags nur über .env setzen
 *   - Testing: Flags im Test setzen via `FeatureFlags::set('FLAG_NAME', true)`
 */
final class FeatureFlags
{
    /**
     * Flag-Registrierung mit Defaults.
     * Neu hinzukommen Flags sollten hier als `'FLAG_NAME' => false` eingetragen werden
     * und dann per 'FEATURE_FLAG_NAME' in .env überschrieben.
     *
     * @var array<string, bool>
     */
    private static array $registered = [
        'DEADLINE_FROM_MIXED' => false, // Parsing-Logik aus parseFrist() - Migration zu Deadline::fromMixed()
    ];

    /**
     * Runtime-Overrides (für Tests/Debugging).
     *
     * @var array<string, bool>
     */
    private static array $overrides = [];

    /**
     * Initialisiert Flags aus Umgebungsvariablen.
     * Wird beim Dependency-Injection-Container aufgerufen.
     */
    public static function initialize(): void
    {
        foreach (array_keys(self::$registered) as $flagName) {
            $envKey = 'FEATURE_FLAG_' . $flagName;
            $envValue = self::getEnv($envKey);

            if ($envValue !== null) {
                self::$registered[$flagName] = filter_var($envValue, FILTER_VALIDATE_BOOLEAN);
            }
        }
    }

    /**
     * Hole Umgebungsvariablen aus globalen Quellen.
     * Kapselt Superglobal-Zugriff wie pro PHPMD-Guidelines.
     */
    private static function getEnv(string $key): ?string
    {
        return $_ENV[$key] ?? $_SERVER[$key] ?? null;
    }

    /**
     * Prüfe, ob ein Feature-Flag aktiviert ist.
     */
    public static function isEnabled(string $flagName): bool
    {
        // Override hat Vorrang (für Tests)
        if (array_key_exists($flagName, self::$overrides)) {
            return self::$overrides[$flagName];
        }

        return self::$registered[$flagName] ?? false;
    }

    /**
     * Setze ein Flag zur Laufzeit (nur für Testing/Debugging!).
     */
    public static function set(string $flagName, bool $enabled): void
    {
        // Automatisch registrieren falls nicht bekannt
        if (!array_key_exists($flagName, self::$registered)) {
            self::$registered[$flagName] = false;
        }
        self::$overrides[$flagName] = $enabled;
    }

    /**
     * Zurücksetzen auf Umgebungsvariablen (nach Tests).
     */
    public static function reset(string $flagName = null): void
    {
        if ($flagName === null) {
            self::$overrides = [];
            return;
        }
        unset(self::$overrides[$flagName]);
    }

    /**
     * Gibt alle Flags mit ihren aktuellen Werten zurück (Debug-Zwecke).
     *
     * @return array<string, bool>
     */
    public static function all(): array
    {
        $result = [];
        foreach (array_keys(self::$registered) as $flagName) {
            $result[$flagName] = self::isEnabled($flagName);
        }
        return $result;
    }
}
