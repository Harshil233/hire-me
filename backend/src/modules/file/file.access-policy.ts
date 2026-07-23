import { FILE_KINDS, ROLES, type FileKind, type Role } from '../../config/constants';
import type { StoredFileRecord } from './file.interface';

export interface FileAccessRequest {
  readonly record: StoredFileRecord;
  readonly requesterUserId: string;
  readonly requesterRole: Role;
}

/**
 * Strategy: one reason a download may be permitted. The service grants access when any
 * registered policy allows it, so a new audience means a new policy rather than another
 * branch inside the service (CLAUDE.md §3, OCP).
 */
export interface IFileAccessPolicy {
  allows(request: FileAccessRequest): boolean;
}

/** Whoever uploaded a file may always read it back. */
export class OwnerFileAccessPolicy implements IFileAccessPolicy {
  allows({ record, requesterUserId }: FileAccessRequest): boolean {
    return record.ownerUserId === requesterUserId;
  }
}

/**
 * An employer may open the two things a candidate publishes in order to be found: their
 * resume and their profile picture. Both ids are already on the talent-pool card, and the
 * card renders the photo, so withholding the bytes would only ever show initials.
 *
 * A company logo stays out — that belongs to whoever uploaded it.
 *
 * The check is on kind, not on who owns the record, so any resume is readable by any
 * employer. That matches `GET /candidates`, which already shows every candidate to every
 * employer; it is a deliberate boundary rather than an oversight.
 */
export class EmployerCandidateFileAccessPolicy implements IFileAccessPolicy {
  private static readonly VISIBLE_KINDS: readonly FileKind[] = [
    FILE_KINDS.RESUME,
    FILE_KINDS.PROFILE_PIC,
  ];

  allows({ record, requesterRole }: FileAccessRequest): boolean {
    return (
      requesterRole === ROLES.HR &&
      EmployerCandidateFileAccessPolicy.VISIBLE_KINDS.includes(record.kind)
    );
  }
}
