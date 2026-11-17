-- V14: Each author gets their own institution and email (requirement 6).
--
-- WHY nullable: existing authors have no value for these, and the form may let
-- a submitter leave them blank. NOT NULL would break every old row.
--
-- PRIVACY: email is personal data under the Data Privacy Act. It is stored here
-- but must NEVER be returned by public API responses. Only HEI and admin users
-- may see it, and that is enforced in the backend DTO layer (Step 5), not only
-- in the UI.
ALTER TABLE authors
    ADD COLUMN IF NOT EXISTS institution VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email       VARCHAR(255);