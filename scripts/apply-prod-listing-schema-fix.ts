import { config } from 'dotenv'
import postgres from 'postgres'

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

  await db.unsafe(
    'alter table listings add column if not exists last_content_updated_at timestamptz'
  )
  await db.unsafe(
    'alter table listings add column if not exists renewal_count integer not null default 0'
  )
  await db.unsafe(`
    create table if not exists listing_lifecycle_events (
      id uuid primary key default gen_random_uuid(),
      listing_id uuid not null references listings (id) on delete cascade,
      created_at timestamptz not null default now(),
      source varchar(40) not null,
      actor_user_id uuid references users (id) on delete set null,
      previous_status varchar(50) not null,
      new_status varchar(50) not null,
      reason_code varchar(80) not null,
      reason_message text not null,
      details jsonb not null default '{}'::jsonb,
      kiteprop_payload jsonb not null,
      kiteprop_webhook_status varchar(20) not null default 'pending',
      kiteprop_webhook_error text,
      kiteprop_sent_at timestamptz
    )
  `)
  await db.unsafe(
    'create index if not exists listing_lifecycle_events_listing_idx on listing_lifecycle_events (listing_id)'
  )
  await db.unsafe(
    'create index if not exists listing_lifecycle_events_pending_webhook_idx on listing_lifecycle_events (kiteprop_webhook_status, created_at)'
  )

  console.log(
    JSON.stringify(
      {
        ok: true,
        applied: [
          'listings.last_content_updated_at',
          'listings.renewal_count',
          'listing_lifecycle_events',
          'listing_lifecycle_events_listing_idx',
          'listing_lifecycle_events_pending_webhook_idx',
        ],
      },
      null,
      2
    )
  )

  await db.end()
}

main().catch((err) => {
  console.error('[apply-prod-listing-schema-fix]', err)
  process.exit(1)
})
