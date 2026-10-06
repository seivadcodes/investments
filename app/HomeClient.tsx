// app/HomeClient.tsx
'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

const COUNTIES = ["All Counties","Nairobi","Mombasa","Kisumu","Nakuru","Kiambu","Machakos","Uasin Gishu","Kakamega","Kilifi","Kwale","Tana River","Lamu","Taita-Taveta","Garissa","Wajir","Mandera","Marsabit","Isiolo","Meru","Tharaka-Nithi","Embu","Kitui","Makueni","Nyandarua","Nyeri","Kirinyaga","Murang'a","Turkana","West Pokot","Samburu","Trans-Nzoia","Elgeyo-Marakwet","Nandi","Baringo","Laikipia","Narok","Kajiado","Kericho","Bomet","Vihiga","Bungoma","Busia","Siaya","Homa Bay","Migori","Kisii","Nyamira"]
const CATEGORIES = ["All Categories","Sales & Marketing","Tech & IT","Finance","Teaching","Healthcare","Engineering","Human Resources / HR","Customer Service","Driving & Logistics","Hospitality","Fundi & Manual","NGO","Internship","Construction","Other"]

export default function HomeClient({ initialJobs }: { initialJobs: any[] }) {
  const [q, setQ] = useState('')
  const [county, setCounty] = useState('All Counties')
  const [category, setCategory] = useState('All Categories')

  const filtered = useMemo(() => initialJobs.filter(j => {
    const mq =!q || `${j.title} ${j.company_name}`.toLowerCase().includes(q.toLowerCase())
    const mc = county === 'All Counties' || j.location_county?.toLowerCase().includes(county.toLowerCase())
    const mcat = category === 'All Categories' || j.category === category
    return mq && mc && mcat
  }), [initialJobs, q, county, category])

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="border-b border-zinc-100 bg-[#fcfbf8]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-widest uppercase text-zinc-500">Kenya's Vacancy Basket • {initialJobs.length} live roles</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-black leading-[0.95] tracking-tight">Find jobs that<br/>actually exist.</h1>
            <p className="mt-3 text-sm md:text-base text-zinc-600 leading-snug">No fake listings. Every vacancy verified, dated, and removed when closed. Search by county and category.</p>
          </div>

          <div className="mt-6 bg-white border border-zinc-200 rounded-2xl shadow-sm p-3 flex flex-col md:flex-row gap-2.5">
            <div className="flex-1 relative">
              <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Job title, e.g. HR Assistant" className="w-full h-12 rounded-xl border border-zinc-200 px-4 text-sm bg-white text-black placeholder:text-zinc-400 outline-none focus:border-black"/>
            </div>
            <select value={county} onChange={e=>setCounty(e.target.value)} className="h-12 md:w-48 rounded-xl border border-zinc-200 px-4 text-sm bg-white text-black">
              {COUNTIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <select value={category} onChange={e=>setCategory(e.target.value)} className="h-12 md:w-52 rounded-xl border border-zinc-200 px-4 text-sm bg-white text-black">
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <button className="h-12 px-7 rounded-xl bg-black text-white text-sm font-bold whitespace-nowrap">Search Jobs</button>
          </div>

          <div className="mt-3 flex gap-2 flex-wrap text-sm">
            <span className="text-zinc-500">Popular:</span>
            {["Nairobi","Sales & Marketing","Tech & IT","Mombasa","NGO"].map(t=>(
              <button key={t} onClick={()=>{if(COUNTIES.includes(t)) setCounty(t); else setCategory(t)}} className="underline text-zinc-700">{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 grid lg:grid-cols-[1fr_320px] gap-8">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black tracking-widest uppercase text-zinc-500">LATEST VACANCIES — {filtered.length}</h2>
            <Link href="/jobs" className="text-sm font-bold underline">View all →</Link>
          </div>

          <div className="mt-4 grid gap-3">
            {filtered.map(job=>(
              <Link key={job.id} href={`/jobs/${job.slug}`} className="group bg-white border border-zinc-200 rounded-2xl p-4 flex gap-3.5 hover:border-black hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition">
                <div className="h-11 w-11 rounded-xl bg-black text-white grid place-items-center text-sm font-black shrink-0">
                  {(job.company_name?.[0]||job.title?.[0]||'J').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <h3 className="text-base font-bold leading-tight group-hover:underline truncate">{job.title}</h3>
                    <span className="hidden md:block text-xs text-zinc-400 shrink-0">{job.posted_date? new Date(job.posted_date).toISOString().split('T')[0] : ''}</span>
                  </div>
                  <p className="text-sm text-zinc-600 mt-1">{job.company_name || 'Confidential'} • {job.location_county} • {job.work_model || 'On-site'}</p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-[#f6f5f2] border border-zinc-200 text- font-bold uppercase tracking-widest">{job.category}</span>
                    <span className="text-xs text-zinc-500">• {job.employment_type}</span>
                    <span className="ml-auto text-xs font-bold text-black inline-flex items-center gap-1">Apply <span>→</span></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-black text-white rounded-2xl p-5">
            <h4 className="text-base font-black">Employers — hiring?</h4>
            <p className="text-sm text-zinc-300 mt-1.5 leading-snug">Post a job in 60 seconds. We verify and publish. No fake agency fees.</p>
            <Link href="/post-job" className="mt-4 block w-full bg-white text-black text-center py-3 rounded-xl text-sm font-bold">Post a Job</Link>
            <p className="mt-2 text-xs text-zinc-400 text-center">Free • Approved in ~2 hrs</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-2xl p-5">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500">Browse by Category</h4>
            <div className="mt-3 grid grid-cols-1 gap-1.5">
              {CATEGORIES.slice(1,9).map(cat=>{
                const count = initialJobs.filter((j:any)=>j.category===cat).length
                return <button key={cat} onClick={()=>setCategory(cat)} className={`flex justify-between text-left px-3 py-2.5 rounded-xl text-sm border ${category===cat?'bg-black text-white border-black':'bg-[#fcfbf8] border-zinc-100 hover:border-zinc-200 text-black'}`}><span>{cat}</span><span className="text-xs opacity-60">{count}</span></button>
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}