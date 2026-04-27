<?php

namespace App\Service;

use App\Entity\SyncableEntity;
use App\Entity\User;
use App\Repository\InitiativeRepository;
use App\Repository\InitiativeShareRepository;
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
        private InitiativeShareRepository $initiativeShareRepo,
    ) {}

    /** @return array<string, mixed> */
    public function loadForUser(User $user): array
    {
        $meta = $this->metaRepo->getOrCreate();
        $result = ['kw' => $meta->getKw()];

        // Own teams + explicitly shared teams
        $ownTeams = $this->teamRepo->findVisibleByUser($user);
        $sharedTeams = $user->isAdmin() ? [] : $this->teamRepo->findSharedByUser($user);

        $allTeams = array_values(array_unique(array_merge($ownTeams, $sharedTeams), SORT_REGULAR));
        $result['teams'] = array_map(fn(SyncableEntity $e) => $e->toArray(), $allTeams);

        $teamIds = array_map(fn($t) => $t->getId(), $allTeams);

        // Initiatives via team membership
        $initiatives = $this->initiativeRepo->findByTeamIdsWithBlockedBy($teamIds);

        // Additionally: individually shared initiatives not already included
        if (!$user->isAdmin()) {
            $individualShares = $this->initiativeShareRepo->findByUser($user);
            $includedIds = array_map(fn($i) => $i->getId(), $initiatives);
            foreach ($individualShares as $share) {
                $iniId = $share->getInitiativeId();
                if (!in_array($iniId, $includedIds, true)) {
                    $ini = $this->initiativeRepo->find($iniId);
                    if ($ini !== null) {
                        $initiatives[] = $ini;
                        $includedIds[] = $iniId;
                    }
                }
            }
        }

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
