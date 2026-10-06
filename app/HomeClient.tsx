'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { COUNTIES_FULL, CATEGORIES_FULL } from '@/lib/constants'

export default function HomeClient({ initialJobs }: { initialJobs: any[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const qParam = searchParams.get('q') || ''
  const countyParam = searchParams.get('county') || 'All Counties'
  const categoryParam = searchParams.get('category') || 'All Categories'
  const [inputQ, setInputQ] = useState(qParam)

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === 'All Counties' || value === 'All Categories' || value === 'All') params.delete(key)
    else params.set(key, value)
    router.push(`/?${params.toString()}`, { scroll: false })
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="border-b border-zinc-100 bg-[#fcfbf8]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
          <div className="max-w-3xl">
            <p className="text- font-black tracking-widest uppercase text-zinc-500">Kenya's Vacancy Basket • {initialJobs.length} live roles</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-black leading-[0.95] tracking-tight">Find jobs that<br/>actually exist.</h1>
            <p className="mt-3 text-sm text-zinc-600">No fake listings. Every vacancy verified, dated, and removed when closed.</p>
          </div>
          <div className="mt-6 bg-white border border-zinc-200 rounded-2xl shadow-sm p-3 flex flex-col md:flex-row gap-2.5">
            <input value={inputQ} onChange={e=>setInputQ(e.target.value)} onKeyDown={e=>e.key==='Enter' && updateFilter('q', inputQ)} placeholder="Job title, e.g. HR Assistant" className="flex-1 h-12 rounded-xl border border-zinc-200 px-4 text-sm bg-white outline-none focus:border-black" />
            <select value={countyParam} onChange={e=>updateFilter('county', e.target.value)} className="h-12 md:w-48 rounded-xl border border-zinc-200 px-4 text-sm bg-white">{COUNTIES_FULL.map(c=><option key={c} value={c}>{c}</option>)}</select>
            <select value={categoryParam} onChange={e=>updateFilter('category', e.target.value)} className="h-12 md:w-52 rounded-xl border border-zinc-200 px-4 text-sm bg-white">{CATEGORIES_FULL.map(c=><option key={c} value={c}>{c}</option>)}</select>
            <button onClick={()=>updateFilter('q', inputQ)} className="h-12 px-7 rounded-xl bg-black text-white text-sm font-bold">Search Jobs</button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid lg:grid-cols-[1fr_320px] gap-8">
        <div>
          <h2 className="text- font-black uppercase text-zinc-500">LATEST — {initialJobs.length}</h2>
          {initialJobs.length === 0? (
            <div className="mt-8 text-center border border-dashed rounded-2xl p-10">
              <p className="font-bold">No jobs for "{qParam}" in {countyParam}</p>
              <button onClick={()=>router.push('/')} className="mt-3 text-sm underline font-bold">Clear filters</button>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {initialJobs.map((job: any)=>(
                <Link key={job.id} href={`/jobs/${job.slug}`} className="group bg-white border border-zinc-200 rounded-2xl p-4 flex gap-3.5 hover:border-black transition">
                  <div className="h-11 w-11 rounded-xl bg-black text-white grid place-items-center text-sm font-black shrink-0">{(job.company_name?.[0]||'J').toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold truncate group-hover:underline">{job.title}</h3>
                    <p className="text-sm text-zinc-600 truncate">{job.company_name} • {job.location_county} • {job.work_model}</p>
                    <div className="mt-2 flex gap-2"><span className="px-2.5 py-1 rounded-full bg-[#f6f5f2] border text- font-bold uppercase">{job.category}</span><span className="text-xs text-zinc-500">• {job.employment_type}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="bg-black text-white rounded-2xl p-5 h-fit">
          <h4 className="font-black">Employers — hiring?</h4>
          <p className="text-sm text-zinc-300 mt-1.5">Post a job in 60 seconds. Approved in ~2 hrs.</p>
          <Link href="/post-job" className="mt-4 block w-full bg-white text-black text-center py-3 rounded-xl text-sm font-bold">Post a Job</Link>
        </div>
      </div>
    </main>
  )
}