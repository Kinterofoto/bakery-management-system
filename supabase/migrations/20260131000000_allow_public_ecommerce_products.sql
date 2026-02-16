-- Allow anonymous users to read ecommerce products (PT category)
-- This enables browsing the product catalog without authentication

CREATE POLICY "Allow anon to read ecommerce products"
ON "public"."products"
FOR SELECT
TO "anon"
USING (
  "category" = 'PT'
  AND "visible_in_ecommerce" = true
  AND "is_active" = true
);

-- Allow anonymous users to read product configurations for ecommerce products
CREATE POLICY "Allow anon to read ecommerce product configs"
ON "public"."product_config"
FOR SELECT
TO "anon"
USING (
  EXISTS (
    SELECT 1 FROM "public"."products"
    WHERE "products"."id" = "product_config"."product_id"
    AND "products"."category" = 'PT'
    AND "products"."visible_in_ecommerce" = true
    AND "products"."is_active" = true
  )
);

-- Allow anonymous users to read product media for ecommerce products
CREATE POLICY "Allow anon to read ecommerce product media"
ON "public"."product_media"
FOR SELECT
TO "anon"
USING (
  EXISTS (
    SELECT 1 FROM "public"."products"
    WHERE "products"."id" = "product_media"."product_id"
    AND "products"."category" = 'PT'
    AND "products"."visible_in_ecommerce" = true
    AND "products"."is_active" = true
  )
);
