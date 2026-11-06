import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Document } from './document.model';
import { DocumentsStore } from './documents.store';

@Injectable()
export class DocumentsService {
  constructor(private readonly store: DocumentsStore) {}

  async findAll(): Promise<Document[]> {
    return this.store.all();
  }

  async create(title: unknown): Promise<Document> {
    if (typeof title !== 'string' || !title.trim()) {
      throw new BadRequestException('title must be a non-empty string');
    }

    return this.store.insert(title.trim());
  }

  async delete(id: string): Promise<void> {
    await this.deleteMany([id]);
  }

  /**
   * All-or-nothing: every id is validated before anything is removed, so a
   * selection containing a locked (or unknown) document deletes nothing.
   */
  async deleteMany(ids: unknown): Promise<void> {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('ids must be an array of strings');
    }

    const uniqueIds = [...new Set<string>(ids)];
    const documents: Document[] = [];
    const missing: string[] = [];

    for (const id of uniqueIds) {
      const document = this.store.findById(id);
      if (document) documents.push(document);
      else missing.push(id);
    }

    if (missing.length > 0) {
      throw new NotFoundException({
        message: `Documents not found: ${missing.join(', ')}. Nothing was deleted.`,
        missingIds: missing,
      });
    }

    const locked = documents.filter((doc) => doc.lockedBy !== null);
    if (locked.length > 0) {
      throw new ConflictException({
        message: `${locked.length} selected document(s) are locked. Nothing was deleted.`,
        lockedIds: locked.map((doc) => doc.id),
        lockedTitles: locked.map((doc) => doc.title),
      });
    }

    for (const document of documents) {
      this.store.remove(document.id);
    }
  }
}
