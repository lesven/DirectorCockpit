<?php

namespace App\Controller;

use App\Service\CockpitSyncService;
use App\Service\SyncException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class CockpitApiController extends AbstractController
{
    public function __construct(
        private CockpitSyncService $syncService,
    ) {}

    #[Route('/api/cockpit', methods: ['GET'])]
    public function load(): JsonResponse
    {
        return $this->json($this->syncService->loadAll());
    }

    #[Route('/api/cockpit', methods: ['PUT'])]
    public function save(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Ungültiges JSON'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->syncService->syncAll($payload);
        } catch (SyncException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json(['status' => 'ok']);
    }
}
