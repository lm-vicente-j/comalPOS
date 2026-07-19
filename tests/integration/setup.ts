// Runs before each test file. The test database is expected to be running
// (boot it with `bash scripts/test-db.sh`); DATABASE_URL can be overridden
// to point somewhere else.
process.env.DATABASE_URL ??= "postgresql://postgres@localhost:5433/comalpos_test";
