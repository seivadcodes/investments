import { supabaseAdmin } from '@/lib/supabaseAdmin'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const revalidate = 300

function cleanDesc(text: string) {
  if (!text) return ''
  return text.split('\n').filter(line => {
    const t = line.trim()
    return!/^(Company:|Location:|Category:|Employment Type:|Work Model:|Apply Email:|Apply URL:|Original Source:|Salary:)/i.test(t) &&!/^https?:\/\//i.test(t) &&!/myjobmag|recruitfinds|brightermonday/i.test(t)
  }).join('\n').trim()
}
function mapEmploymentType(t: string) {
  const m: Record<string,string> = { 'Full Time':'FULL_TIME','Full-time':'FULL_TIME','Part Time':'PART_TIME','Contract':'CONTRACTOR','Internship':'INTERN','Intern':'INTERN' }
  return m[t] || 'FULL_TIME'
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = supabaseAdmin()
  const { data: job } = await supabase.from('jobs').select('title, company_name, location_county').eq('slug', slug).single()
  if (!job) return { title: 'Job not found' }
  return {
    title: `${job.title} at ${job.company_name} - ${job.location_county}`,
    description: `${job.title} vacancy at ${job.company_name} in ${job.location_county}. Apply now on Job Vacancy Basket.`,
    alternates: { canonical: `https://jobvacancybasket.co.ke/jobs/${slug}` }
  }
}

export default async function JobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = supabaseAdmin()
  const { data: job } = await supabase.from('jobs').select('*').eq('slug', slug).eq('status','published').single()
  if (!job) return notFound()
  const description = cleanDesc(job.description)

  const jsonLd: any = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    "title": job.title,
    "description": description,
    "datePosted": new Date(job.posted_date).toISOString(),
    "employmentType": mapEmploymentType(job.employment_type),
    "hiringOrganization": { "@type": "Organization", "name": job.company_name, "sameAs": "https://jobvacancybasket.co.ke" },
    "jobLocation": { "@type": "Place", "address": { "@type": "PostalAddress", "addressLocality": job.location_county, "addressCountry": "KE" } },
    "identifier": { "@type": "PropertyValue", "name": "Job Vacancy Basket", "value": job.slug }
  }
  if (job.expiry_date) jsonLd.validThrough = new Date(job.expiry_date).toISOString()
  if (job.salary_min) jsonLd.baseSalary = { "@type": "MonetaryAmount", "currency": "KES", "value": { "@type": "QuantitativeValue", "minValue": job.salary_min, "maxValue": job.salary_max || job.salary_min, "unitText": "MONTH" } }

  const { data: related } = await supabase.from('jobs').select('title, slug, location_county').eq('category', job.category).neq('slug', slug).limit(5)

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto p-4 md:p-6">
        <Link href="/jobs" className="text-sm underline">← Back to jobs</Link>
        <div className="mt-4 bg-white border rounded-2xl overflow-hidden">
          <div className="p-6 md:p-7">
            <h1 className="text-2xl font-black tracking-tight">{job.title}</h1>
            <p className="text-sm text-zinc-700 mt-2">{job.company_name} • {job.location_county}</p>
            <div className="flex gap-2 mt-3"><span className="px-2.5 py-1 rounded-full bg-zinc-100 border text- font-bold uppercase">{job.category}</span><span className="px-2.5 py-1 rounded-full bg-zinc-100 border text- font-bold uppercase">{job.employment_type}</span></div>
            {job.salary_min && <div className="mt-5 bg-[#fff7ed] border border-orange-200 rounded-xl px-4 py-3 flex justify-between"><p className="text-sm font-black">KES {Number(job.salary_min).toLocaleString()} - {job.salary_max? Number(job.salary_max).toLocaleString():''}</p><p className="text-xs text-zinc-600">Posted {job.posted_date?.split('T')[0]}</p></div>}
          </div>
          <div className="h-px bg-zinc-200" />
          <div className="p-6 md:p-7"><h3 className="text- font-black uppercase text-zinc-500">JOB DETAILS</h3><div className="mt-3 text-[14.5px] leading-6 whitespace-pre-wrap">{description}</div></div>
          <div className="h-px bg-zinc-200" />
          <div className="p-6 bg-[#fafaf9]">
            <h3 className="text- font-black uppercase text-zinc-500">How to Apply</h3>
            {job.application_url && <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="mt-3 w-full bg-black text-white text-center py-3.5 rounded-xl font-bold text-sm block">Apply on Company Site →</a>}
            {job.application_email && <a href={`mailto:${job.application_email}?subject=${encodeURIComponent(job.title)}`} className="mt-3 w-full bg-white border text-center py-3.5 rounded-xl font-bold text-sm block">{job.application_email}</a>}
            <p className="text-xs text-zinc-500 mt-4">Never pay for recruitment. If asked for money, report.</p>
          </div>
        </div>
        {related && related.length>0 && <div className="mt-6"><h4 className="text- font-black uppercase text-zinc-500">Similar {job.category} jobs</h4><div className="mt-3 grid gap-2">{related.map((r:any)=><Link key={r.slug} href={`/jobs/${r.slug}`} className="text-sm underline">{r.title} - {r.location_county}</Link>)}</div></div>}
      </div>
    </main>
  )
}