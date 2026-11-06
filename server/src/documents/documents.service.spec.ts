import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { DocumentsStore } from './documents.store';

describe('DocumentsService', () => {
  let moduleRef: TestingModule;
  let service: DocumentsService;
  let store: DocumentsStore;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [DocumentsService, DocumentsStore],
    }).compile();

    await moduleRef.init();

    service = moduleRef.get(DocumentsService);
    store = moduleRef.get(DocumentsStore);
  });

  it('returns the full list of documents', async () => {
    const documents = await service.findAll();

    expect(documents).toHaveLength(20);
    expect(documents[0]).toMatchObject({ id: 'doc-01', title: 'Q3 Vendor Agreement' });
  });

  it('creates a document with the given title', async () => {
    const created = await service.create('Renewal Terms — Acme');

    expect(created.title).toBe('Renewal Terms — Acme');
    expect(created.lockedBy).toBeNull();
    expect(created.id).toBeTruthy();
  });

  it('includes a newly created document in the list', async () => {
    const created = await service.create('Fresh');

    const documents = await service.findAll();
    expect(documents).toHaveLength(21);
    expect(documents.map((d) => d.id)).toContain(created.id);
  });

  it('rejects an empty or non-string title', async () => {
    await expect(service.create('   ')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create(undefined)).rejects.toBeInstanceOf(BadRequestException);
    expect(store.all()).toHaveLength(20);
  });

  it('deletes an unlocked document', async () => {
    await service.delete('doc-01');

    expect(store.findById('doc-01')).toBeUndefined();
    expect(store.all()).toHaveLength(19);
  });

  it('no longer lists a deleted document', async () => {
    await service.delete('doc-01');

    const documents = await service.findAll();
    expect(documents.map((d) => d.id)).not.toContain('doc-01');
  });

  describe('deleteMany', () => {
    it('deletes several unlocked documents', async () => {
      await service.deleteMany(['doc-01', 'doc-02', 'doc-02']);

      expect(store.all()).toHaveLength(18);
    });

    it('deletes nothing when the selection includes a locked document', async () => {
      await expect(service.deleteMany(['doc-01', 'doc-03', 'doc-02'])).rejects.toBeInstanceOf(ConflictException);

      expect(store.all()).toHaveLength(20);
      expect(store.findById('doc-01')).toBeDefined();
      expect(store.findById('doc-03')).toBeDefined();
    });

    it('reports every locked id in the conflict', async () => {
      const error = await service.deleteMany(['doc-03', 'doc-07', 'doc-01']).catch((e) => e);

      expect(error.getResponse()).toMatchObject({ lockedIds: ['doc-03', 'doc-07'] });
    });

    it('deletes nothing when an id is unknown', async () => {
      await expect(service.deleteMany(['doc-01', 'nope'])).rejects.toBeInstanceOf(NotFoundException);

      expect(store.all()).toHaveLength(20);
    });

    it('rejects a malformed ids payload', async () => {
      await expect(service.deleteMany(undefined)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.deleteMany([1])).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('DocumentsStore.remove', () => {
    it('does not delete anything when the id is unknown', () => {
      expect(store.remove('nope')).toBe(false);
      expect(store.all()).toHaveLength(20);
      expect(store.findById('doc-20')).toBeDefined();
    });
  });
});
