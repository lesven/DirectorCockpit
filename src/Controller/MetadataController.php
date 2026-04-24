<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\MetadataRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_USER')]
class MetadataController extends AbstractController
{
    public function __construct(
        private readonly MetadataRepository $metaRepo,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
    ) {}

    #[Route('/api/metadata', methods: ['PUT'])]
    public function update(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Ungültiges JSON.'], Response::HTTP_BAD_REQUEST);
        }

        $meta = $this->metaRepo->getOrCreate();
        $meta->setKw($data['kw'] ?? '');
        $this->em->flush();

        $this->logger->info('Metadata aktualisiert', ['kw' => $data['kw'] ?? '']);

        return $this->json(['kw' => $meta->getKw()]);
    }
}
