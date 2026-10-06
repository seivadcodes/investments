import { supabaseAdmin } from '@/lib/supabaseAdmin'
import JobsClient from './JobsClient'

export const revalidate = 300

async function getAllJobs(params: { q?: string, county?: string, category?: string }) {
  const supabase = supabaseAdmin()
  const today = new Date().toISOString().split('T')[0]
  let query = supabase.from('jobs').select('*').eq('status','published').eq('testing', false).or(`expiry_date.gte.${today},expiry_date.is.null`).order('posted_date', { ascending: false }).limit(200)
  if (params.q) query = query.or(`title.ilike.%${params.q}%,company_name.ilike.%${params.q}%`)
  if (params.county && params.county!== 'All') query = query.ilike('location_county', `%${params.county}%`)
  if (params.category && params.category!== 'All') query = query.eq('category', params.category)
  const { data } = await query
  return data || []
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string, county?: string, category?: string }> }) {
  const params = await searchParams
  const jobs = await getAllJobs(params)
  return <JobsClient initialJobs={jobs} />
}