'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const COUNTIES = ["All","Nairobi","Mombasa","Kisumu","Nakuru","Kiambu","Uasin Gishu","Machakos","Kajiado"]
const CATEGORIES = ["All","Sales & Marketing","Tech & IT","Finance","Teaching","Healthcare","Human Resources / HR"]

export default function AllJobsPage(){
  const [jobs,setJobs]=useState<any[]>([])
  const [q,setQ]=useState('')
  const [county,setCounty]=useState('All')
  const [cat,setCat]=useState('All')
  const [loading,setLoading]=useState(true)

  const load=async()=>{
    setLoading(true)
    let query=supabase.from('jobs').select('*').eq('testing',false).eq('status','published').order('posted_date',{ascending:false}).limit(100)
    if(county!=='All') query=query.eq('location_county',county)
    if(cat!=='All') query=query.eq('category',cat)
    if(q) query=query.ilike('title',`%${q}%`)
    const {data}=await query
    setJobs(data||[]); setLoading(false)
  }
  useEffect(()=>{ load() },[])

  return (
    <main className="min-h-screen bg-[#f6f5f2] text-black">
      <div className="max-w-5xl mx-auto p-6">
        <Link href="/" className="text-sm text-black underline font-medium">← Home</Link>
        <h1 className="text-3xl font-black mt-3 tracking-tight text-black">All Jobs — {jobs.length} live</h1>
        <div className="mt-5 bg-white border border-zinc-200 rounded-2xl p-4 flex flex-wrap gap-3 shadow-sm">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title..." className="border border-zinc-200 rounded-xl p-2.5 text-sm text-black bg-white placeholder:text-zinc-400 w-52"/>
          <select value={county} onChange={e=>setCounty(e.target.value)} className="border border-zinc-200 rounded-xl p-2.5 text-sm text-black bg-white">{COUNTIES.map(c=><option key={c}>{c}</option>)}</select>
          <select value={cat} onChange={e=>setCat(e.target.value)} className="border border-zinc-200 rounded-xl p-2.5 text-sm text-black bg-white">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
          <button onClick={load} className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold">Filter</button>
        </div>
        {loading? <p className="mt-6 text-sm text-zinc-700">Loading...</p> : (
          <div className="grid gap-3 mt-6">
            {jobs.map(job=>(
              <Link key={job.id} href={`/jobs/${job.slug}`} className="bg-white border border-zinc-200 rounded-2xl p-4 hover:shadow-md block transition">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h2 className="font-bold text- text-black">{job.title}</h2>
                    <p className="text-sm text-zinc-700 mt-1">{job.company_name} • {job.location_county} • {job.work_model} • {job.employment_type}</p>
                    <p className="text-xs text-zinc-500 mt-1">{job.category} • Posted {job.posted_date}</p>
                  </div>
                  <div className="text-right">
                    {job.salary_min && <p className="text-sm font-bold text-black">KES {Number(job.salary_min).toLocaleString()}</p>}
                    <p className="text-xs mt-2 text-black font-medium underline">View details →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}