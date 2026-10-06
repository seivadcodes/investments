// app/jobs/page.tsx
import { createClient } from '@supabase/supabase-js'
import JobsClient from './JobsClient'

export const revalidate = 300

async function getAllJobs() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
   .from('jobs')
   .select('*')
   .eq('testing', false)
   .eq('status', 'published')
   .or(`expiry_date.gte.${today},expiry_date.is.null`)
   .order('posted_date', { ascending: false })
   .limit(200)
  return data || []
}

export default async function JobsPage() {
  const jobs = await getAllJobs()
  return <JobsClient initialJobs={jobs} />
}