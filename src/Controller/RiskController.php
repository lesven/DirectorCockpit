<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Risk;
use App\Entity\User;
use App\Repository\RiskRepository;
use App\Security\Voter\RiskVoter;
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
#[Route('/api/risks')]
class RiskController extends AbstractController
{
    public function __construct(
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

        try {
            $this->validator->validate(['risks' => [$data]], ['risks']);
        } catch (ValidationException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $risk = Risk::fromArray($data);
        $this->em->persist($risk);
        $this->em->flush();

        $this->logger->info('Risk erstellt', ['riskId' => $risk->getId(), 'userId' => $user->getId()]);

        return $this->json($risk->toArray(), Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $risk = $this->riskRepository->find($id);
        if ($risk === null) {
            return $this->json(['error' => 'Risk nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(RiskVoter::EDIT, $risk);

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Ungültiges JSON.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $data['id'] = $id;
            $this->validator->validate(['risks' => [$data]], ['risks']);
        } catch (ValidationException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $risk->updateFromArray($data);
        $this->em->flush();

        $this->logger->info('Risk aktualisiert', ['riskId' => $id]);

        return $this->json($risk->toArray());
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $risk = $this->riskRepository->find($id);
        if ($risk === null) {
            return $this->json(['error' => 'Risk nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(RiskVoter::DELETE, $risk);

        $this->em->remove($risk);
        $this->em->flush();

        $this->logger->info('Risk gelöscht', ['riskId' => $id]);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
