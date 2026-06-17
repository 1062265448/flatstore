/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Prisma 服务 Mock — 用于单元测试
 * 使用 any 类型以绕过循环引用和复杂 Prisma 类型约束
 */

export const PrismaServiceMock: any = {
  inventoryStock: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  distributionOrder: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  customer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  aiRecognitionHistory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn((fn: any) => fn(PrismaServiceMock)),
};

export const OcrServiceMock = {
  recognizeImage: jest.fn(),
  isAvailable: jest.fn().mockResolvedValue(true),
};
