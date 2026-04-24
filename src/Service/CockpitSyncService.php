<?php

namespace App\Service;

use App\Entity\SyncableEntity;
use App\Entity\User;
use App\Repository\InitiativeRepository;
use App\Repository\MetadataRepository;
use App\Repository\MilestoneRepository;
use App\Repository\NichtVergessenRepository;
use App\Repository\RiskRepository;
use App\Repository\TeamRepository;
use Doctrine\ORM\EntityManagerInterface;

class CockpitSyncService
{
    public function __construct(
        private EntityManagerInterface $em,
        private MetadataRepository $metaRepo,
        private InitiativeRepository $initiativeRepo,
        private TeamRepository $teamRepo,
        private NichtVergessenRepository $nvRepo,
        private MilestoneRepository $milestoneRepo,
        private RiskRepository $riskRepo,
    ) {}

    /** @return array<string, mixed> */
    public function loadForUser(User $user): array
    {
        $meta = $this->metaRepo->getOrCreate();
        $result = ['kw' => $meta->getKw()];

        $teams = $this->teamRepo->findVisibleByUser($user);
        $result['teams'] = array_map(fn(SyncableEntity $e) => $e->toArray(), $teams);

        $teamIds = array_map(fn($t) => $t->getId(), $teams);

        $initiatives = $this->initiativeRepo->findByTeamIdsWithBlockedBy($teamIds);
        $result['initiatives'] = array_map(fn(SyncableEntity $e) => $e->toArray(), $initiatives);

        $initiativeIds = array_map(fn($i) => $i->getId(), $initiatives);

        $milestones = $this->milestoneRepo->findByInitiativeIds($initiativeIds);
        $result['milestones'] = array_map(fn(SyncableEntity $e) => $e->toArray(), $milestones);

        $risks = $this->riskRepo->findByInitiativeIds($initiativeIds);
        $result['risks'] = array_map(fn(SyncableEntity $e) => $e->toArray(), $risks);

        $nvEntities = $this->nvRepo->findVisibleByUser($user);
        $result['nicht_vergessen'] = array_map(fn(SyncableEntity $e) => $e->toArray(), $nvEntities);

        $kunden = $this->em->getRepository(\App\Entity\Customer::class)->findBy([], ['id' => 'ASC']);
        $result['kunden'] = array_map(fn(SyncableEntity $e) => $e->toArray(), $kunden);

        return $result;
    }
}
