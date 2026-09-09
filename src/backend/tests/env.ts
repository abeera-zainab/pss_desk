// Loaded before any test module - points Prisma at the isolated test database
// and provides the config the app expects (so tests never load the real .env).
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://casedesk:casedesk@localhost:11804/casedesk_test?schema=public";
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ACCESS_TOKEN_EXPIRY = "15m";
process.env.REFRESH_TOKEN_EXPIRY = "7d";
process.env.FRONTEND_ORIGIN = "http://localhost:11812";
process.env.MAX_FILE_SIZE_MB = "20";
