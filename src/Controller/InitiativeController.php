<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Initiative;
use App\Entity\Team;
use App\Entity\User;
use App\Repository\InitiativeRepository;
use App\Repository\MilestoneRepository;
use App\Repository\RiskRepository;
use App\Repository\TeamRepository;
use App\Security\Voter\InitiativeVoter;
use App\Security\Voter\TeamVoter;
use App\Service\PayloadValidatorInterface;
use App\Service\ValidationException;
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
#[Route('/api/initiatives')]
class InitiativeController extends AbstractController
{
    public function __construct(
        private readonly InitiativeRepository $initiativeRepository,
        private readonly TeamRepository $teamRepository,
        private readonly MilestoneRepository $milestoneRepository,
        private readonly RiskRepository $riskRepository,
        private readonly EntityManagerInterface $em,
        private readonly PayloadValidatorInterface $validator,
        private readonly LoggerInterface $logger,
    ) {}

    #[Route('', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['id'])) {
            return $this->json(['error' => 'Ungültige Anfrage.'], Response::HTTP_BAD_REQUEST);
        }

        $teamId = $data['team'] ?? null;
        if ($teamId === null && !$user->isAdmin()) {
            return $this->json(['error' => 'Team ist erforderlich.'], Response::HTTP_BAD_REQUEST);
        }

        if ($teamId !== null) {
            $team = $this->teamRepository->find($teamId);
            if (!$team instanceof Team) {
                return $this->json(['error' => 'Team nicht gefunden.'], Response::HTTP_BAD_REQUEST);
            }
            $this->denyAccessUnlessGranted(TeamVoter::EDIT, $team);
        }

        try {
            $this->validator->validate(['initiatives' => [$data]], ['initiatives']);
        } catch (ValidationException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $initiative = Initiative::fromArray($data);
        $this->em->persist($initiative);
        $this->em->flush();

        $this->logger->info('Initiative erstellt', ['initiativeId' => $initiative->getId(), 'userId' => $user->getId()]);

        return $this->json($initiative->toArray(), Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $initiative = $this->initiativeRepository->find($id);
        if ($initiative === null) {
            return $this->json(['error' => 'Initiative nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(InitiativeVoter::EDIT, $initiative);

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Ungültiges JSON.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $data['id'] = $id;
            $this->validator->validate(['initiatives' => [$data]], ['initiatives']);
        } catch (ValidationException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $initiative->updateFromArray($data);
        $this->em->flush();

        $this->logger->info('Initiative aktualisiert', ['initiativeId' => $id]);

        return $this->json($initiative->toArray());
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $initiative = $this->initiativeRepository->find($id);
        if ($initiative === null) {
            return $this->json(['error' => 'Initiative nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(InitiativeVoter::DELETE, $initiative);

        $milestones = $this->milestoneRepository->findByInitiativeIds([$id]);
        foreach ($milestones as $milestone) {
            $this->em->remove($milestone);
        }

        $risks = $this->riskRepository->findByInitiativeIds([$id]);
        foreach ($risks as $risk) {
            $this->em->remove($risk);
        }

        $this->em->remove($initiative);
        $this->em->flush();

        $this->logger->info('Initiative gelöscht (inkl. Milestones/Risks)', ['initiativeId' => $id]);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
