# PRODUCT REGISTRATION - MASTER DEVELOPMENT RULES (MANDATORY)

This project uses:
- React Frontend
- Node.js Backend
- PostgreSQL
- GitHub
- GitHub Actions CI/CD
- DigitalOcean Testing Server
- Production Server

Your job is NOT finished until EVERY layer of the application is updated.

==================================================================
RULE 1 - DATABASE FIRST
==================================================================
Whenever you:
- create a table
- remove a table
- rename a table
- create a column
- rename a column
- delete a column
- modify datatype
- change constraints
- change foreign keys
- create indexes
- create triggers
- create functions
- create views
- create sequences
- modify defaults

You MUST also update:
`backend/database/migration.sql`

NEVER rely on your local database.
The migration.sql file is the SINGLE SOURCE OF TRUTH.

==================================================================
RULE 2 - NEVER MODIFY DATABASE MANUALLY
==================================================================
If you manually execute ALTER TABLE, CREATE TABLE, or DROP TABLE inside PostgreSQL, the SAME SQL MUST immediately be copied into migration.sql.
Database changes are NOT complete until migration.sql contains them.

==================================================================
RULE 3 - BEFORE SAYING "DONE"
==================================================================
Before completing ANY task you MUST verify:
- [ ] Backend updated
- [ ] Frontend updated
- [ ] Routes updated
- [ ] Controllers updated
- [ ] APIs updated
- [ ] Validation updated
- [ ] Database updated
- [ ] migration.sql updated
- [ ] Foreign Keys updated
- [ ] Existing data compatibility checked
- [ ] Testing branch compatibility checked

==================================================================
RULE 4 - BACKWARD COMPATIBILITY
==================================================================
Every migration must use safe SQL.
Always prefer:
- ADD COLUMN IF NOT EXISTS
- DROP COLUMN IF EXISTS
- CREATE TABLE IF NOT EXISTS
- CREATE INDEX IF NOT EXISTS
- CREATE VIEW OR REPLACE

Never assume a fresh database.
Never assume a column already exists.

==================================================================
RULE 5 - SCHEMA VALIDATION
==================================================================
Whenever database-related code is written, mentally verify:
- Does every SQL query reference an existing column?
- Does every JOIN use existing columns?
- Does every INSERT match table structure?
- Does every UPDATE match table structure?
- Does every SELECT match table structure?

Never reference a column that migration.sql does not create.

==================================================================
RULE 6 - LOCAL ≠ TESTING
==================================================================
Never assume local database schema equals testing schema.
The ONLY schema guaranteed on testing is whatever migration.sql creates.
Therefore every feature must be deployable on an empty database.

==================================================================
RULE 7 - DEPLOYMENT SAFETY
==================================================================
Every feature must survive this sequence:
Fresh Database → Run migration.sql → Backend Starts → Frontend Starts → Feature Works
If any step fails, the feature is incomplete.

==================================================================
RULE 8 - FEATURE COMPLETION CHECKLIST
==================================================================
Before finishing, verify all of these.

**Database**
- [ ] New tables added to migration.sql
- [ ] New columns added
- [ ] FK added
- [ ] Constraints added
- [ ] Indexes added
- [ ] Views updated
- [ ] Functions updated

**Backend**
- [ ] Models updated
- [ ] Controllers updated
- [ ] Routes updated
- [ ] Services updated
- [ ] Validation updated

**Frontend**
- [ ] API updated
- [ ] UI updated
- [ ] Forms updated
- [ ] Validation updated

**Deployment**
- [ ] migration.sql updated
- [ ] No manual DB dependency
- [ ] No production-only dependency
- [ ] No local-only dependency

**Testing**
- [ ] Existing records still work
- [ ] New records work
- [ ] Old data doesn't break
- [ ] Empty database works

==================================================================
RULE 9 - NEVER CREATE SCHEMA DRIFT
==================================================================
Schema Drift means: Local Database ≠ Testing Database ≠ Production Database
This is NEVER acceptable.
migration.sql MUST always recreate the latest schema.

==================================================================
RULE 10 - REQUIRED FINAL REPORT
==================================================================
Every completed task MUST end with:

DATABASE
✓ Updated migration.sql
✓ Tables affected
✓ Columns affected

BACKEND
✓ Files changed

FRONTEND
✓ Files changed

DEPLOYMENT
✓ No manual database step required

VALIDATION
✓ Feature works on a fresh database after running migration.sql only.

If any item above is missing, the task is NOT complete.
