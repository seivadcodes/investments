'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const OFFICIAL_SITE_URL = "https://www.jobvacancybasket.co.ke"

const COUNTIES = ["Nairobi","Mombasa","Kisumu","Nakuru","Kiambu","Uasin Gishu","Machakos","Kajiado","Turkana","Kericho","Meru","Kisii","Eldoret","Kilifi","Kwale","Nyeri","Murang'a","Bungoma","Kakamega","Kitui","Tana River","Lamu","Garissa","Nyandarua","Kirinyaga","Busia","Siaya","Homa Bay"]
const CATEGORIES = ["Sales & Marketing","Tech & IT","Finance","Teaching","Healthcare","Engineering","Hospitality","Customer Service","Driving & Logistics","Fundi & Manual","NGO","Internship","Human Resources / HR","Construction","Other"]
const EMP_TYPES = ["Full-time","Part-time","Contract","Internship","Casual"]
const WORK_MODELS = ["On-site","Hybrid","Remote","Field","WhatsApp"]

const INITIAL_FORM = {
  title:'', company_name:'', location_county:'Nairobi', location_city:'',
  category:'Sales & Marketing', employment_type:'Full-time', work_model:'On-site',
  salary_min:'', salary_max:'', application_email:'', application_url:'',
  original_source_url:'', description:'', posted_date:new Date().toISOString().slice(0,10),
  expiry_date:'', status:'published', testing:false
}

