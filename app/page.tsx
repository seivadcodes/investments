import { supabaseAdmin } from '@/lib/supabaseAdmin'
import HomeClient from './HomeClient'
import type { Metadata } from 'next'

export const revalidate = 300

export const metadata: Metadata = {
  title: "Verified Jobs in Kenya Today - Iko Kazi KE | Job Vacancy Basket",
  description: "Find real jobs that exist. 100% verified vacancies in Nairobi, Mombasa, Kisumu and all 47 counties. Updated every 5 minutes.",
  alternates: { canonical: "https://jobvacancybasket.co.ke" }
}

async function getJobs(params: { q?: string, county?: string, category?: string }) {
  const supabase = supabaseAdmin()
  const today = new Date().toISOString().split('T')[0]
  let query = supabase.from('jobs').select('*').eq('status','published').eq('testing', false).or(`expiry_date.gte.${today},expiry_date.is.null`).order('posted_date', { ascending: false }).limit(100)
  if (params.q) query = query.or(`title.ilike.%${params.q}%,company_name.ilike.%${params.q}%`)
  if (params.county && params.county!== 'All Counties' && params.county!== 'All') query = query.ilike('location_county', `%${params.county}%`)
  if (params.category && params.category!== 'All Categories' && params.category!== 'All') query = query.eq('category', params.category)
  const { data, error } = await query
  if (error) console.error(error)
  return data || []
}

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string, county?: string, category?: string }> }) {
  const params = await searchParams
  const jobs = await getJobs(params)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": jobs.slice(0,20).map((job: any, i: number) => ({ "@type": "ListItem", "position": i+1, "url": `https://jobvacancybasket.co.ke/jobs/${job.slug}` }))
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <HomeClient initialJobs={jobs} />
    </>
  )
}