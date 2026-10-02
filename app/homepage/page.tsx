'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const COUNTIES = ["Nairobi","Mombasa","Kisumu","Nakuru","Kiambu","Machakos","Kajiado","Uasin Gishu"]
const CATEGORIES = ["Sales & Marketing","Tech & IT","Finance","Teaching","Healthcare","Engineering","Manufacturing","Human Resources / HR"]

export default function HomePage(){
  const [jobs,setJobs]=useState<any[]>([])
  const [q,setQ]=useState(''); const [county,setCounty]=useState(''); const [cat,setCat]=useState('')

  const load=async()=>{
    let query = supabase.from('jobs').select('*').eq('testing',false).eq('status','published').order('posted_date',{ascending:false}).limit(12)
    if(q) query = query.ilike('title',`%${q}%`)
    if(county) query = query.eq('location_county',county)
    if(cat) query = query.eq('category',cat)
    const {data}=await query; setJobs(data||[])
  }
  useEffect(()=>{ load() },[])

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-black">
      <Header />
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-6">
        <h1 className="text- md:text- font-black tracking-tight leading-[0.95] text-black">Your basket of<br/>job vacancies.</h1>
        <p className="text- text-zinc-700 mt-4 max-w-xl leading-6">Fresh openings in Kenya — posted as soon as they are available. Simple, fast, no clutter.</p>

        <div className="mt-6 bg-white border border-zinc-200 rounded- p-3 md:p-4 flex flex-col md:flex-row gap-3 shadow-sm">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Job title, e.g. HR Assistant" className="flex-1 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-black bg-white"/>
          <select value={county} onChange={e=>setCounty(e.target.value)} className="border border-zinc-200 rounded-xl px-4 py-3 text-sm text-black bg-white w-full md:w-">
            <option value="">All Counties</option>{COUNTIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <select value={cat} onChange={e=>setCat(e.target.value)} className="border border-zinc-200 rounded-xl px-4 py-3 text-sm text-black bg-white w-full md:w-">
            <option value="">All Categories</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <button onClick={load} className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold">Search</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mt-4">
          <h2 className="text- font-black uppercase tracking-widest text-zinc-500">Latest Vacancies — {jobs.length}</h2>
          <Link href="/jobs" className="text-sm font-bold text-black underline">View all →</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {jobs.map(job=>(
            <Link key={job.id} href={`/jobs/${job.slug}`} className="bg-white border border-zinc-200 rounded-2xl p-4 hover:shadow-md block">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-black text-sm">{job.company_name?.[0]}</div>
                <div className="min-w-0">
                  <h3 className="font-bold text- text-black truncate">{job.title}</h3>
                  <p className="text- text-zinc-700 mt-1">{job.company_name} • {job.location_county} • {job.work_model}</p>
                  <p className="text- text-zinc-500 mt-1">{job.category} • Posted {job.posted_date}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  )
}