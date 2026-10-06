// app/page.tsx - THIS IS THE SERVER FILE, NO 'use client'
import { createClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'

export const revalidate = 300 // rebuild every 5 minutes with fresh jobs

async function getJobs() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
   .from('jobs')
   .select('*')
   .eq('status', 'published')
   .eq('testing', false)
   .or(`expiry_date.gte.${today},expiry_date.is.null`)
   .order('posted_date', { ascending: false })
   .limit(80)

  return data || []
}

export default async function Page() {
  const jobs = await getJobs() // jobs are fetched on the SERVER
  return <HomeClient initialJobs={jobs} />
}