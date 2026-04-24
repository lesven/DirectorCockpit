<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Entity\User;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Event\AuthenticationSuccessEvent;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\Event\LoginFailureEvent;
use Symfony\Component\Security\Http\Event\LoginSuccessEvent;
use Symfony\Component\Security\Http\Event\LogoutEvent;

class AuthenticationListener
{
    public function __construct(private readonly LoggerInterface $logger) {}

    #[AsEventListener(event: LoginSuccessEvent::class)]
    public function onLoginSuccess(LoginSuccessEvent $event): void
    {
        $user = $event->getAuthenticatedToken()->getUser();
        $email = $user instanceof User ? $user->getEmail() : (string) $user;
        $ip = $event->getRequest()->getClientIp();

        $this->logger->info('Login erfolgreich', [
            'email' => $email,
            'ip' => $ip,
        ]);
    }

    #[AsEventListener(event: LoginFailureEvent::class)]
    public function onLoginFailure(LoginFailureEvent $event): void
    {
        $ip = $event->getRequest()->getClientIp();
        $body = json_decode($event->getRequest()->getContent(), true);
        $email = is_array($body) ? ($body['email'] ?? 'unknown') : 'unknown';

        $this->logger->warning('Login fehlgeschlagen', [
            'email' => $email,
            'ip' => $ip,
            'reason' => $event->getException()->getMessageKey(),
        ]);
    }

    #[AsEventListener(event: LogoutEvent::class)]
    public function onLogout(LogoutEvent $event): void
    {
        $token = $event->getToken();
        $user = $token?->getUser();
        $email = $user instanceof User ? $user->getEmail() : 'unknown';
        $ip = $event->getRequest()->getClientIp();

        $this->logger->info('Logout', [
            'email' => $email,
            'ip' => $ip,
        ]);
    }
}
