<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\UserService;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

class AuthController extends AbstractController
{
    public function __construct(
        private readonly UserService $userService,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * POST /api/login is handled by Symfony's json_login authenticator (see security.yaml).
     * This action is never called directly; the route just needs to exist for the check_path.
     */
    #[Route('/api/login', name: 'api_login', methods: ['POST'])]
    public function login(): JsonResponse
    {
        // Handled by json_login authenticator + AuthenticationSuccessHandler / AuthenticationFailureHandler
        return new JsonResponse(['error' => 'Login-Verarbeitung fehlgeschlagen.'], Response::HTTP_UNAUTHORIZED);
    }

    /**
     * POST /api/logout is handled by Symfony's logout handler (see security.yaml).
     * This action is never called directly.
     */
    #[Route('/api/logout', name: 'api_logout', methods: ['POST'])]
    public function logout(): never
    {
        throw new \LogicException('This method should never be reached. Symfony handles logout.');
    }

    /**
     * GET /api/me — returns current user data or 401.
     */
    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function me(#[CurrentUser] ?User $user): JsonResponse
    {
        if ($user === null) {
            return new JsonResponse(['error' => 'Nicht eingeloggt.'], Response::HTTP_UNAUTHORIZED);
        }

        return new JsonResponse($user->toArray());
    }

    /**
     * PUT /api/user/password — changes the password of the currently logged-in user.
     */
    #[Route('/api/user/password', name: 'api_user_password', methods: ['PUT'])]
    public function changePassword(Request $request, #[CurrentUser] ?User $user): JsonResponse
    {
        if ($user === null) {
            return new JsonResponse(['error' => 'Nicht eingeloggt.'], Response::HTTP_UNAUTHORIZED);
        }

        $body = json_decode($request->getContent(), true);
        $currentPassword = $body['currentPassword'] ?? '';
        $newPassword = $body['newPassword'] ?? '';

        if (!is_string($currentPassword) || !is_string($newPassword)) {
            return new JsonResponse(['error' => 'Ungültige Anfrage.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->userService->changePassword($user, $currentPassword, $newPassword);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->logger->info('Passwort geändert', ['userId' => $user->getId(), 'email' => $user->getEmail()]);

        return new JsonResponse(['message' => 'Passwort erfolgreich geändert.']);
    }
}
