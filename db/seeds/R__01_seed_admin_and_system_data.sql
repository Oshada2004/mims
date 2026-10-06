USE `mims_db`;

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO `BRANCH` (`branch_id`, `branch_name`, `district`, `address`, `contact_no`)
VALUES 
    (1, 'Head Office - Colombo', 'Colombo', '110 Sir Chittampalam A Gardiner Mawatha, Colombo 02', '0112300300'),
    (2, 'Kandy City Branch', 'Kandy', '12 Dalada Veediya, Kandy', '0112200200'),
    (3, 'Galle Fort Branch', 'Galle', '45 Church Street, Galle Fort', '0112560300'),
    (4, 'New Hospital Branch', 'Rathnapura', '10A Aluth Rohala Street, Rathnapura', '0112840300'),
    (5, 'University OF Moratuwa', 'Moratuwa', 'Molpe Road, katubedda', '0112560750'),
    (6, 'University OF Peradeniya', 'Peradeniya', 'Peradeniya Road, Peradeniya', '0112560751'),
    (7, 'University OF Jaffna', 'Jaffna', 'Jaffna Road, Jaffna', '0112560752'),
    (8, 'University OF Ruhuna', 'Matara', 'Matara Road, Matara', '0112560753'),
    (9, 'University OF Kelaniya', 'Kelaniya', 'Kelaniya Road, Kelaniya', '0112560754'),
    (10, 'University OF Sri Jayewardenepura', 'Nugegoda', 'Nugegoda Road, Nugegoda', '0112560755')
ON DUPLICATE KEY UPDATE 
    `branch_name` = VALUES(`branch_name`),
    `contact_no`  = VALUES(`contact_no`);

INSERT INTO `PERSON` (`person_id`, `first_name`, `last_name`, `dob`, `nic`, `phone_number`, `address`, `postal_code`)
VALUES 
    (101, 'Chamath', 'De Silva', '1985-01-15', '198510000001', '0112300301', 'MIMS HQ, Colombo 02', '00200'),
    (102, 'Kamal', 'Perera', '1990-06-20', '199020000002', '0771234567', 'Main Street, Kandy', '20000'),
    (103, 'Nimal', 'Silva', '1992-03-10', '199230000003', '0719876543', 'Galle Road, Colombo 03', '00300')
ON DUPLICATE KEY UPDATE 
    `first_name` = VALUES(`first_name`),
    `last_name`  = VALUES(`last_name`);

INSERT INTO `STAFF_PROFILE` (`person_id`, `staff_role`, `branch_id`, `department`, `salary`)
VALUES 
    (101, 'ADMIN', 1, 'IT', 650000.00),
    (102, 'ADMIN', 2, 'OPERATIONS', 320000.00),
    (103, 'ADMIN', 3, 'IT', 400000.00)
ON DUPLICATE KEY UPDATE 
    `staff_role` = VALUES(`staff_role`);

INSERT INTO `AUTH_USER` (`person_id`, `email`, `username`, `password_hash`, `user_role`, `failed_login_attempts`, `is_locked`)
VALUES 
    (101, 'Chamath@mimsbank.lk', 'Chamath', SHA2('Chamath101123!', 256), 'ADMIN', 0, FALSE),
    (102, 'Kamal@mimsbank.lk', 'Kamal', SHA2('Kamal102123!', 256), 'ADMIN', 0, FALSE),
    (103, 'Nimal@mimsbank.lk', 'Nimal', SHA2('Nimal103123!', 256), 'ADMIN', 0, FALSE)
ON DUPLICATE KEY UPDATE 
    `password_hash` = VALUES(`password_hash`),
    `is_locked`     = FALSE;

SET FOREIGN_KEY_CHECKS = 1;