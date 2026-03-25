<?php

namespace App\Tests\Unit\Repository;

use App\Entity\Metadata;
use App\Repository\MetadataRepository;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Mapping\ClassMetadata;
use Doctrine\Persistence\ManagerRegistry;
use PHPUnit\Framework\TestCase;

/**
 * @group regression
 */
class MetadataRepositoryTest extends TestCase
{
    private function buildRepo(EntityManagerInterface $em): MetadataRepository
    {
        $classMetadata       = $this->createMock(ClassMetadata::class);
        $classMetadata->name = Metadata::class;

        $em->method('getClassMetadata')->willReturn($classMetadata);

        $registry = $this->createMock(ManagerRegistry::class);
        $registry->method('getManagerForClass')->willReturn($em);

        return new MetadataRepository($registry);
    }

    /**
     * REGRESSION R-2:
     * getOrCreate() darf flush() NICHT selbst aufrufen.
     * Der Aufrufer (CockpitSyncService::syncAll) verwaltet die Transaktion.
     * Ein flush() innerhalb einer fremden Transaktion kann Partial-Writes erzeugen.
     *
     * Status: ROT bis flush() aus getOrCreate() entfernt wird.
     */
    public function testGetOrCreateDoesNotFlushWhenCreatingNewMetadata(): void
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('find')->willReturn(null); // Metadata existiert noch nicht

        $em->expects($this->once())->method('persist');
        $em->expects($this->never())->method('flush'); // Regression-Assertion

        $repo = $this->buildRepo($em);
        $repo->getOrCreate();
    }

    public function testGetOrCreateReturnsExistingMetadataWithoutPersistOrFlush(): void
    {
        $existing = new Metadata();

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('find')->willReturn($existing);

        $em->expects($this->never())->method('persist');
        $em->expects($this->never())->method('flush');

        $repo   = $this->buildRepo($em);
        $result = $repo->getOrCreate();

        $this->assertSame($existing, $result);
    }

    public function testGetOrCreateReturnsSameCachedInstanceOnRepeatedCalls(): void
    {
        $existing = new Metadata();

        $em = $this->createMock(EntityManagerInterface::class);
        // find() darf nur beim ersten Aufruf ausgeführt werden
        $em->expects($this->once())->method('find')->willReturn($existing);

        $repo = $this->buildRepo($em);

        $first  = $repo->getOrCreate();
        $second = $repo->getOrCreate();

        $this->assertSame($first, $second);
    }
}
