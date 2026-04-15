import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// TEST-02: type-safe Prisma mock generated from schema — no manual method listing
const prismaMock = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prismaMock);
});

export type MockPrisma = DeepMockProxy<PrismaClient>;
export default prismaMock;
