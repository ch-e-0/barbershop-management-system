-- ============================================================
--  test_accounts.sql
--  PARA SA TESTING LANG.
--
--  Binubura ang lahat ng Admin at Customer account at pinapalitan
--  ng 1 admin at 5 customer na nasa ibaba. Ang password nila ay
--  nasa legacy_password (plain text), kaya kilala natin. Sa unang
--  matagumpay na login, awtomatikong ginagawang hash ng system.
--
--  - Hindi ginagalaw ang mga Barber account.
--  - Hindi binubura ang appointments at feedback. Inililipat sila
--    sa 5 bagong customer para gumana pa rin ang Analytics at ang
--    Sales / Customer Forecast.
--
--  Pwedeng patakbuhin ulit. Import sa phpMyAdmin, o:
--    mysql -uroot supremo_barbershop < database/test_accounts.sql
--
--  TEST LOGINS
--    Role      Username   Password
--    Admin     admin      Admin12345
--    Customer  juan       Juan12345
--    Customer  maria      Maria12345
--    Customer  jose       Jose12345
--    Customer  ana        Ana123456
--    Customer  mark       Mark12345
--  Security answer ng lahat: test
-- ============================================================

START TRANSACTION;

-- 1. Itabi muna ang lumang Admin at Customer account para hindi
--    magbanggaan ang username (halimbawa, "admin").
UPDATE users
   SET username = CONCAT('old_', id, '_', username)
 WHERE role IN ('Admin', 'User');

-- 2. Ang mga bagong test account.
INSERT INTO users (full_name, username, password_hash, legacy_password, role, security_question, security_answer, phone) VALUES
  ('Supremo Admin',    'admin', '', 'Admin12345', 'Admin', 'What was your first pet''s name?', 'test', '0917-000-0001'),
  ('Juan Dela Cruz',   'juan',  '', 'Juan12345',  'User',  'What was your first pet''s name?', 'test', '0917-000-0002'),
  ('Maria Santos',     'maria', '', 'Maria12345', 'User',  'What was your first pet''s name?', 'test', '0917-000-0003'),
  ('Jose Reyes',       'jose',  '', 'Jose12345',  'User',  'What was your first pet''s name?', 'test', '0917-000-0004'),
  ('Ana Garcia',       'ana',   '', 'Ana123456',  'User',  'What was your first pet''s name?', 'test', '0917-000-0005'),
  ('Mark Villanueva',  'mark',  '', 'Mark12345',  'User',  'What was your first pet''s name?', 'test', '0917-000-0006');

SET @c1 = (SELECT id FROM users WHERE username = 'juan');
SET @c2 = (SELECT id FROM users WHERE username = 'maria');
SET @c3 = (SELECT id FROM users WHERE username = 'jose');
SET @c4 = (SELECT id FROM users WHERE username = 'ana');
SET @c5 = (SELECT id FROM users WHERE username = 'mark');

-- 3. Ilipat ang appointments ng lumang account sa 5 bagong customer,
--    halinhinan base sa appointment id.
UPDATE appointments a
  JOIN users u ON u.id = a.user_id
   SET a.user_id = CASE MOD(a.id, 5)
                     WHEN 0 THEN @c1
                     WHEN 1 THEN @c2
                     WHEN 2 THEN @c3
                     WHEN 3 THEN @c4
                     ELSE @c5
                   END
 WHERE u.username LIKE 'old\_%';

-- 4. Ang feedback ay sumusunod sa may-ari ng appointment.
UPDATE feedback f
  JOIN appointments a ON a.id = f.appointment_id
   SET f.user_id = a.user_id;

-- 5. Burahin ang mga lumang account.
DELETE FROM users WHERE username LIKE 'old\_%';

COMMIT;
