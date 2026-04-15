import { Prisma, Role } from '@prisma/client';
import { isTherapistRole } from '../../lib/roles';
import { getTherapistId, getPatientId } from '../../lib/profileCache';

interface PatientQuery {
  search?: string;
  therapistId?: string;
  isMilitary?: string;
  active?: string;
}

/**
 * Build the Prisma `where` clause for prisma.patient.findMany based on the
 * requesting user's role and any query filters.
 *
 * Fixes BUG-05: CHIEF_THERAPIST is treated identically to THERAPIST.
 */
export async function buildPatientWhereClause(
  user: { id: number; role: Role },
  query: PatientQuery,
): Promise<Prisma.PatientWhereInput> {
  const { search, therapistId, isMilitary, active } = query;
  const where: Prisma.PatientWhereInput = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName:  { contains: search, mode: 'insensitive' } },
      { nickname:  { contains: search, mode: 'insensitive' } },
      { phone:     { contains: search, mode: 'insensitive' } },
    ];
  }
  if (therapistId) where.therapistId = parseInt(therapistId);
  if (isMilitary !== undefined) where.isMilitary = isMilitary === 'true';
  if (active !== undefined) where.isActive = active === 'true';

  if (isTherapistRole(user.role)) {
    const tId = await getTherapistId(user.id);
    if (tId) where.therapistId = tId;
  }

  if (user.role === Role.PATIENT) {
    const pId = await getPatientId(user.id);
    if (pId) where.id = pId;
  }

  return where;
}
