-- Streaming subscriptions: the customer receives a ready account, so the shop no longer asks for their email.
-- Only clears the "Account email" field the starter catalog added; products edited to ask for other details are untouched.
UPDATE "Product"
SET "fields" = '[]'::jsonb
WHERE "fields"::text LIKE '%"accountEmail"%'
  AND jsonb_array_length("fields") = 1;

