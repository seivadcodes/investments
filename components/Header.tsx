// components/Header.tsx
'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export default function Header(){
  const [open,setOpen]=useState(false)
  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h- flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-12 w-12 md:h-14 md:w-14 shrink-0">
            <Image
              src="/jvb-logo.png"
              alt="JVB Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text- md:text- font-black tracking-tight text-black">Job Vacancy Basket</p>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text- font-medium text-zinc-700 hover:text-black">Home</Link>
          <Link href="/jobs" className="text- font-medium text-zinc-700 hover:text-black">Vacancies</Link>
          <Link href="/about" className="text- font-medium text-zinc-700 hover:text-black">About</Link>
          <Link href="/post-job" className="text- font-bold bg-black text-white px-5 py-2.5 rounded-full hover:bg-zinc-900">Post a Job</Link>
        </nav>

        {/* Mobile Button */}
        <button onClick={()=>setOpen(!open)} className="md:hidden h-10 w-10 grid place-items-center rounded-full border border-zinc-200">
          <span className="text-black">{open?'✕':'☰'}</span>
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-4 py-4 grid gap-3">
          <Link href="/" onClick={()=>setOpen(false)} className="text- font-medium text-black">Home</Link>
          <Link href="/homepage" onClick={()=>setOpen(false)} className="text- font-medium text-black">Vacancies</Link>
          <Link href="/about" onClick={()=>setOpen(false)} className="text- font-medium text-black">About</Link>
          <Link href="/post-job" onClick={()=>setOpen(false)} className="text- font-bold bg-black text-white px-4 py-3 rounded-xl text-center">Post a Job</Link>
        </div>
      )}
    </header>
  )
}