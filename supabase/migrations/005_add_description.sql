-- 1. Add the column
ALTER TABLE library_branches ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Populate "Maa Saraswati Library, Shakarpur" as a reference seeded library
UPDATE library_branches
SET 
  description = 'Maa Saraswati Library offers a premium, peaceful, and fully soundproof study environment designed specifically for UPSC, CA, and Medical aspirants. Located in the heart of Shakarpur, our facility features ergonomic chairs, custom wide desks, high-speed fiber internet, and individual reading lights. We maintain a strict noise-free discipline policy to ensure maximum focus. The premises are fully air-conditioned, with a dedicated pantry, clean washrooms, and RO drinking water. Our goal is to provide you with the most comfortable space to crack your toughest exams without any distractions.',
  verification_status = 'verified',
  amenities_text = 'AC, Wi-Fi, Water, Washroom, Power Backup, CCTV, Locker',
  nearest_metro = 'Laxmi Nagar',
  nearest_metro_distance_km = 0.5,
  opening_time = '06:00',
  closing_time = '23:00',
  profile_completeness_score = 100
WHERE slug = 'maa-saraswati-library-1-0-shakarpur';

-- 3. Make sure we have a couple of fee plans for it too (deleting old ones first to avoid duplicates)
DELETE FROM library_fee_plans WHERE library_branch_id = (SELECT id FROM library_branches WHERE slug = 'maa-saraswati-library-1-0-shakarpur');

INSERT INTO library_fee_plans (library_branch_id, plan_name, duration_label, price, plan_type, created_at)
SELECT id, 'Monthly Morning Shift', '1 Month', 900, 'Morning Half', NOW() FROM library_branches WHERE slug = 'maa-saraswati-library-1-0-shakarpur';

INSERT INTO library_fee_plans (library_branch_id, plan_name, duration_label, price, plan_type, created_at)
SELECT id, 'Monthly Full Day', '1 Month', 1500, 'Full Day', NOW() FROM library_branches WHERE slug = 'maa-saraswati-library-1-0-shakarpur';

INSERT INTO library_fee_plans (library_branch_id, plan_name, duration_label, price, plan_type, created_at)
SELECT id, 'Quarterly Full Day', '3 Months', 4000, 'Full Day', NOW() FROM library_branches WHERE slug = 'maa-saraswati-library-1-0-shakarpur';
