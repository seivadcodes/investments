'use client'
import { useState, useRef } from 'react'
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

// Strip How to Apply section for AI bundle
function stripApplySection(text: string): string {
  const markers = [
    /how to apply/i,
    /application procedure/i,
    /application process/i,
    /method of application/i,
    /mode of application/i,
    /how to submit/i,
    /interested candidates/i,
    /interested and qualified/i,
    /qualified candidates/i,
    /to apply:/i,
    /^apply:/im,
    /send your cv/i,
    /send cv/i,
    /submit your application/i,
    /application deadline/i
  ]
  let earliest = -1
  for (const re of markers) {
    const idx = text.search(re)
    if (idx!== -1 && (earliest === -1 || idx < earliest)) earliest = idx
  }
  if (earliest!== -1) return text.slice(0, earliest).trim()
  return text.trim()
}

function parseJob(raw: string, fallbackDate: string) {
  const splitByDesc = raw.split(/Description:/i)
  let header = raw
  let descriptionOnly = raw
  if (splitByDesc.length > 1) {
    header = splitByDesc[0]
    descriptionOnly = splitByDesc.slice(1).join('Description:').trim()
  }
  const emailFromHeader = header.match(/Apply Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i)?.[1]
  const emailFallback = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || ''
  const email = emailFromHeader || emailFallback
  const applyUrlLine = header.match(/Apply URL:\s*(https?:\/\/[^\s\)]+)/i)?.[1]?.trim() || ''
  const sourceUrlLine = header.match(/Original Source:\s*(https?:\/\/[^\s\)]+)/i)?.[1]?.trim() || ''
  const urls = [...header.matchAll(/https?:\/\/[^\s\)]+/g)].map(m => m[0])
  const appUrl = applyUrlLine
  const originalUrl = sourceUrlLine || urls[0] || [...raw.matchAll(/https?:\/\/[^\s\)]+/g)].map(m => m[0])[0] || ''
  const sal = header.match(/(?:KES|Ksh\.?|Salary:?)\s*([0-9,]{4,})\s*[-–to]+\s*([0-9,]{4,})/i)
  const singleSal = header.match(/(?:KES|Ksh\.?)\s*([0-9,]{4,})/i)
  const locLine = header.match(/Location:\s*(.+)/i)?.[1]?.trim() || ''
  const foundCounty = COUNTIES.find(c => new RegExp(`\\b${c}\\b`, 'i').test(locLine)) || COUNTIES.find(c => new RegExp(`\\b${c}\\b`, 'i').test(header)) || 'Nairobi'
  let foundCity = ''
  if (locLine.includes('-')) {
    const parts = locLine.split('-').map(s => s.trim())
    if (parts.length >= 2) foundCity = parts[1]
  } else if (locLine) {
    foundCity = locLine.replace(new RegExp(foundCounty, 'i'), '').replace(/^-/, '').trim()
  }
  const catRaw = header.match(/Category:\s*(.+)/i)?.[1]?.trim() || ''
  const typeRaw = header.match(/Employment Type:\s*(.+)/i)?.[1]?.trim() || ''
  const modelRaw = header.match(/Work Model:\s*(.+)/i)?.[1]?.trim() || ''
  const foundCategory = CATEGORIES.find(c => c.toLowerCase() === catRaw.toLowerCase()) || CATEGORIES.find(c => catRaw.toLowerCase().includes(c.toLowerCase())) || (catRaw? catRaw : 'Sales & Marketing')
  const foundEmpType = EMP_TYPES.find(t => typeRaw.toLowerCase().includes(t.toLowerCase())) || 'Full-time'
  const foundWorkModel = WORK_MODELS.find(w => modelRaw.toLowerCase().includes(w.toLowerCase())) || 'On-site'
  const lines = header.split('\n').map(l => l.trim()).filter(Boolean)
  const titleLine = lines.find(l =>!l.toLowerCase().startsWith('company:') &&!l.toLowerCase().startsWith('location:') &&!l.toLowerCase().startsWith('category:') &&!l.toLowerCase().startsWith('employment') &&!l.toLowerCase().startsWith('work model') &&!l.toLowerCase().startsWith('apply') &&!l.toLowerCase().startsWith('original') && l.length > 6 && l.length < 90) || lines[0] || ''
  const companyMatch = header.match(/Company:\s*([^\n]+)/i)
  const postedRaw = header.match(/Posted Date:\s*(.+)/i)?.[1] || header.match(/Posted:\s*(.+)/i)?.[1]
  const expiryRaw = header.match(/Expiry Date:\s*(.+)/i)?.[1] || header.match(/Deadline:\s*(.+)/i)?.[1]
  let postedIso = fallbackDate
  let expiryIso = ''
  if (postedRaw) { const d = new Date(postedRaw); if (!isNaN(d.getTime())) postedIso = d.toISOString().slice(0, 10) }
  if (expiryRaw) { const d = new Date(expiryRaw); if (!isNaN(d.getTime())) expiryIso = d.toISOString().slice(0, 10) }
  const META = /^(Company:|Location:|Category:|Employment Type:|Work Model:|Apply Email:|Apply URL:|Original Source:|Salary:|Posted:|Posted Date:|Deadline:|Expiry Date:)/i
  descriptionOnly = descriptionOnly.split('\n').filter(l =>!META.test(l.trim()) &&!/^https?:\/\//.test(l.trim())).join('\n').trim()
  // Remove How to Apply from description itself
  descriptionOnly = stripApplySection(descriptionOnly)

  return {
    title: titleLine.replace(/\s+at\s+.*/i, '').slice(0, 80),
    company_name: companyMatch? companyMatch[1].trim().slice(0, 80) : (lines.find(l => l.toLowerCase().startsWith('at '))?.replace(/^at\s+/i, '') || ''),
    location_county: foundCounty, location_city: foundCity, category: foundCategory,
    employment_type: foundEmpType, work_model: foundWorkModel, description: descriptionOnly,
    application_email: email, application_url: appUrl, original_source_url: originalUrl,
    posted_date: postedIso, expiry_date: expiryIso,
    salary_min: sal? sal[1].replace(/,/g, '') : singleSal? singleSal[1].replace(/,/g, '') : '',
    salary_max: sal? sal[2].replace(/,/g, '') : '',
  }
}

