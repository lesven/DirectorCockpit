<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Team;
use App\Entity\User;
use App\Repository\TeamRepository;
use App\Repository\TeamShareRepository;
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
#[Route('/api/teams')]
class TeamController extends AbstractController
{
    public function __construct(
        private readonly TeamRepository $teamRepository,
        private readonly TeamShareRepository $teamShareRepository,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {}

    #[Route('/{id}', methods: ['GET'])]
    public function detail(int $id, #[CurrentUser] User $currentUser): JsonResponse
    {
        $team = $this->teamRepository->find($id);
        if ($team === null) {
            return $this->json(['error' => 'Team nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::VIEW, $team);

        $shares = $this->teamShareRepository->findByTeam($team);
        $owner = $team->getCreatedBy();
        $isOwner = $currentUser->isAdmin()
            || ($owner !== null && $owner->getId() === $currentUser->getId());

        return $this->json([
            'team' => $team->toArray(),
            'shares' => array_map(
                fn($s) => ['id' => $s->getSharedWith()->getId(), 'email' => $s->getSharedWith()->getEmail()],
                $shares,
            ),
            'isOwner' => $isOwner,
        ]);
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['id'])) {
            return $this->json(['error' => 'Ungültige Anfrage.'], Response::HTTP_BAD_REQUEST);
        }

        $team = Team::fromArray($data);
        $team->setCreatedBy($user);

        $this->em->persist($team);
        $this->em->flush();

        $this->logger->info('Team erstellt', ['teamId' => $team->getId(), 'userId' => $user->getId()]);

        return $this->json($team->toArray(), Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $team = $this->teamRepository->find($id);
        if ($team === null) {
            return $this->json(['error' => 'Team nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::EDIT, $team);

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Ungültiges JSON.'], Response::HTTP_BAD_REQUEST);
        }

        $team->updateFromArray($data);
        $this->em->flush();

        $this->logger->info('Team aktualisiert', ['teamId' => $id]);

        return $this->json($team->toArray());
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $team = $this->teamRepository->find($id);
        if ($team === null) {
            return $this->json(['error' => 'Team nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::DELETE, $team);

        $this->em->remove($team);
        $this->em->flush();

        $this->logger->info('Team gelöscht', ['teamId' => $id]);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
