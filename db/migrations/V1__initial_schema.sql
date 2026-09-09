CREATE TABLE IF NOT EXISTS connection_test (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status_message VARCHAR(100) NOT NULL
);

INSERT INTO connection_test (status_message)
VALUES ('DB connected successfully');
