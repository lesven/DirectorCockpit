<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Milestone;
use App\Entity\User;
use App\Repository\MilestoneRepository;
use App\Security\Voter\MilestoneVoter;
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
#[Route('/api/milestones')]
class MilestoneController extends AbstractController
{
    public function __construct(
        private readonly MilestoneRepository $milestoneRepository,
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

        try {
            $this->validator->validate(['milestones' => [$data]], ['milestones']);
        } catch (ValidationException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $milestone = Milestone::fromArray($data);
        $this->em->persist($milestone);
        $this->em->flush();

        $this->logger->info('Milestone erstellt', ['milestoneId' => $milestone->getId(), 'userId' => $user->getId()]);

        return $this->json($milestone->toArray(), Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $milestone = $this->milestoneRepository->find($id);
        if ($milestone === null) {
            return $this->json(['error' => 'Milestone nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(MilestoneVoter::EDIT, $milestone);

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Ungültiges JSON.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $data['id'] = $id;
            $this->validator->validate(['milestones' => [$data]], ['milestones']);
        } catch (ValidationException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $milestone->updateFromArray($data);
        $this->em->flush();

        $this->logger->info('Milestone aktualisiert', ['milestoneId' => $id]);

        return $this->json($milestone->toArray());
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $milestone = $this->milestoneRepository->find($id);
        if ($milestone === null) {
            return $this->json(['error' => 'Milestone nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(MilestoneVoter::DELETE, $milestone);

        $this->em->remove($milestone);
        $this->em->flush();

        $this->logger->info('Milestone gelöscht', ['milestoneId' => $id]);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
