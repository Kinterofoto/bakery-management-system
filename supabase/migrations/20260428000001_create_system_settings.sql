-- Tabla de configuración de sistema (key/value JSONB).
-- Uso inicial: bandera pt_reception_enabled para activar/desactivar el módulo
-- de recepción de producto terminado. Cuando es `false`, las producciones
-- finalizadas en centros de trabajo `is_last_operation` se reciben de forma
-- automática al inventario, saltándose el paso manual de revisión.

CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" text PRIMARY KEY,
    "value" jsonb NOT NULL,
    "description" text,
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    "updated_by" uuid REFERENCES "public"."users"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."system_settings" OWNER TO "postgres";

ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read settings" ON "public"."system_settings";
CREATE POLICY "Authenticated users can read settings"
    ON "public"."system_settings"
    FOR SELECT
    TO "authenticated"
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can write settings" ON "public"."system_settings";
CREATE POLICY "Authenticated users can write settings"
    ON "public"."system_settings"
    FOR ALL
    TO "authenticated"
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."system_settings" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."system_settings" TO "service_role";

INSERT INTO "public"."system_settings" ("key", "value", "description")
VALUES (
    'pt_reception_enabled',
    'true'::jsonb,
    'Activa el módulo de recepción de producto terminado. Si está en false, las producciones finalizadas en centros de trabajo de última operación se reciben automáticamente al inventario al empacarse.'
)
ON CONFLICT ("key") DO NOTHING;
