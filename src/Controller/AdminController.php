<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Repository\TeamRepository;
use App\Repository\UserRepository;
use App\Service\UserService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_ADMIN')]
#[Route('/api/admin')]
class AdminController extends AbstractController
{
    public function __construct(
        private readonly UserService $userService,
        private readonly UserRepository $userRepository,
        private readonly TeamRepository $teamRepository,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {}

    /**
     * GET /api/admin/users — list all users.
     */
    #[Route('/users', name: 'admin_users_list', methods: ['GET'])]
    public function listUsers(): JsonResponse
    {
        $users = $this->userRepository->findAllOrderedByEmail();

        return new JsonResponse(array_map(static fn (User $u) => $u->toArray(), $users));
    }

    /**
     * POST /api/admin/users — create a new user.
     */
    #[Route('/users', name: 'admin_users_create', methods: ['POST'])]
    public function createUser(Request $request, #[CurrentUser] User $admin): JsonResponse
    {
        $body = json_decode($request->getContent(), true);
        $email = $body['email'] ?? '';
        $password = $body['password'] ?? '';
        $roles = $body['roles'] ?? ['ROLE_USER'];

        if (!is_string($email) || !is_string($password) || !is_array($roles)) {
            return new JsonResponse(['error' => 'Ungültige Anfrage.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $user = $this->userService->createUser($email, $password, $roles);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->logger->info('Admin hat neuen Benutzer angelegt', [
            'adminId' => $admin->getId(),
            'newUserId' => $user->getId(),
            'newUserEmail' => $user->getEmail(),
        ]);

        return new JsonResponse($user->toArray(), Response::HTTP_CREATED);
    }

    /**
     * PUT /api/admin/users/{id}/role — change user roles.
     */
    #[Route('/users/{id}/role', name: 'admin_users_role', methods: ['PUT'])]
    public function changeRole(int $id, Request $request, #[CurrentUser] User $admin): JsonResponse
    {
        $user = $this->userRepository->find($id);
        if ($user === null) {
            return new JsonResponse(['error' => 'Benutzer nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $body = json_decode($request->getContent(), true);
        $roles = $body['roles'] ?? null;

        if (!is_array($roles)) {
            return new JsonResponse(['error' => 'Ungültige Anfrage. "roles" muss ein Array sein.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->userService->changeRoles($user, $roles);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->logger->info('Admin hat Benutzerrolle geändert', [
            'adminId' => $admin->getId(),
            'targetUserId' => $user->getId(),
            'newRoles' => $roles,
        ]);

        return new JsonResponse($user->toArray());
    }

    /**
     * DELETE /api/admin/users/{id} — delete a user (cannot delete yourself).
     */
    #[Route('/users/{id}', name: 'admin_users_delete', methods: ['DELETE'])]
    public function deleteUser(int $id, #[CurrentUser] User $admin): JsonResponse
    {
        $user = $this->userRepository->find($id);
        if ($user === null) {
            return new JsonResponse(['error' => 'Benutzer nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->userService->deleteUser($user, $admin);
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->logger->info('Admin hat Benutzer gelöscht', [
            'adminId' => $admin->getId(),
            'deletedUserId' => $id,
        ]);

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/teams/{id}/owner', name: 'admin_teams_owner', methods: ['PUT'])]
    public function changeTeamOwner(int $id, Request $request, #[CurrentUser] User $admin): JsonResponse
    {
        $team = $this->teamRepository->find($id);
        if ($team === null) {
            return new JsonResponse(['error' => 'Team nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $body = json_decode($request->getContent(), true);
        $userId = $body['userId'] ?? null;

        if ($userId === null) {
            $team->setCreatedBy(null);
            $this->em->flush();

            $this->logger->info('Admin hat Team-Ersteller geändert', [
                'adminId' => $admin->getId(),
                'teamId' => $id,
                'newOwnerId' => $userId,
            ]);

            return new JsonResponse($team->toArray());
        }

        $user = $this->userRepository->find($userId);
        if ($user === null) {
            return new JsonResponse(['error' => 'Benutzer nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }
        $team->setCreatedBy($user);

        $this->em->flush();

        $this->logger->info('Admin hat Team-Ersteller geändert', [
            'adminId' => $admin->getId(),
            'teamId' => $id,
            'newOwnerId' => $userId,
        ]);

        return new JsonResponse($team->toArray());
    }

    #[Route('/teams', name: 'admin_teams_list', methods: ['GET'])]
    public function listTeams(): JsonResponse
    {
        $teams = $this->teamRepository->findBy([], ['id' => 'ASC']);

        return new JsonResponse(array_map(static fn($t) => $t->toArray(), $teams));
    }
}
