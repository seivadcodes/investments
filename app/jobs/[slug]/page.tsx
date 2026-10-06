import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export const revalidate = 300

function cleanDesc(text: string) {
  if (!text) return ''
  return text.split('\n').filter(line => {
    const t = line.trim()
    return!/^(Company:|Location:|Category:|Employment Type:|Work Model:|Apply Email:|Apply URL:|Original Source:|Salary:)/i.test(t)
      &&!/^https?:\/\//i.test(t)
      &&!/myjobmag|recruitfinds|brightermonday/i.test(t)
  }).join('\n').trim()
}

// This makes Google show title in search
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data: job } = await supabase.from('jobs').select('title, company_name, location_county').eq('slug', slug).single()
  if (!job) return { title: 'Job not found' }
  return {
    title: `${job.title} at ${job.company_name} - ${job.location_county} | Job Vacancy Basket`,
    description: `${job.title} vacancy at ${job.company_name} in ${job.location_county}. Apply now on Job Vacancy Basket - Kenya's verified jobs.`,
  }
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: job } = await supabase.from('jobs').select('*').eq('slug', slug).eq('testing', false).single()
  if (!job) return notFound()
  const description = cleanDesc(job.description)

  // GOOGLE JOBS SCHEMA - This is what gets you in Google Jobs box
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    "title": job.title,
    "description": description,
    "datePosted": job.posted_date,
    "validThrough": job.expiry_date,
    "employmentType": job.employment_type,
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.company_name,
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.location_county,
        "addressCountry": "KE"
      }
    },
    "baseSalary": job.salary_min? {
      "@type": "MonetaryAmount",
      "currency": "KES",
      "value": { "@type": "QuantitativeValue", "minValue": job.salary_min, "maxValue": job.salary_max, "unitText": "MONTH" }
    } : undefined
  }

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <Link href="/jobs" className="text-sm font-medium text-black underline">← Back to jobs</Link>
        <div className="mt-4 bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-7">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center font-black text-lg shrink-0">{job.company_name?.[0]?.toUpperCase()}</div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-black leading-tight tracking-tight text-black">{job.title}</h1>
                <p className="text-sm text-zinc-700 mt-1.5 font-medium">{job.company_name} • {job.location_county}{job.location_city? ` • ${job.location_city}` : ''}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text- font-semibold tracking-wide text-black">{job.category}</span>
                  <span className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text- font-semibold tracking-wide text-black">{job.employment_type}</span>
                  <span className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text- font-semibold tracking-wide text-black">{job.work_model}</span>
                </div>
              </div>
            </div>
            {job.salary_min && (
              <div className="mt-5 flex items-center justify-between bg-[#fff7ed] border border-orange-200 rounded-xl px-4 py-3">
                <div><p className="text- font-bold tracking-widest text-orange-700 uppercase">Salary • Monthly</p><p className="text-base font-black text-black mt-0.5">KES {Number(job.salary_min).toLocaleString()} - {job.salary_max? Number(job.salary_max).toLocaleString() : ''}</p></div>
                <div className="text-xs text-zinc-600">Posted {job.posted_date}</div>
              </div>
            )}
          </div>
          <div className="h-px bg-zinc-200" />
          <div className="p-6 md:p-7">
            <h3 className="text- font-black tracking-widest uppercase text-zinc-500">JOB DETAILS</h3>
            <div className="mt-3 text-[14.5px] leading-6 text-zinc-900 whitespace-pre-wrap">{description}</div>
          </div>
          <div className="h-px bg-zinc-200" />
          <div className="p-6 md:p-7 bg-[#fafaf9]">
            <h3 className="text- font-black tracking-widest uppercase text-zinc-500">How to Apply</h3>
            {job.application_email && (
              <div className="mt-3 bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
                <div><p className="text- font-bold uppercase tracking-wide text-zinc-500">Email CV to</p><p className="text-sm font-mono font-bold text-black mt-1">{job.application_email}</p></div>
                <a href={`mailto:${job.application_email}?subject=${encodeURIComponent(job.title)}`} className="bg-black text-white text-sm font-bold px-4 py-2 rounded-full">Email</a>
              </div>
            )}
            {job.application_url && <a href={job.application_url} target="_blank" className="mt-3 w-full bg-black text-white text-center py-3.5 rounded-xl font-bold text-sm block">Apply on Company Site →</a>}
            <p className="text-xs text-zinc-500 mt-4">Never pay for recruitment. If asked for money, report.</p>
            <p className="text- text-zinc-400 mt-2">Source verified by Job Vacancy Basket • {job.posted_date}</p>
          </div>
        </div>
      </div>
    </main>
  )
}