export default function UploadPage(){
  const [paste,setPaste]=useState('')
  const [saving,setSaving]=useState(false)
  const [msg,setMsg]=useState('')
  const [form,setForm]=useState(INITIAL_FORM)
  const [autoMode,setAutoMode]=useState(true)
  const [autoCopy,setAutoCopy]=useState(true)
  const [lastSaved,setLastSaved]=useState<null | { title: string; slug: string; liveUrl: string; aiBundle: string; }>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = async (text:string, label:string) => {
    await navigator.clipboard.writeText(text)
    setMsg(`Copied ${label}!`)
  }

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) return setMsg('Clipboard is empty')
      setPaste(text)
      onPasteChange(text)
      setMsg('Pasted from clipboard — auto-saving...')
    } catch {
      setMsg('Browser blocked clipboard read. Allow permission or use Ctrl+V.')
    }
  }

  const doAutoSave = async (rawInput?: string) => {
    const raw = (rawInput?? paste).trim()
    if (!raw) return setMsg('Paste something first')
    if (saving) return
    const parsed = parseJob(raw, new Date().toISOString().slice(0,10))
    if (!parsed.title ||!parsed.company_name ||!parsed.description) {
      setMsg('Could not parse Title / Company / Description')
      return
    }
    setForm({...INITIAL_FORM,...parsed })
    setSaving(true)
    setMsg(`Parsed: ${parsed.title} at ${parsed.company_name} — checking duplicates...`)

    const titleNorm = parsed.title.trim().toLowerCase()
    const companyNorm = parsed.company_name.trim().toLowerCase()
    const descStart = parsed.description.trim().slice(0,200).toLowerCase().replace(/\s+/g,' ').slice(0,200)

    const { data: sameTitleCompany } = await supabase.from('jobs').select('id,title,company_name,location_county').ilike('title', parsed.title).ilike('company_name', parsed.company_name).limit(5)
    if (sameTitleCompany && sameTitleCompany.length > 0) {
      const exactMatch = sameTitleCompany.find(j => j.title.trim().toLowerCase() === titleNorm && j.company_name.trim().toLowerCase() === companyNorm)
      if (exactMatch) { setSaving(false); return setMsg(`DUPLICATE: "${exactMatch.title}" at ${exactMatch.company_name} in ${exactMatch.location_county}. Not saved.`) }
    }
    if (descStart.length > 30) {
      const { data: sameDesc } = await supabase.from('jobs').select('id,title,company_name,description').ilike('title', parsed.title).limit(10)
      if (sameDesc && sameDesc.length > 0) {
        const descDup = sameDesc.find(j => { const existingStart = (j.description||'').trim().slice(0,200).toLowerCase().replace(/\s+/g,' ').slice(0,200); return j.title.trim().toLowerCase() === titleNorm && existingStart && descStart && existingStart === descStart })
        if (descDup) { setSaving(false); return setMsg(`DUPLICATE: Same desc → ${descDup.title} at ${descDup.company_name}. Not saved.`) }
      }
    }
    if (parsed.application_url && parsed.application_url.length > 15) {
      const { data: urlDup } = await supabase.from('jobs').select('id,title,company_name,application_url').eq('application_url', parsed.application_url).ilike('title', parsed.title).limit(1)
      if (urlDup && urlDup.length > 0) { setSaving(false); return setMsg(`DUPLICATE: Same apply link → ${urlDup[0].title} at ${urlDup[0].company_name}. Not saved.`) }
    }

    const slug = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString().slice(-6)
    const liveUrl = `${OFFICIAL_SITE_URL}/jobs/${slug}`
    setMsg(`Saving ${parsed.title}...`)
    const { error } = await supabase.from('jobs').insert([{
      title: parsed.title, slug, company_name: parsed.company_name, description: parsed.description,
      location_county: parsed.location_county, location_city: parsed.location_city, category: parsed.category,
      employment_type: parsed.employment_type, work_model: parsed.work_model,
      salary_min: parsed.salary_min? parseInt(parsed.salary_min as any) : null,
      salary_max: parsed.salary_max? parseInt(parsed.salary_max as any) : null,
      application_email: parsed.application_email || null, application_url: parsed.application_url || null,
      original_source_url: parsed.original_source_url || null, status: 'published',
      posted_date: parsed.posted_date, expiry_date: parsed.expiry_date || null, testing: false
    }])
    setSaving(false)
    if (error) {
      setMsg('Error: ' + error.message)
    } else {
      // BUNDLE EXCLUDES HOW TO APPLY — only clean description + official link
      const aiBundle = `${parsed.title} at ${parsed.company_name}
Location: ${parsed.location_county}${parsed.location_city? ` - ${parsed.location_city}` : ''}
Category: ${parsed.category} | ${parsed.employment_type} | ${parsed.work_model}

${parsed.description}

---
Official Job URL: ${liveUrl}
Website: ${OFFICIAL_SITE_URL}`

      setLastSaved({ title: parsed.title, slug, liveUrl, aiBundle })
      setPaste('')
      setForm({...INITIAL_FORM, posted_date: new Date().toISOString().slice(0,10) })
      if (autoCopy) {
        try {
          await navigator.clipboard.writeText(aiBundle)
          setMsg(`Saved LIVE! ${parsed.title} — Bundle (no apply) auto-copied! Link: ${liveUrl}`)
        } catch {
          setMsg(`Saved LIVE! ${parsed.title} — Auto-copy failed, use Copy button. Link: ${liveUrl}`)
        }
      } else {
        setMsg(`Saved LIVE! ${parsed.title} — Link: ${liveUrl}`)
      }
      setTimeout(()=> window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
    }
  }

  const onPasteChange = (val: string) => {
    setPaste(val)
    if (!autoMode) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 40) return
    debounceRef.current = setTimeout(() => { doAutoSave(val) }, 1200)
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-black">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black tracking-tight">Upload Job — JobMtaani</h1>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-full">
              <input type="checkbox" checked={autoMode} onChange={e=>setAutoMode(e.target.checked)} className="w-4 h-4" /> Auto-save
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-full">
              <input type="checkbox" checked={autoCopy} onChange={e=>setAutoCopy(e.target.checked)} className="w-4 h-4" /> Auto-copy
            </label>
          </div>
        </div>

        {msg && <div className="mt-4 p-3 rounded-lg bg-yellow-100 border border-yellow-300 text-sm font-medium whitespace-pre-wrap">{msg}</div>}

        {lastSaved && (
          <div className="mt-4 p-4 rounded-2xl bg-black text-white border border-black space-y-4">
            <div className="flex justify-between items-start">
              <div><p className="text- tracking-widest opacity-60 uppercase font-bold">Last Saved — Auto-copied (no apply)</p><p className="text-sm font-bold mt-1">{lastSaved.title}</p><p className="text-xs opacity-70 mt-1 font-mono break-all">{lastSaved.liveUrl}</p></div>
              <span className="text- bg-white text-black px-2 py-1 rounded-full font-bold">LIVE</span>
            </div>
            <div className="grid gap-2">
              <p className="text- uppercase tracking-widest opacity-50 font-bold">1. Official Link</p>
              <div className="flex gap-2"><input readOnly value={lastSaved.liveUrl} className="flex-1 bg-white text-black rounded-lg px-3 py-2.5 text-xs font-mono" /><button onClick={()=>copy(lastSaved.liveUrl, 'Live URL')} className="bg-white text-black px-4 py-2 rounded-lg text-xs font-black">Copy</button><a href={lastSaved.liveUrl} target="_blank" className="bg-white/10 border border-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold">Open</a></div>
            </div>
            <div className="grid gap-2">
              <div className="flex justify-between items-center"><p className="text- uppercase tracking-widest opacity-50 font-bold">2. Bundle for AI — clean description + link (no How to Apply)</p><button onClick={()=>copy(lastSaved.aiBundle, 'AI Bundle')} className="bg-white text-black px-4 py-1.5 rounded-full text- font-black">Copy Bundle</button></div>
              <textarea readOnly value={lastSaved.aiBundle} className="w-full h-64 bg-white/10 border border-white/20 text-white rounded-xl p-3 text-xs font-mono" />
            </div>
          </div>
        )}

        <div className="mt-6 bg-white border border-gray-300 rounded-2xl p-5">
          <div className="flex justify-between"><label className="text-xs font-semibold">Paste job here — auto-saves + excludes apply section from bundle</label>{saving && <span className="text-xs font-bold animate-pulse">⏳ Saving...</span>}</div>
          <div className="relative mt-3">
            <textarea value={paste} onChange={e=>onPasteChange(e.target.value)} className="w-full h- border border-gray-300 rounded-xl p-4 pr-24 text-sm font-mono text-black bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-black focus:outline-none" placeholder="Ctrl+V or click Paste inside..." />
            <button onClick={handlePasteFromClipboard} className="absolute top-3 right-3 bg-black text-white text-xs font-black px-4 py-2 rounded-full shadow-lg hover:bg-zinc-800 flex items-center gap-1.5"><span className="text-sm">📋</span> Paste</button>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={()=>setPaste('')} className="bg-white border border-gray-300 px-5 py-2.5 rounded-full text-sm font-bold">Clear</button>
            <button onClick={()=>doAutoSave()} disabled={saving} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50">{saving? 'Saving...' : 'Save Now → Get Link'}</button>
          </div>
          {form.title && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <p className="text- font-bold tracking-widest text-gray-500 uppercase">Parsed Preview (apply stripped)</p>
              <p className="text-sm font-bold mt-1">{form.title} at {form.company_name}</p>
              <p className="text-xs text-gray-600">{form.location_county} {form.location_city? `• ${form.location_city}` : ''} • {form.category}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}