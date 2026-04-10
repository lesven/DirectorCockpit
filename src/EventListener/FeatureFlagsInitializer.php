<?php

namespace App\EventListener;

use App\Domain\Service\FeatureFlags;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\KernelEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Initialisiert Feature-Flags aus Umgebungsvariablen beim AppStart.
 * Wird für jeden HTTP-Request aufgerufen (nur einmalig via Static Init).
 */
final class FeatureFlagsInitializer implements EventSubscriberInterface
{
    private static bool $initialized = false;

    /**
     * @return array<string, string>
     */
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => 'onRequest',
        ];
    }

    public function onRequest(KernelEvent $event): void
    {
        // Nur einmal beim AppStart initialisieren
        // Parameter wird von EventDispatcher-Interface verlangt
        unset($event);
        if (!self::$initialized) {
            FeatureFlags::initialize();
            self::$initialized = true;
        }
    }
}
