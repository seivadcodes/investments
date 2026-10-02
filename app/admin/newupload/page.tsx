'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const COUNTIES = ["Nairobi","Mombasa","Kisumu","Nakuru","Kiambu","Uasin Gishu","Machakos","Kajiado","Turkana","Kericho","Meru","Kisii","Eldoret","Kilifi","Kwale","Nyeri","Murang'a","Bungoma","Kakamega","Kitui"]
const CATEGORIES = ["Sales & Marketing","Tech & IT","Finance","Teaching","Healthcare","Engineering","Hospitality","Customer Service","Driving & Logistics","Fundi & Manual","NGO","Internship","Human Resources / HR"]
const EMP_TYPES = ["Full-time","Part-time","Contract","Internship","Casual"]
const WORK_MODELS = ["On-site","Hybrid","Remote","Field","WhatsApp"]

export default function UploadPage(){
  const [tab,setTab]=useState<'paste'|'manual'>('paste')
  const [paste,setPaste]=useState('')
  const [saving,setSaving]=useState(false)
  const [msg,setMsg]=useState('')
  const [form,setForm]=useState({
    title:'', company_name:'', location_county:'Nairobi', location_city:'',
    category:'Sales & Marketing', employment_type:'Full-time', work_model:'On-site',
    salary_min:'', salary_max:'', application_email:'', application_url:'',
    original_source_url:'', description:'', posted_date:new Date().toISOString().slice(0,10),
    expiry_date:'', status:'published', testing:false
  })
  const update=(k:string,v:any)=>setForm(f=>({...f,[k]:v}))
  const inputClass="w-full border border-gray-300 rounded-lg p-2.5 mt-1 text-sm text-black bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-black focus:outline-none"
  const labelClass="text-xs font-semibold text-gray-900"

  const doExtract=()=>{
    const raw=paste
    if(!raw.trim()) return setMsg('Paste something first')
    const splitByDesc=raw.split(/Description:/i)
    let header=raw
    let descriptionOnly=raw
    if(splitByDesc.length>1){
      header=splitByDesc[0]
      descriptionOnly=splitByDesc.slice(1).join('Description:').trim()
    }
    const email=header.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || ''
    const urls=[...header.matchAll(/https?:\/\/[^\s\)]+/g)].map(m=>m[0])
    const appUrl=urls[0] || [...raw.matchAll(/https?:\/\/[^\s\)]+/g)].map(m=>m[0])[0] || ''
    const sal=header.match(/(?:KES|Ksh\.?|Salary:?)\s*([0-9,]{4,})\s*[-–to]+\s*([0-9,]{4,})/i)
    const singleSal=header.match(/(?:KES|Ksh\.?)\s*([0-9,]{4,})/i)
    const foundCounty=COUNTIES.find(c=>new RegExp(`\\b${c}\\b`,'i').test(header))||'Nairobi'
    const lines=header.split('\n').map(l=>l.trim()).filter(Boolean)
    const titleLine=lines.find(l=>!l.toLowerCase().startsWith('company:')&&!l.toLowerCase().startsWith('location:')&&!l.toLowerCase().startsWith('category:')&&l.length>6&&l.length<90)||lines[0]||''
    const companyMatch=header.match(/(?:Company:\s*|at\s+)([A-Z][A-Za-z &]{2,40})/)

    // Strip meta lines from description
    const META=/^(Company:|Location:|Category:|Employment Type:|Work Model:|Apply Email:|Apply URL:|Original Source:|Salary:)/i
    descriptionOnly=descriptionOnly.split('\n').filter(l=>!META.test(l.trim())&&!/^https?:\/\//.test(l.trim())).join('\n').trim()

    setForm(f=>({
     ...f,
      title:titleLine.replace(/\s+at\s+.*/i,'').slice(0,80),
      company_name:companyMatch?companyMatch[1].trim():f.company_name,
      location_county:foundCounty,
      description:descriptionOnly,
      application_email:email,
      application_url:appUrl,
      original_source_url:appUrl,
      salary_min:sal?sal[1].replace(/,/g,''):singleSal?singleSal[1].replace(/,/g,''):f.salary_min,
      salary_max:sal?sal[2].replace(/,/g,''):f.salary_max,
    }))
    setTab('manual')
    setMsg('Extracted! URLs removed from description — check and save.')
  }

  const save=async()=>{
    if(!form.title||!form.company_name||!form.description) return setMsg('Title, Company, Description required')
    setSaving(true)
    const slug=form.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString().slice(-6)
    const {error}=await supabase.from('jobs').insert([{
      title:form.title, slug, company_name:form.company_name, description:form.description,
      location_county:form.location_county, location_city:form.location_city, category:form.category,
      employment_type:form.employment_type, work_model:form.work_model,
      salary_min:form.salary_min?parseInt(form.salary_min as any):null,
      salary_max:form.salary_max?parseInt(form.salary_max as any):null,
      application_email:form.application_email||null, application_url:form.application_url||null,
      original_source_url:form.original_source_url||null, status:form.testing?'draft':form.status,
      posted_date:form.posted_date, expiry_date:form.expiry_date||null, testing:form.testing
    }])
    setSaving(false)
    if(error) setMsg('Error: '+error.message)
    else { setMsg(`Saved! ${form.testing?'DRAFT hidden':'LIVE'}`); setPaste('') }
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-black">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-black tracking-tight text-black">Upload Job — JobMtaani</h1>
        <div className="flex gap-2 mt-6 bg-white p-1 rounded-full border border-gray-300 w-fit">
          <button onClick={()=>setTab('paste')} className={`px-5 py-2 rounded-full text-sm font-bold ${tab==='paste'?'bg-black text-white':'bg-white text-black border border-gray-300'}`}>1. Paste & Extract</button>
          <button onClick={()=>setTab('manual')} className={`px-5 py-2 rounded-full text-sm font-bold ${tab==='manual'?'bg-black text-white':'bg-white text-black border border-gray-300'}`}>2. Review & Publish</button>
        </div>
        {msg&&<div className="mt-4 p-3 rounded-lg bg-yellow-100 border border-yellow-300 text-sm text-black font-medium">{msg}</div>}
        {tab==='paste'?(
          <div className="mt-6 bg-white border border-gray-300 rounded-2xl p-5">
            <label className={labelClass}>Paste cleaned job here (from any AI prompt)</label>
            <textarea value={paste} onChange={e=>setPaste(e.target.value)} className="w-full h- mt-3 border border-gray-300 rounded-xl p-4 text-sm font-mono text-black bg-white placeholder:text-gray-400" placeholder="HR Assistant at Jiji Kenya..."/>
            <div className="flex justify-end mt-3"><button onClick={doExtract} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold">Extract → Form</button></div>
          </div>
        ):(
          <div className="mt-6 grid gap-6">
            <div className="bg-white border border-gray-300 rounded-2xl p-5"><p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Preview</p><h3 className="font-bold text-lg mt-2 text-black">{form.title||'Job Title'}</h3><p className="text-sm text-gray-700">{form.company_name||'Company'} • {form.location_county}</p></div>
            <div className="bg-white border border-gray-300 rounded-2xl p-5 grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className={labelClass}>Job Title *</label><input value={form.title} onChange={e=>update('title',e.target.value)} className={inputClass}/></div><div><label className={labelClass}>Company *</label><input value={form.company_name} onChange={e=>update('company_name',e.target.value)} className={inputClass}/></div></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className={labelClass}>County *</label><select value={form.location_county} onChange={e=>update('location_county',e.target.value)} className={inputClass}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label className={labelClass}>City</label><input value={form.location_city} onChange={e=>update('location_city',e.target.value)} className={inputClass}/></div>
                <div><label className={labelClass}>Category</label><select value={form.category} onChange={e=>update('category',e.target.value)} className={inputClass}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label className={labelClass}>Type</label><select value={form.employment_type} onChange={e=>update('employment_type',e.target.value)} className={inputClass}>{EMP_TYPES.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div><label className={labelClass}>Full Description * (clean — no URLs)</label><textarea value={form.description} onChange={e=>update('description',e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 mt-1 text-sm h-64 text-black bg-white"/></div>
              <div className="grid grid-cols-2 gap-4"><div><label className={labelClass}>Application Email</label><input value={form.application_email} onChange={e=>update('application_email',e.target.value)} className={inputClass}/></div><div><label className={labelClass}>Application URL</label><input value={form.application_url} onChange={e=>update('application_url',e.target.value)} className={inputClass}/></div></div>
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl border border-gray-300"><input type="checkbox" checked={form.testing} onChange={e=>update('testing',e.target.checked)} className="w-5 h-5"/><div><p className="text-sm font-bold text-black">Testing Mode</p><p className="text-xs text-gray-700">Checked = hidden. Unchecked = live.</p></div></div>
              <button onClick={save} disabled={saving} className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-50">{saving?'Saving...':`Save — ${form.testing?'Test (Hidden)':'Live'}`}</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}