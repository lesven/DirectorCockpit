<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Team;
use App\Entity\TeamShare;
use App\Entity\User;
use App\Repository\TeamRepository;
use App\Repository\TeamShareRepository;
use App\Repository\UserRepository;
use App\Security\Voter\TeamVoter;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_USER')]
#[Route('/api/teams/{teamId}/shares')]
class TeamShareController extends AbstractController
{
    public function __construct(
        private readonly TeamRepository $teamRepository,
        private readonly TeamShareRepository $teamShareRepository,
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {}

    #[Route('', methods: ['GET'])]
    public function list(int $teamId): JsonResponse
    {
        $team = $this->teamRepository->find($teamId);
        if ($team === null) {
            return $this->json(['error' => 'Team nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::VIEW, $team);

        $shares = $this->teamShareRepository->findByTeam($team);
        $result = array_map(
            fn(TeamShare $s) => ['id' => $s->getSharedWith()->getId(), 'email' => $s->getSharedWith()->getEmail()],
            $shares,
        );

        return $this->json($result);
    }

    #[Route('', methods: ['POST'])]
    public function add(int $teamId, Request $request, #[CurrentUser] User $currentUser): JsonResponse
    {
        $team = $this->teamRepository->find($teamId);
        if ($team === null) {
            return $this->json(['error' => 'Team nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        $targetUserOrError = $this->resolveTargetUser($request);
        if ($targetUserOrError instanceof JsonResponse) {
            return $targetUserOrError;
        }

        $validationError = $this->validateShare($team, $targetUserOrError);
        if ($validationError !== null) {
            return $validationError;
        }

        $share = new TeamShare($team, $targetUserOrError);
        $this->em->persist($share);
        $this->em->flush();

        $this->logger->info('Team geteilt', [
            'teamId' => $teamId,
            'sharedWithUserId' => $targetUserOrError->getId(),
            'byUserId' => $currentUser->getId(),
        ]);

        return $this->json(['id' => $targetUserOrError->getId(), 'email' => $targetUserOrError->getEmail()], Response::HTTP_CREATED);
    }

    private function resolveTargetUser(Request $request): User|JsonResponse
    {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body) || !isset($body['userId']) || !is_int($body['userId'])) {
            return $this->json(['error' => 'Ungültige Anfrage. userId erwartet.'], Response::HTTP_BAD_REQUEST);
        }

        $user = $this->userRepository->find($body['userId']);
        if (!$user instanceof User) {
            return $this->json(['error' => 'Benutzer nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        return $user;
    }

    private function validateShare(Team $team, User $targetUser): ?JsonResponse
    {
        $owner = $team->getCreatedBy();
        if ($owner !== null && $owner->getId() === $targetUser->getId()) {
            return $this->json(['error' => 'Der Team-Inhaber kann nicht geteilt werden.'], Response::HTTP_BAD_REQUEST);
        }

        if ($this->teamShareRepository->findOneByTeamAndUser($team, $targetUser) !== null) {
            return $this->json(['error' => 'Team ist mit diesem Benutzer bereits geteilt.'], Response::HTTP_CONFLICT);
        }

        return null;
    }

    #[Route('/{userId}', methods: ['DELETE'])]
    public function remove(int $teamId, int $userId, #[CurrentUser] User $currentUser): JsonResponse
    {
        $team = $this->teamRepository->find($teamId);
        if ($team === null) {
            return $this->json(['error' => 'Team nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        $targetUser = $this->userRepository->find($userId);
        if (!$targetUser instanceof User) {
            return $this->json(['error' => 'Benutzer nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $share = $this->teamShareRepository->findOneByTeamAndUser($team, $targetUser);
        if ($share === null) {
            return $this->json(['error' => 'Freigabe nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->em->remove($share);
        $this->em->flush();

        $this->logger->info('Team-Freigabe entfernt', [
            'teamId' => $teamId,
            'removedUserId' => $userId,
            'byUserId' => $currentUser->getId(),
        ]);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
