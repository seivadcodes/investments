'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const ALL_COUNTIES = ["Mombasa","Kwale","Kilifi","Tana River","Lamu","Taita-Taveta","Garissa","Wajir","Mandera","Marsabit","Isiolo","Meru","Tharaka-Nithi","Embu","Kitui","Machakos","Makueni","Nyandarua","Nyeri","Kirinyaga","Murang'a","Kiambu","Turkana","West Pokot","Samburu","Trans-Nzoia","Uasin Gishu","Elgeyo-Marakwet","Nandi","Baringo","Laikipia","Nakuru","Narok","Kajiado","Kericho","Bomet","Kakamega","Vihiga","Bungoma","Busia","Siaya","Kisumu","Homa Bay","Migori","Kisii","Nyamira","Nairobi"]

const SUGGESTED_CATEGORIES = ["Sales & Marketing","Tech & IT","Finance","Teaching","Healthcare","Engineering","Manufacturing","Human Resources / HR","Customer Service","Legal","Hospitality","Driver / Logistics","Construction","Agriculture","NGO / Social Work","Other"]

export default function PostJobPage(){
  const [loading,setLoading]=useState(false)
  const [done,setDone]=useState(false)
  const [qCounty,setQCounty]=useState('')
  const [qCat,setQCat]=useState('')
  const [form,setForm]=useState({
    title:'', company_name:'', location_county:'Nairobi', work_model:'On-site',
    category:'', job_type:'Full-time', description:'',
    application_email:'', application_link:'',
    expiry_date: new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0]
  })

  const filteredCounties = useMemo(()=> ALL_COUNTIES.filter(c=> c.toLowerCase().includes(qCounty.toLowerCase())), [qCounty])
  const filteredCats = useMemo(()=> SUGGESTED_CATEGORIES.filter(c=> c.toLowerCase().includes(qCat.toLowerCase())), [qCat])

  const submit = async (e:any)=>{
    e.preventDefault()
    if(!form.application_email &&!form.application_link){ alert('Add email or link'); return }
    setLoading(true)
    const slug = `${form.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${Date.now()}`
    const today = new Date().toISOString().split('T')[0]

    const {error} = await supabase.from('jobs').insert([{
      title: form.title,
      company_name: form.company_name,
      location_county: form.location_county, // whatever they typed
      work_model: form.work_model,
      category: form.category || 'Other', // saves custom category
      job_type: form.job_type,
      description: form.description,
      application_email: form.application_email || null,
      application_link: form.application_link || null,
      posted_date: today,
      expiry_date: form.expiry_date,
      slug,
      status: 'pending',
      testing: false,
    }])
    setLoading(false)
    if(!error) setDone(true)
    else alert(error.message)
  }

  if(done) return (
    <main className="max-w-2xl mx-auto p-6 text-black">
      <div className="bg-white border rounded-2xl p-8 text-center"><h1 className="text-xl font-black">Vacancy submitted!</h1><p className="text-sm text-zinc-700 mt-2">Pending approval: {form.category}</p></div>
    </main>
  )

  return (
    <main className="max-w-2xl mx-auto p-6 text-black">
      <h1 className="text- font-black">Post a Vacancy</h1>
      <form onSubmit={submit} className="mt-6 bg-white border rounded-2xl p-5 grid gap-4">

        <input required placeholder="Job title" className="border rounded-xl px-4 py-3 text-sm bg-white text-black" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
        <input required placeholder="Company name" className="border rounded-xl px-4 py-3 text-sm bg-white text-black" value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/>

        {/* COUNTY - type or select all 47 */}
        <div>
          <p className="text- font-black uppercase tracking-widest text-zinc-500 mb-1">Location - type or select</p>
          <input list="counties-list" placeholder="e.g. Nairobi, or type your own town" className="w-full border rounded-xl px-4 py-3 text-sm bg-white text-black" value={form.location_county} onChange={e=>{setForm({...form,location_county:e.target.value}); setQCounty(e.target.value)}}/>
          <datalist id="counties-list">{ALL_COUNTIES.map(c=><option key={c} value={c} />)}</datalist>
        </div>

        {/* CATEGORY - NOW FREE TYPE */}
        <div className="bg-[#f6f5f2] rounded-xl p-3">
          <p className="text- font-black uppercase tracking-widest text-zinc-500 mb-2">Category - type or select, if not in list just type it</p>
          <input
            list="cats-list"
            placeholder="e.g. Plumber, Chef, House Help, Security..."
            className="w-full border rounded-xl px-4 py-3 text-sm bg-white text-black"
            value={form.category}
            onChange={e=>{setForm({...form,category:e.target.value}); setQCat(e.target.value)}}
            required
          />
          <datalist id="cats-list">{SUGGESTED_CATEGORIES.map(c=><option key={c} value={c} />)}</datalist>
          <div className="mt-2 flex flex-wrap gap-1">
            {filteredCats.slice(0,8).map(c=>(
              <button type="button" key={c} onClick={()=>setForm({...form,category:c})} className={`px-2.5 py-1 rounded-full text- border ${form.category===c?'bg-black text-white':'bg-white text-black'}`}>{c}</button>
            ))}
          </div>
          <p className="text- text-zinc-500 mt-2">If not listed, just type it — we will save your custom category exactly as typed.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select className="border rounded-xl px-4 py-3 text-sm bg-white text-black" value={form.work_model} onChange={e=>setForm({...form,work_model:e.target.value})}>
            <option>On-site</option><option>Hybrid</option><option>Remote</option><option>Field-based</option>
          </select>
          <select className="border rounded-xl px-4 py-3 text-sm bg-white text-black" value={form.job_type} onChange={e=>setForm({...form,job_type:e.target.value})}>
            <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option><option>Casual / Piece Work</option>
          </select>
        </div>

        <textarea required rows={6} placeholder="Job description" className="border rounded-xl px-4 py-3 text-sm bg-white text-black" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>

        <input placeholder="Application email" type="email" className="border rounded-xl px-4 py-3 text-sm bg-white text-black" value={form.application_email} onChange={e=>setForm({...form,application_email:e.target.value})}/>
        <input placeholder="Application link https://..." type="url" className="border rounded-xl px-4 py-3 text-sm bg-white text-black" value={form.application_link} onChange={e=>setForm({...form,application_link:e.target.value})}/>

        <input required type="date" className="border rounded-xl px-4 py-3 text-sm bg-white text-black" value={form.expiry_date} onChange={e=>setForm({...form,expiry_date:e.target.value})}/>

        <button disabled={loading} className="bg-black text-white py-3 rounded-xl font-bold text-sm">{loading?'Submitting...':'Submit for Approval'}</button>
      </form>
    </main>
  )
}