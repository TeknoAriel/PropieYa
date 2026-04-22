import { config } from 'dotenv'
import postgres = require('postgres')

function envPath(): string {
  return process.argv[2] ?? '.env.vercel.production.local'
}

async function main() {
  config({ path: envPath() })
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error(`DATABASE_URL missing in ${envPath()}`)
  }

  const db = postgres(url, { max: 1, ssl: 'require' })

  // Mantener en sync con `docs/sql/add-leads-access-monetization.sql`.
  await db.unsafe('alter table leads add column if not exists message_generated_by_system boolean')
  await db.unsafe("update leads set message_generated_by_system = false where message_generated_by_system is null")
  await db.unsafe('alter table leads alter column message_generated_by_system set default false')
  await db.unsafe('alter table leads alter column message_generated_by_system set not null')

  await db.unsafe('alter table leads add column if not exists enrichment jsonb')
  await db.unsafe("update leads set enrichment = '{}'::jsonb where enrichment is null")
  await db.unsafe("alter table leads alter column enrichment set default '{}'::jsonb")
  await db.unsafe('alter table leads alter column enrichment set not null')

  await db.unsafe('alter table leads add column if not exists quality_score integer')

  await db.unsafe('alter table leads add column if not exists access_status varchar(20)')
  await db.unsafe("update leads set access_status = 'activated' where access_status is null")
  await db.unsafe("alter table leads alter column access_status set default 'activated'")
  await db.unsafe('alter table leads alter column access_status set not null')

  await db.unsafe('alter table leads add column if not exists activated_at timestamptz')
  await db.unsafe('alter table leads add column if not exists activation_mode varchar(30)')

  await db.unsafe('alter table leads add column if not exists intent_level varchar(20)')
  await db.unsafe("update leads set intent_level = 'medium' where intent_level is null")
  await db.unsafe("alter table leads alter column intent_level set default 'medium'")
  await db.unsafe('alter table leads alter column intent_level set not null')

  await db.unsafe('alter table leads add column if not exists source varchar(50)')
  await db.unsafe("update leads set source = 'listing_contact' where source is null")
  await db.unsafe("alter table leads alter column source set default 'listing_contact'")
  await db.unsafe('alter table leads alter column source set not null')

  await db.unsafe('create index if not exists leads_access_status_idx on leads (access_status)')

  await db.unsafe(`
    update leads l
    set
      access_status = case when o.plan_type = 'free' then 'pending' else 'activated' end,
      activated_at = case when o.plan_type = 'free' then null else coalesce(l.activated_at, now()) end,
      activation_mode = case
        when o.plan_type = 'free' then null
        else coalesce(l.activation_mode, 'plan')
      end,
      updated_at = now()
    from listings li
    join organizations o on o.id = li.organization_id
    where l.listing_id = li.id
      and l.access_status = 'activated'
      and l.activated_at is null
      and l.activation_mode is null
  `)

  console.log(
    JSON.stringify(
      {
        ok: true,
        applied: [
          'leads.message_generated_by_system',
          'leads.enrichment',
          'leads.quality_score',
          'leads.access_status',
          'leads.activated_at',
          'leads.activation_mode',
          'leads.intent_level',
          'leads.source',
          'leads_access_status_idx',
          'leads.backfill_access_status_by_org_plan',
        ],
      },
      null,
      2
    )
  )

  await db.end()
}

main().catch((err) => {
  console.error('[apply-prod-leads-schema-fix]', err)
  process.exit(1)
})
