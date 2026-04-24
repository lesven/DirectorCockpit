<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\NichtVergessen;
use App\Entity\User;
use App\Repository\NichtVergessenRepository;
use App\Security\Voter\NichtVergessenVoter;
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
#[Route('/api/nicht-vergessen')]
class NichtVergessenController extends AbstractController
{
    public function __construct(
        private readonly NichtVergessenRepository $nvRepository,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {}

    #[Route('', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['id'])) {
            return $this->json(['error' => 'Ungültige Anfrage.'], Response::HTTP_BAD_REQUEST);
        }

        $nv = NichtVergessen::fromArray($data);
        $nv->setCreatedBy($user);

        $this->em->persist($nv);
        $this->em->flush();

        $this->logger->info('NichtVergessen erstellt', ['nvId' => $nv->getId(), 'userId' => $user->getId()]);

        return $this->json($nv->toArray(), Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $nv = $this->nvRepository->find($id);
        if ($nv === null) {
            return $this->json(['error' => 'NichtVergessen nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(NichtVergessenVoter::EDIT, $nv);

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Ungültiges JSON.'], Response::HTTP_BAD_REQUEST);
        }

        $nv->updateFromArray($data);
        $this->em->flush();

        $this->logger->info('NichtVergessen aktualisiert', ['nvId' => $id]);

        return $this->json($nv->toArray());
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $nv = $this->nvRepository->find($id);
        if ($nv === null) {
            return $this->json(['error' => 'NichtVergessen nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(NichtVergessenVoter::DELETE, $nv);

        $this->em->remove($nv);
        $this->em->flush();

        $this->logger->info('NichtVergessen gelöscht', ['nvId' => $id]);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
