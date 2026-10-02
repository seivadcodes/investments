'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function Header(){
  const [open,setOpen]=useState(false)
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-zinc-200">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h- flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-black">J</div>
          <div className="leading-tight">
            <p className="font-black text- tracking-tight text-black">Job Vacancy Basket</p>
            <p className="text- font-bold tracking-widest uppercase text-zinc-500">Your basket of job vacancies</p>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-black">
          <Link href="/jobs" className="hover:underline">Vacancies</Link>
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/admin/upload" className="bg-black text-white px-4 py-2 rounded-full text-sm font-bold">Post Job</Link>
        </nav>
        <button onClick={()=>setOpen(!open)} className="md:hidden text-black">☰</button>
      </div>
      {open&&(
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-4 flex flex-col gap-3 text-sm text-black">
          <Link href="/jobs" onClick={()=>setOpen(false)}>Vacancies</Link>
          <Link href="/about" onClick={()=>setOpen(false)}>About</Link>
          <Link href="/admin/upload" onClick={()=>setOpen(false)} className="bg-black text-white px-4 py-2 rounded-full text-center font-bold">Post Job</Link>
        </div>
      )}
    </header>
  )
}