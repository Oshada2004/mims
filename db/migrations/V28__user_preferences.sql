-- Per-user settings. A user without a row uses the defaults (SYSTEM theme, alerts on), so
-- existing users need no backfill.

CREATE TABLE IF NOT EXISTS USER_PREFERENCES (
    person_id INT NOT NULL,
    theme ENUM('LIGHT','DARK','SYSTEM') NOT NULL DEFAULT 'SYSTEM',
    email_txn_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (person_id),
    CONSTRAINT fk_preferences_user FOREIGN KEY (person_id)
        REFERENCES AUTH_USER(person_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
