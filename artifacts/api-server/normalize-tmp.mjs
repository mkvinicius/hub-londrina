import pg from 'pg';
import bcryptjs from 'bcryptjs';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

await pool.query(`
UPDATE businesses SET zone='norte'  WHERE (lower(zone) LIKE '%norte%'  OR lower(region) LIKE '%norte%');
UPDATE businesses SET zone='sul'    WHERE (lower(zone) LIKE '%sul%'    OR lower(region) LIKE '%sul%')   AND zone NOT IN ('norte','leste','oeste');
UPDATE businesses SET zone='leste'  WHERE (lower(zone) LIKE '%leste%'  OR lower(region) LIKE '%leste%') AND zone NOT IN ('norte','sul','oeste');
UPDATE businesses SET zone='oeste'  WHERE (lower(zone) LIKE '%oeste%'  OR lower(region) LIKE '%oeste%') AND zone NOT IN ('norte','sul','leste');
UPDATE businesses SET zone='centro' WHERE zone IS NULL OR zone='' OR zone NOT IN ('norte','sul','leste','oeste','centro');
UPDATE businesses SET region = CASE zone
  WHEN 'norte'  THEN 'Zona Norte'
  WHEN 'sul'    THEN 'Zona Sul'
  WHEN 'leste'  THEN 'Zona Leste'
  WHEN 'oeste'  THEN 'Zona Oeste'
  ELSE 'Centro'
END;
INSERT INTO zones (slug, name, description, color, active) VALUES
  ('norte',  'Zona Norte',  'Negócios da Zona Norte de Londrina',  '#3d7a28', true),
  ('sul',    'Zona Sul',    'Negócios da Zona Sul de Londrina',    '#2563eb', true),
  ('leste',  'Zona Leste',  'Negócios da Zona Leste de Londrina',  '#d97706', true),
  ('oeste',  'Zona Oeste',  'Negócios da Zona Oeste de Londrina',  '#7c3aed', true),
  ('centro', 'Centro',      'Negócios do Centro de Londrina',      '#dc2626', true)
ON CONFLICT (slug) DO NOTHING;
`);
console.log("Distribution:", (await pool.query("SELECT zone, count(*)::int n FROM businesses GROUP BY zone ORDER BY zone")).rows);
console.log("Zones table:", (await pool.query("SELECT slug,name FROM zones ORDER BY name")).rows);

const orphans = await pool.query(`
  SELECT b.id, b.email FROM businesses b
  LEFT JOIN business_users bu ON bu.business_id = b.id
  WHERE bu.id IS NULL AND b.email IS NOT NULL AND b.email != ''
`);
console.log("Orphans:", orphans.rows.length);
if (orphans.rows.length > 0) {
  const hash = await bcryptjs.hash('Hub@2026', 10);
  for (const b of orphans.rows) {
    try {
      await pool.query(
        "INSERT INTO business_users (business_id, email, password_hash, email_verified) VALUES ($1, $2, $3, 'true')",
        [b.id, b.email, hash]
      );
    } catch (e) { console.log("Skip", b.email, String(e.message).slice(0,80)); }
  }
}
console.log("Total business_users:", (await pool.query("SELECT count(*)::int n FROM business_users")).rows[0].n);
await pool.end();
