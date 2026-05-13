process.env.DATABASE_URL = 'mysql://root:root123456@localhost:3306/flat_library';
process.env.FRONTEND_URL = 'http://localhost:5174';

// Mock nanoid - ESM package that doesn't work with ts-jest in CJS mode
jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'TESTORD001',
}));
