// app/jobs/JobsClient.tsx
'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

const COUNTIES = ["All","Nairobi","Mombasa","Kisumu","Nakuru","Kiambu","Uasin Gishu","Machakos","Kajiado","Kilifi"]
const CATEGORIES = ["All","Sales & Marketing","Tech & IT","Finance","Teaching","Healthcare","Human Resources / HR","Customer Service","Driving & Logistics","Hospitality","NGO"]

export default function JobsClient({ initialJobs }: { initialJobs: any[] }) {
  const [q, setQ] = useState('')
  const [county, setCounty] = useState('All')
  const [cat, setCat] = useState('All')

  const filtered = useMemo(() => {
    return initialJobs.filter(j => {
      const mq =!q || j.title.toLowerCase().includes(q.toLowerCase()) || j.company_name?.toLowerCase().includes(q.toLowerCase())
      const mc = county === 'All' || j.location_county?.toLowerCase().includes(county.toLowerCase())
      const mcat = cat === 'All' || j.category === cat
      return mq && mc && mcat
    })
  }, [initialJobs, q, county, cat])

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-black">
      <div className="max-w-5xl mx-auto p-6">
        <Link href="/" className="text-sm text-black underline font-medium">← Home</Link>
        <h1 className="text-3xl font-black mt-3 tracking-tight text-black">Recent Jobs — {filtered.length} live</h1>
        <div className="mt-5 bg-white border border-zinc-200 rounded-2xl p-4 flex flex-wrap gap-3 shadow-sm">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title..." className="border border-zinc-200 rounded-xl p-2.5 text-sm text-black bg-white placeholder:text-zinc-400 w-52"/>
          <select value={county} onChange={e=>setCounty(e.target.value)} className="border border-zinc-200 rounded-xl p-2.5 text-sm text-black bg-white">{COUNTIES.map(c=><option key={c}>{c}</option>)}</select>
          <select value={cat} onChange={e=>setCat(e.target.value)} className="border border-zinc-200 rounded-xl p-2.5 text-sm text-black bg-white">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
          <div className="bg-zinc-100 px-3 py-2.5 rounded-xl text-xs font-bold">{filtered.length} results</div>
        </div>

        <div className="grid gap-3 mt-6">
          {filtered.map(job=>(
            <Link key={job.id} href={`/jobs/${job.slug}`} className="bg-white border border-zinc-200 rounded-2xl p-4 hover:shadow-md block transition hover:border-black">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h2 className="font-bold text- text-black">{job.title}</h2>
                  <p className="text-sm text-zinc-700 mt-1">{job.company_name} • {job.location_county} • {job.work_model} • {job.employment_type}</p>
                  <p className="text-xs text-zinc-500 mt-1">{job.category} • Posted {job.posted_date}</p>
                </div>
                <div className="text-right shrink-0">
                  {job.salary_min && <p className="text-sm font-bold text-black">KES {Number(job.salary_min).toLocaleString()}</p>}
                  <p className="text-xs mt-2 text-black font-medium underline">View details →</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}