<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Customer;
use App\Entity\User;
use App\Repository\CustomerRepository;
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
#[Route('/api/kunden')]
class KundenController extends AbstractController
{
    public function __construct(
        private readonly CustomerRepository $customerRepository,
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
            $this->validator->validate(['kunden' => [$data]], ['kunden']);
        } catch (ValidationException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $customer = Customer::fromArray($data);
        $this->em->persist($customer);
        $this->em->flush();

        $this->logger->info('Kunde erstellt', ['kundeId' => $customer->getId(), 'userId' => $user->getId()]);

        return $this->json($customer->toArray(), Response::HTTP_CREATED);
    }

    #[Route('/{id}', methods: ['PUT'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $customer = $this->customerRepository->find($id);
        if ($customer === null) {
            return $this->json(['error' => 'Kunde nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Ungültiges JSON.'], Response::HTTP_BAD_REQUEST);
        }

        $customer->updateFromArray($data);
        $this->em->flush();

        $this->logger->info('Kunde aktualisiert', ['kundeId' => $id]);

        return $this->json($customer->toArray());
    }

    #[Route('/{id}', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $customer = $this->customerRepository->find($id);
        if ($customer === null) {
            return $this->json(['error' => 'Kunde nicht gefunden.'], Response::HTTP_NOT_FOUND);
        }

        $this->em->remove($customer);
        $this->em->flush();

        $this->logger->info('Kunde gelöscht', ['kundeId' => $id]);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
