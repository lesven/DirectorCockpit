<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\InitiativeShare;
use App\Entity\User;
use App\Repository\InitiativeRepository;
use App\Repository\InitiativeShareRepository;
use App\Repository\UserRepository;
use App\Security\Voter\InitiativeVoter;
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
#[Route('/api/initiatives/{initiativeId}/shares')]
class InitiativeShareController extends AbstractController
{
    public function __construct(
        private readonly InitiativeRepository $initiativeRepository,
        private readonly InitiativeShareRepository $initiativeShareRepository,
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {}

    #[Route('', methods: ['GET'])]
    public function list(int $initiativeId): JsonResponse
    {
        $initiative = $this->initiativeRepository->find($initiativeId);
        if ($initiative === null) {
            return $this->json(['error' => 'Initiative nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(InitiativeVoter::VIEW, $initiative);

        $shares = $this->initiativeShareRepository->findByInitiativeId($initiativeId);
        $result = array_map(
            fn(InitiativeShare $s) => ['id' => $s->getSharedWith()->getId(), 'email' => $s->getSharedWith()->getEmail()],
            $shares,
        );

        return $this->json($result);
    }

    #[Route('', methods: ['POST'])]
    public function add(int $initiativeId, Request $request, #[CurrentUser] User $currentUser): JsonResponse
    {
        $initiative = $this->initiativeRepository->find($initiativeId);
        if ($initiative === null) {
            return $this->json(['error' => 'Initiative nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(InitiativeVoter::MANAGE, $initiative);

        $body = json_decode($request->getContent(), true);
        if (!is_array($body) || !isset($body['userId']) || !is_int($body['userId'])) {
            return $this->json(['error' => 'Ungültige Anfrage. userId erwartet.'], Response::HTTP_BAD_REQUEST);
        }

        $targetUser = $this->userRepository->find($body['userId']);
        if (!$targetUser instanceof User) {
            return $this->json(['error' => 'Benutzer nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        if ($this->initiativeShareRepository->findOneByInitiativeIdAndUser($initiativeId, $targetUser) !== null) {
            return $this->json(['error' => 'Initiative ist mit diesem Benutzer bereits geteilt.'], Response::HTTP_CONFLICT);
        }

        $share = new InitiativeShare($initiativeId, $targetUser);
        $this->em->persist($share);
        $this->em->flush();

        $this->logger->info('Initiative geteilt', [
            'initiativeId' => $initiativeId,
            'sharedWithUserId' => $targetUser->getId(),
            'byUserId' => $currentUser->getId(),
        ]);

        return $this->json(['id' => $targetUser->getId(), 'email' => $targetUser->getEmail()], Response::HTTP_CREATED);
    }

    #[Route('/{userId}', methods: ['DELETE'])]
    public function remove(int $initiativeId, int $userId, #[CurrentUser] User $currentUser): JsonResponse
    {
        $initiative = $this->initiativeRepository->find($initiativeId);
        if ($initiative === null) {
            return $this->json(['error' => 'Initiative nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(InitiativeVoter::MANAGE, $initiative);

        $targetUser = $this->userRepository->find($userId);
        if (!$targetUser instanceof User) {
            return $this->json(['error' => 'Benutzer nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $share = $this->initiativeShareRepository->findOneByInitiativeIdAndUser($initiativeId, $targetUser);
        if ($share === null) {
            return $this->json(['error' => 'Freigabe nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->em->remove($share);
        $this->em->flush();

        $this->logger->info('Initiative-Freigabe entfernt', [
            'initiativeId' => $initiativeId,
            'removedUserId' => $userId,
            'byUserId' => $currentUser->getId(),
        ]);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
