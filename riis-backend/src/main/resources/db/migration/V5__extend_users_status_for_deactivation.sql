-- V5__extend_users_status_for_deactivation.sql
--
-- UC-M5-04: Active-account management needs to distinguish a
-- DOST-Admin-initiated deactivation from SUSPENDED (which was already in
-- use as a distinct state) and from REJECTED (which only applies to
-- PENDING registrations that never became ACTIVE). Adds DEACTIVATED to
-- the existing chk_users_status check constraint; no existing rows use
-- this value, so the ALTER is a pure additive change.

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_status;

ALTER TABLE users
    ADD CONSTRAINT chk_users_status
        CHECK (status IN ('ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED', 'DEACTIVATED', 'PENDING_PASSWORD_RESET'));