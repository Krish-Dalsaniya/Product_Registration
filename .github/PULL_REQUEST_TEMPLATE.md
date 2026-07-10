# Pull Request Checklist

Please ensure that you have checked the following items before submitting your Pull Request. 

## PostgreSQL Database Schema Changes

Every PR affecting PostgreSQL must satisfy the following checklist. Reviewers will not approve the PR unless every item is checked.

- [ ] Did you create/modify/drop a table?
- [ ] Did you add/remove columns?
- [ ] Did you modify indexes?
- [ ] Did you modify constraints?
- [ ] Did you update `backend/database/migration.sql`?
- [ ] Can `migration.sql` run multiple times safely (using `IF NOT EXISTS` or similar)?
- [ ] Was `migration.sql` tested locally?
- [ ] Will CI/CD successfully apply this migration?
- [ ] Will a fresh database become identical to your local database?

## General Checklist
- [ ] I have verified the code locally.
- [ ] I have followed the project coding standards.
- [ ] I have added/updated relevant documentation.
