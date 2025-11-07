USE bank_management;

-- Update admin password with proper hash for 'admin123'
UPDATE users SET password_hash = '$2b$12$CvfnKBmv5GjQ3JD.jKjYguwWhngRUXsxEAgPAp4jkeEbnF93hmcKu' WHERE username = 'admin';

-- Verify the update
SELECT username, LEFT(password_hash, 20) as hash_preview FROM users WHERE username = 'admin';