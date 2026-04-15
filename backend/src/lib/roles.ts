import { Role } from '@prisma/client';

/** True for both THERAPIST and CHIEF_THERAPIST roles. */
export const isTherapistRole = (role: Role): boolean =>
  role === Role.THERAPIST || role === Role.CHIEF_THERAPIST;
