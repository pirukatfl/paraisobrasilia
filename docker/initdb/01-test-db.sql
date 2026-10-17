-- Runs once, on the first start of an empty Postgres volume.
-- Creates the isolated database used by the test suites (plan 01-03).
CREATE DATABASE paraiso_test OWNER paraiso;
