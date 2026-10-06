import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { COUNTIES_FULL, CATEGORIES_FULL } from '@/lib/constants'

export default async function sitemap() {
  const supabase = supabaseAdmin()
  const { data: jobs } = await supabase.from('jobs').select('slug, posted_date').eq('status','published').limit(2000)

  const base = 'https://jobvacancybasket.co.ke'
  const jobUrls = (jobs || []).map((j: any) => ({ url: `${base}/jobs/${j.slug}`, lastModified: j.posted_date }))

  const countyUrls = COUNTIES_FULL.filter(c=>c!=='All Counties').map(c => ({ url: `${base}/?county=${encodeURIComponent(c)}`, lastModified: new Date() }))
  const catUrls = CATEGORIES_FULL.filter(c=>c!=='All Categories').map(c => ({ url: `${base}/?category=${encodeURIComponent(c)}`, lastModified: new Date() }))

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/jobs`, lastModified: new Date() },
   ...jobUrls,
   ...countyUrls,
   ...catUrls
  ]
}