export default function UploadPage(){
  const [tab,setTab]=useState<'paste'|'manual'>('paste')
  const [paste,setPaste]=useState('')
  const [saving,setSaving]=useState(false)
  const [msg,setMsg]=useState('')
  const [form,setForm]=useState(INITIAL_FORM)
  const [lastSaved,setLastSaved]=useState<null | {
    title: string
    slug: string
    liveUrl: string
    sourceUrl: string
    applyUrl: string
    aiBundle: string
  }>(null)

  const update=(k:string,v:any)=>setForm(f=>({...f,[k]:v}))
  const inputClass="w-full border border-gray-300 rounded-lg p-2.5 mt-1 text-sm text-black bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-black focus:outline-none"
  const labelClass="text-xs font-semibold text-gray-900"

  const copy = async (text:string, label:string) => {
    await navigator.clipboard.writeText(text)
    setMsg(`Copied ${label}!`)
  }

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

    const emailFromHeader = header.match(/Apply Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1]
    const emailFallback = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || ''
    const email = emailFromHeader || emailFallback

    const applyUrlLine = header.match(/Apply URL:\s*(https?:\/\/[^\s\)]+)/i)?.[1]?.trim() || ''
    const sourceUrlLine = header.match(/Original Source:\s*(https?:\/\/[^\s\)]+)/i)?.[1]?.trim() || ''
    const urls=[...header.matchAll(/https?:\/\/[^\s\)]+/g)].map(m=>m[0])

    const appUrl = applyUrlLine
    const originalUrl = sourceUrlLine || urls[0] || [...raw.matchAll(/https?:\/\/[^\s\)]+/g)].map(m=>m[0])[0] || ''

    const sal=header.match(/(?:KES|Ksh\.?|Salary:?)\s*([0-9,]{4,})\s*[-–to]+\s*([0-9,]{4,})/i)
    const singleSal=header.match(/(?:KES|Ksh\.?)\s*([0-9,]{4,})/i)

    const locLine = header.match(/Location:\s*(.+)/i)?.[1]?.trim() || ''
    const foundCounty = COUNTIES.find(c=>new RegExp(`\\b${c}\\b`,'i').test(locLine)) || COUNTIES.find(c=>new RegExp(`\\b${c}\\b`,'i').test(header)) || 'Nairobi'
    let foundCity = ''
    if(locLine.includes('-')){
      const parts = locLine.split('-').map(s=>s.trim())
      if(parts.length >= 2) foundCity = parts[1]
    } else if(locLine){
      foundCity = locLine.replace(new RegExp(foundCounty, 'i'), '').replace(/^-/, '').trim()
    }

    const catRaw = header.match(/Category:\s*(.+)/i)?.[1]?.trim() || ''
    const typeRaw = header.match(/Employment Type:\s*(.+)/i)?.[1]?.trim() || ''
    const modelRaw = header.match(/Work Model:\s*(.+)/i)?.[1]?.trim() || ''

    const foundCategory = CATEGORIES.find(c=>c.toLowerCase() === catRaw.toLowerCase())
      || CATEGORIES.find(c=>catRaw.toLowerCase().includes(c.toLowerCase()))
      || (catRaw? catRaw : 'Sales & Marketing')

    const foundEmpType = EMP_TYPES.find(t=>typeRaw.toLowerCase().includes(t.toLowerCase())) || 'Full-time'
    const foundWorkModel = WORK_MODELS.find(w=>modelRaw.toLowerCase().includes(w.toLowerCase())) || 'On-site'

    const lines=header.split('\n').map(l=>l.trim()).filter(Boolean)
    const titleLine=lines.find(l=>!l.toLowerCase().startsWith('company:')&&!l.toLowerCase().startsWith('location:')&&!l.toLowerCase().startsWith('category:')&&!l.toLowerCase().startsWith('employment')&&!l.toLowerCase().startsWith('work model')&&!l.toLowerCase().startsWith('apply')&&!l.toLowerCase().startsWith('original')&&l.length>6&&l.length<90)||lines[0]||''
    const companyMatch=header.match(/Company:\s*([^\n]+)/i)

    const postedRaw = header.match(/Posted Date:\s*(.+)/i)?.[1] || header.match(/Posted:\s*(.+)/i)?.[1]
    const expiryRaw = header.match(/Expiry Date:\s*(.+)/i)?.[1] || header.match(/Deadline:\s*(.+)/i)?.[1]
    let postedIso = form.posted_date
    let expiryIso = form.expiry_date
    if(postedRaw){
      const d = new Date(postedRaw)
      if(!isNaN(d.getTime())) postedIso = d.toISOString().slice(0,10)
    }
    if(expiryRaw){
      const d = new Date(expiryRaw)
      if(!isNaN(d.getTime())) expiryIso = d.toISOString().slice(0,10)
    }

    const META=/^(Company:|Location:|Category:|Employment Type:|Work Model:|Apply Email:|Apply URL:|Original Source:|Salary:|Posted:|Posted Date:|Deadline:|Expiry Date:)/i
    descriptionOnly=descriptionOnly.split('\n').filter(l=>!META.test(l.trim())&&!/^https?:\/\//.test(l.trim())).join('\n').trim()

    setForm(f=>({
 ...f,
      title:titleLine.replace(/\s+at\s+.*/i,'').slice(0,80) || f.title,
      company_name: companyMatch? companyMatch[1].trim().slice(0,80) : (lines.find(l=>l.toLowerCase().startsWith('at '))?.replace(/^at\s+/i,'') || f.company_name),
      location_county: foundCounty,
      location_city: foundCity || f.location_city,
      category: foundCategory,
      employment_type: foundEmpType,
      work_model: foundWorkModel,
      description: descriptionOnly,
      application_email: email,
      application_url: appUrl,
      original_source_url: originalUrl,
      posted_date: postedIso,
      expiry_date: expiryIso,
      salary_min:sal?sal[1].replace(/,/g,''):singleSal?singleSal[1].replace(/,/g,''):f.salary_min,
      salary_max:sal?sal[2].replace(/,/g,''):f.salary_max,
    }))
    setTab('manual')
    setMsg(`Extracted! Category=${foundCategory} | Type=${foundEmpType} | Model=${foundWorkModel} — check and save.`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save=async()=>{
    if(!form.title||!form.company_name||!form.description) return setMsg('Title, Company, Description required')
    setSaving(true)
    setMsg('Checking for duplicates...')

    const titleNorm = form.title.trim().toLowerCase()
    const companyNorm = form.company_name.trim().toLowerCase()
    const descStart = form.description.trim().slice(0,200).toLowerCase().replace(/\s+/g,' ').slice(0,200)

    const { data: sameTitleCompany } = await supabase
   .from('jobs')
   .select('id,title,company_name,location_county,application_url,description')
   .ilike('title', form.title)
   .ilike('company_name', form.company_name)
   .limit(5)

    if(sameTitleCompany && sameTitleCompany.length > 0){
      const exactMatch = sameTitleCompany.find(j =>
        j.title.trim().toLowerCase() === titleNorm &&
        j.company_name.trim().toLowerCase() === companyNorm
      )
      if(exactMatch){
        setSaving(false)
        return setMsg(`DUPLICATE: "${exactMatch.title}" at ${exactMatch.company_name} already exists in ${exactMatch.location_county}. Not saved.`)
      }
    }

    if(descStart.length > 30){
      const { data: sameDesc } = await supabase
     .from('jobs')
     .select('id,title,company_name,description')
     .ilike('title', form.title)
     .limit(10)

      if(sameDesc && sameDesc.length > 0){
        const descDup = sameDesc.find(j => {
          const existingStart = (j.description||'').trim().slice(0,200).toLowerCase().replace(/\s+/g,' ').slice(0,200)
          return j.title.trim().toLowerCase() === titleNorm && existingStart && descStart && existingStart === descStart
        })
        if(descDup){
          setSaving(false)
          return setMsg(`DUPLICATE: Same title + same description start already exists → ${descDup.title} at ${descDup.company_name}. Not saved.`)
        }
      }
    }

    if(form.application_url && form.application_url.length > 15){
      const { data: urlDup } = await supabase
     .from('jobs')
     .select('id,title,company_name,application_url')
     .eq('application_url', form.application_url)
     .ilike('title', form.title)
     .limit(1)
      if(urlDup && urlDup.length > 0){
        setSaving(false)
        return setMsg(`DUPLICATE: Same title + same application link already exists → ${urlDup[0].title} at ${urlDup[0].company_name}. Not saved.`)
      }
    }

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
    if(error){
      setMsg('Error: '+error.message)
    } else {
      const liveUrl = `${OFFICIAL_SITE_URL}/jobs/${slug}`

      // This is the bundle for your other AI (caption/image generator)
      const baseContent = paste.trim()? paste.trim() : `${form.title} at ${form.company_name}\nLocation: ${form.location_county} ${form.location_city}\n${form.description}`
      const aiBundle = `${baseContent}\n\n---\nOfficial Job URL: ${liveUrl}\nCompany: ${form.company_name}\nLocation: ${form.location_county}${form.location_city? ` - ${form.location_city}` : ''}\nCategory: ${form.category}\n`

      setLastSaved({
        title: form.title,
        slug,
        liveUrl,
        sourceUrl: form.original_source_url,
        applyUrl: form.application_url,
        aiBundle
      })

      setMsg(`Saved! ${form.testing?'DRAFT hidden':'LIVE'} — ${form.category} • Ready for next paste.`)
      setPaste('')
      setForm({...INITIAL_FORM, posted_date: new Date().toISOString().slice(0,10)})
      setTab('paste')
      setTimeout(()=> window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
    }
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

        {lastSaved && (
          <div className="mt-4 p-4 rounded-2xl bg-black text-white border border-black space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text- tracking-widest opacity-60 uppercase font-bold">Last Saved — Ready to Copy</p>
                <p className="text-sm font-bold mt-1">{lastSaved.title}</p>
                <p className="text-xs opacity-70 mt-1">{lastSaved.liveUrl}</p>
              </div>
              <span className="text- bg-white text-black px-2 py-1 rounded-full font-bold">LIVE</span>
            </div>

            <div className="grid gap-2">
              <p className="text- uppercase tracking-widest opacity-50 font-bold">1. Official Job Link (for sharing)</p>
              <div className="flex gap-2">
                <input readOnly value={lastSaved.liveUrl} className="flex-1 bg-white text-black rounded-lg px-3 py-2.5 text-xs font-mono" />
                <button onClick={()=>copy(lastSaved.liveUrl, 'Live URL')} className="bg-white text-black px-4 py-2 rounded-lg text-xs font-black">Copy</button>
                <a href={lastSaved.liveUrl} target="_blank" className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold">Open</a>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <p className="text- uppercase tracking-widest opacity-50 font-bold">2. Bundle for AI (paste + link) — for captions & images</p>
                <button onClick={()=>copy(lastSaved.aiBundle, 'AI Bundle')} className="bg-white text-black px-4 py-1.5 rounded-full text- font-black">Copy Bundle</button>
              </div>
              <textarea
                readOnly
                value={lastSaved.aiBundle}
                className="w-full h-48 bg-white/10 border border-white/20 text-white rounded-xl p-3 text-xs font-mono"
              />
              <p className="text- opacity-50">This contains everything you pasted originally PLUS the correct official URL at the bottom. Copy this and give it to your caption/image AI.</p>
            </div>
          </div>
        )}

        {tab==='paste'?(
          <div className="mt-6 bg-white border border-gray-300 rounded-2xl p-5">
            <label className={labelClass}>Paste cleaned job here (from AI prompt)</label>
            <textarea value={paste} onChange={e=>setPaste(e.target.value)} className="w-full h-96 mt-3 border border-gray-300 rounded-xl p-4 text-sm font-mono text-black bg-white placeholder:text-gray-400" placeholder="Interior Design Architect at Valentori Investments Group Ltd..."/>
            <div className="flex justify-end mt-3"><button onClick={doExtract} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold">Extract → Form</button></div>
          </div>
        ):(
          <div className="mt-6 grid gap-6">
            <div className="bg-white border border-gray-300 rounded-2xl p-5"><p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Preview</p><h3 className="font-bold text-lg mt-2 text-black">{form.title||'Job Title'}</h3><p className="text-sm text-gray-700">{form.company_name||'Company'} • {form.location_county} {form.location_city?`• ${form.location_city}`:''} • {form.category} • {form.employment_type} • {form.work_model}</p>{form.application_url&&<p className="text-xs text-zinc-500 mt-2 font-mono break-all">Apply URL: {form.application_url}</p>}</div>
            <div className="bg-white border border-gray-300 rounded-2xl p-5 grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className={labelClass}>Job Title *</label><input value={form.title} onChange={e=>update('title',e.target.value)} className={inputClass}/></div><div><label className={labelClass}>Company *</label><input value={form.company_name} onChange={e=>update('company_name',e.target.value)} className={inputClass}/></div></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className={labelClass}>County *</label><select value={form.location_county} onChange={e=>update('location_county',e.target.value)} className={inputClass}>{COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label className={labelClass}>City</label><input value={form.location_city} onChange={e=>update('location_city',e.target.value)} className={inputClass}/></div>
                <div><label className={labelClass}>Category</label><select value={form.category} onChange={e=>update('category',e.target.value)} className={inputClass}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label className={labelClass}>Type</label><select value={form.employment_type} onChange={e=>update('employment_type',e.target.value)} className={inputClass}>{EMP_TYPES.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Work Model</label><select value={form.work_model} onChange={e=>update('work_model',e.target.value)} className={inputClass}>{WORK_MODELS.map(c=><option key={c}>{c}</option>)}</select></div>
                <div><label className={labelClass}>Posted Date</label><input type="date" value={form.posted_date} onChange={e=>update('posted_date',e.target.value)} className={inputClass}/></div>
              </div>
              <div><label className={labelClass}>Full Description * (clean — no URLs)</label><textarea value={form.description} onChange={e=>update('description',e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 mt-1 text-sm h-64 text-black bg-white"/></div>
              <div className="grid grid-cols-2 gap-4"><div><label className={labelClass}>Application Email</label><input value={form.application_email} onChange={e=>update('application_email',e.target.value)} className={inputClass}/></div><div><label className={labelClass}>Application URL</label><input value={form.application_url} onChange={e=>update('application_url',e.target.value)} className={inputClass}/></div></div>
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl border border-gray-300"><input type="checkbox" checked={form.testing} onChange={e=>update('testing',e.target.checked)} className="w-5 h-5"/><div><p className="text-sm font-bold text-black">Testing Mode</p><p className="text-xs text-gray-700">Checked = hidden. Unchecked = live.</p></div></div>
              <button onClick={save} disabled={saving} className="w-full bg-black text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-50">{saving?'Checking...':`Save — ${form.testing?'Test (Hidden)':'Live'}`}</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}