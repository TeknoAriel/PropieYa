import { config } from 'dotenv'
import postgres from 'postgres'

config({ path: 'apps/web/.env.prod.audit' })

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no definido')

  const sql = postgres(url, { ssl: 'require' })
  try {
    const status = await sql.unsafe(
      "select status, count(*)::int as c from listings group by status order by c desc"
    )
    const source = await sql.unsafe(
      "select source, count(*)::int as c from listings group by source order by c desc"
    )
    const [activeVisible] = await sql.unsafe(
      "select count(*)::int as c from listings where status='active'"
    )
    const [importActive] = await sql.unsafe(
      "select count(*)::int as c from listings where source='import' and status='active'"
    )
    const [withExt] = await sql.unsafe(
      'select count(*)::int as c from listings where external_id is not null'
    )
    const [noPhotos] = await sql.unsafe(
      "select count(*)::int as c from listings where source='import' and coalesce(media_count,0)=0"
    )
    const [staleExpired] = await sql.unsafe(
      "select count(*)::int as c from listings where status='expired'"
    )
    const [rejected] = await sql.unsafe(
      "select count(*)::int as c from listings where status='rejected'"
    )
    const [withdrawn] = await sql.unsafe(
      "select count(*)::int as c from listings where status='withdrawn'"
    )
    const [draft] = await sql.unsafe(
      "select count(*)::int as c from listings where status='draft'"
    )
    const lifecycleBySource = await sql.unsafe(
      'select source, count(*)::int as c from listing_lifecycle_events group by source order by c desc'
    )
    const lifecycleReasons = await sql.unsafe(
      "select coalesce(reason_code,'(null)') as reason_code, count(*)::int as c from listing_lifecycle_events group by reason_code order by c desc limit 25"
    )
    const withdrawReasons = await sql.unsafe(
      "select coalesce(reason_code,'(null)') as reason_code, count(*)::int as c from listing_lifecycle_events where source='import_withdraw' group by reason_code order by c desc"
    )
    const validationReasons = await sql.unsafe(
      "select coalesce(reason_code,'(null)') as reason_code, count(*)::int as c from listing_lifecycle_events where source='validation' group by reason_code order by c desc"
    )
    const latestImportEvent = await sql.unsafe(
      "select created_at, source, reason_code, new_status from listing_lifecycle_events where source in ('import_withdraw','validation','sync') order by created_at desc limit 10"
    )
    const [publicQueryBench] = await sql.unsafe(`
      select
        sum(case when status='active' and operation_type='sale' and (coalesce(address->>'city','') ilike '%rosario%' or coalesce(address->>'neighborhood','') ilike '%rosario%') then 1 else 0 end)::int as venta_rosario,
        sum(case when status='active' and operation_type='rent' and (coalesce(address->>'city','') ilike '%rosario%' or coalesce(address->>'neighborhood','') ilike '%rosario%') then 1 else 0 end)::int as alquiler_rosario,
        sum(case when status='active' and (coalesce(address->>'city','') ilike '%ibarlucea%' or coalesce(address->>'neighborhood','') ilike '%ibarlucea%') then 1 else 0 end)::int as ibarlucea,
        sum(case when status='active' and external_id is not null then 1 else 0 end)::int as con_codigo
      from listings
    `)
    const topCities = await sql.unsafe(`
      select coalesce(nullif(address->>'city',''),'[sin ciudad]') as city, count(*)::int as c
      from listings
      where status='active'
      group by 1
      order by c desc
      limit 15
    `)
    const [trustedColRow] = await sql.unsafe(
      "select count(*)::int as c from information_schema.columns where table_name='import_feed_sources' and column_name='last_trusted_full_feed_item_count'"
    )
    const hasTrustedCount = Number(trustedColRow?.c ?? 0) > 0
    const importFeedSources = hasTrustedCount
      ? await sql.unsafe(
          'select feed_url, last_successful_sync_at, last_trusted_full_feed_item_count, updated_at from import_feed_sources order by updated_at desc limit 20'
        )
      : await sql.unsafe(
          'select feed_url, last_successful_sync_at, null::int as last_trusted_full_feed_item_count, updated_at from import_feed_sources order by updated_at desc limit 20'
        )

    console.log(
      JSON.stringify(
        {
          status,
          source,
          activeVisible: activeVisible?.c ?? 0,
          importActive: importActive?.c ?? 0,
          withExt: withExt?.c ?? 0,
          noPhotos: noPhotos?.c ?? 0,
          staleExpired: staleExpired?.c ?? 0,
          rejected: rejected?.c ?? 0,
          withdrawn: withdrawn?.c ?? 0,
          draft: draft?.c ?? 0,
          lifecycleBySource,
          lifecycleReasons,
          withdrawReasons,
          validationReasons,
          latestImportEvent,
          publicQueryBench,
          topCities,
          hasTrustedFeedBaselineColumn: hasTrustedCount,
          importFeedSources,
        },
        null,
        2
      )
    )
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
