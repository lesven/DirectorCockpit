<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_USER')]
class UserSearchController extends AbstractController
{
    public function __construct(private readonly UserRepository $userRepository)
    {
    }

    /**
     * GET /api/users?q={search} — Returns up to 10 users matching the email fragment.
     * Excludes the currently authenticated user.
     */
    #[Route('/api/users', methods: ['GET'])]
    public function search(Request $request, #[CurrentUser] User $currentUser): JsonResponse
    {
        $query = trim((string) $request->query->get('q', ''));

        if ($query === '' || mb_strlen($query) < 2) {
            return $this->json([]);
        }

        $users = $this->userRepository->searchByEmail($query, $currentUser);

        return $this->json(array_map(
            fn(User $u) => ['id' => $u->getId(), 'email' => $u->getEmail()],
            $users,
        ));
    }
}
