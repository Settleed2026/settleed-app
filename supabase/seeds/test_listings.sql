-- test_listings.sql
-- Fake listings for QA / feature testing.
-- All rows have is_test = true so they can be removed with:
--   DELETE FROM properties WHERE is_test = true;
-- before go-live.
--
<<<<<<< HEAD
-- IMPORTANT: Replace the landlord_id value below with your actual landlord
-- account UUID (find it in Supabase Dashboard → Authentication → Users).
-- Using a real landlord_id is required so RLS "Landlords manage own properties"
-- policy allows you to manage these rows.
=======
-- IMPORTANT: Replace the landlord_id below with your actual landlord UUID
-- (find it in Supabase Dashboard -> Authentication -> Users).
>>>>>>> 801bca18e997356c22be94034324ffd2da850092

DO $$
DECLARE
  lid uuid;
BEGIN
<<<<<<< HEAD
  -- Grab the first landlord in the system; replace with a specific UUID if needed
=======
>>>>>>> 801bca18e997356c22be94034324ffd2da850092
  SELECT id INTO lid FROM profiles WHERE role = 'landlord' LIMIT 1;

  IF lid IS NULL THEN
    RAISE EXCEPTION 'No landlord found. Create a landlord account first.';
  END IF;

  INSERT INTO properties (
    landlord_id, status, is_test,
    street_address, neighborhood, city, state, zip_code, market,
    bedrooms, bathrooms, rent_amount, available_date,
    property_type, sqft,
    hcv_accepted, voucher_sizes_accepted, move_in_ready,
    amenities, appliances,
    pets_allowed, pet_types,
    description, photos
  ) VALUES

<<<<<<< HEAD
  -- 1. Studio / Westside
=======
  -- 1. Studio / West End
>>>>>>> 801bca18e997356c22be94034324ffd2da850092
  (lid, 'active', true,
   '1234 Westside Ave', 'West End', 'Atlanta', 'GA', '30310', 'ATL-WEST',
   0, 1.0, 850, CURRENT_DATE + 7,
   'Apartment', 480,
   true, ARRAY['studio'], true,
   ARRAY['Central Air','Laundry On-Site'],
   ARRAY['Refrigerator','Microwave'],
   false, '{}',
   'Cozy studio in the West End. Utilities included. Section 8 welcome.',
   '{}'),

  -- 2. 1 BR / East Atlanta
  (lid, 'active', true,
   '567 East Lake Dr', 'East Atlanta', 'Atlanta', 'GA', '30316', 'ATL-EAST',
   1, 1.0, 1100, CURRENT_DATE + 14,
   'Apartment', 650,
   true, ARRAY['1br'], true,
   ARRAY['Central Air','Washer/Dryer'],
   ARRAY['Dishwasher','Refrigerator','Stove'],
   false, '{}',
   'Updated 1-bedroom with in-unit laundry. Quiet building, near transit. HCV accepted.',
   '{}'),

<<<<<<< HEAD
  -- 3. 2 BR / College Park (near ATL airport)
=======
  -- 3. 2 BR / College Park
>>>>>>> 801bca18e997356c22be94034324ffd2da850092
  (lid, 'active', true,
   '890 Old National Hwy', 'College Park', 'College Park', 'GA', '30349', 'ATL-SOUTH',
   2, 1.0, 1350, CURRENT_DATE,
   'Single Family Home', 950,
   true, ARRAY['2br'], true,
   ARRAY['Fenced Yard','Parking','Central Air'],
   ARRAY['Refrigerator','Stove','Washer Hookups'],
   true, ARRAY['Dog','Cat'],
   'Spacious 2-bedroom home with fenced yard. Pets welcome. AHA & DCA vouchers accepted.',
   '{}'),

  -- 4. 3 BR / Decatur
  (lid, 'active', true,
   '321 Commerce Dr', 'Downtown Decatur', 'Decatur', 'GA', '30030', 'ATL-DECATUR',
   3, 2.0, 1800, CURRENT_DATE + 21,
   'Townhome', 1400,
   true, ARRAY['3br'], true,
   ARRAY['Garage','Central Air','Balcony','Washer/Dryer'],
   ARRAY['Dishwasher','Refrigerator','Stove','Microwave'],
   false, '{}',
<<<<<<< HEAD
   'Modern 3-bed townhome in Decatur. 2-car garage, community pool. HCV welcome, previously inspected.',
   '{}'),

  -- 5. 4 BR / South Fulton
=======
   'Modern 3-bed townhome in Decatur. 2-car garage, community pool. HCV welcome.',
   '{}'),

  -- 5. 4 BR / Cascade Heights
>>>>>>> 801bca18e997356c22be94034324ffd2da850092
  (lid, 'active', true,
   '741 Cascade Rd', 'Cascade Heights', 'Atlanta', 'GA', '30311', 'ATL-WEST',
   4, 2.0, 2100, CURRENT_DATE + 30,
   'Single Family Home', 1800,
   true, ARRAY['4br'], true,
<<<<<<< HEAD
   ARRAY['Fenced Yard','Garage','Central Air','Playground Nearby'],
   ARRAY['Refrigerator','Stove','Dishwasher','Washer Hookups'],
   true, ARRAY['Dog'],
   'Large 4-bedroom family home with big backyard. Schools nearby. AHA, DCA, Cobb HA vouchers accepted.',
=======
   ARRAY['Fenced Yard','Garage','Central Air'],
   ARRAY['Refrigerator','Stove','Dishwasher','Washer Hookups'],
   true, ARRAY['Dog'],
   'Large 4-bedroom family home. Schools nearby. AHA, DCA, Cobb HA vouchers accepted.',
>>>>>>> 801bca18e997356c22be94034324ffd2da850092
   '{}');

  RAISE NOTICE 'Inserted 5 test listings under landlord %', lid;
END $$;
