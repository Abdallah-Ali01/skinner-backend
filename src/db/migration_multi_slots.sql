-- Migration: Allow multiple time slots per day for doctor availability
-- The unique_doctor_day constraint only allowed one row per doctor per day.
-- This migration removes that constraint so doctors can set multiple time ranges
-- (e.g., morning 09:00-12:00 and afternoon 02:00-05:00) on the same day.

ALTER TABLE doctor_availability DROP CONSTRAINT IF EXISTS unique_doctor_day;
