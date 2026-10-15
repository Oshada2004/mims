-- Re-create the daily interest events (from V22__interests.sql, which is left unchanged) on bank time.
--
-- An event keeps the session time zone it was created in. On a MySQL server running UTC, V22 created
-- them in UTC, so they fired at 00:01/00:05 UTC (05:31/05:35 in Sri Lanka) and CURDATE() was the
-- UTC date. Created here with time_zone '+05:30', they fire at 00:01/00:05 Sri Lanka time and their
-- CURDATE() is the Sri Lanka date. Names, schedules and bodies are the same as in V22.
-- (The scheduler must be on for events to run: event_scheduler=ON on the server.)

SET time_zone = '+05:30';

DROP EVENT IF EXISTS evt_daily_interest_calculation;

CREATE EVENT evt_daily_interest_calculation
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '00:01:00'))
ON COMPLETION PRESERVE
ENABLE
DO CALL sp_run_savings_interest_accrual(CURDATE());

DROP EVENT IF EXISTS ev_fd_interest_payout;

CREATE EVENT ev_fd_interest_payout
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '00:05:00'))
ON COMPLETION PRESERVE
ENABLE
DO CALL sp_run_fd_interest_payout(CURDATE());
