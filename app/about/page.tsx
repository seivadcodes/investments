// app/about/page.tsx
import Link from 'next/link'

export default function AboutPage(){
  return (
    <main className="min-h-screen bg-[#f6f5f2] text-black">
      <div className="max-w-3xl mx-auto p-6">
        <Link href="/" className="text-sm font-medium text-black underline">← Home</Link>

        <div className="mt-6 bg-white border border-zinc-200 rounded- p-7 md:p-9">
          <h1 className="text- font-black tracking-tight text-black">Job Vacancy Basket</h1>
          <p className="text- font-bold tracking-widest uppercase text-zinc-500 mt-2">Your basket of job vacancies</p>

          <div className="mt-6 space-y-5 text- leading-7 text-zinc-900">
            <p>
              <span className="font-bold text-black">Job Vacancy Basket</span> is a Kenyan job company. We make it easier to find job openings as soon as they are available.
            </p>

            <p>
              Every day we fill your basket with fresh vacancies from Nairobi and across Kenya — all in one simple place. No clutter, no jumping between sites.
            </p>

            <p>
              We built Job Vacancy Basket because job searching should be simple. You get a clean list of real vacancies, with clear titles, companies and locations, ready to apply on your phone.
            </p>

            <div className="pt-2">
              <h3 className="text- font-black uppercase tracking-widest text-black">What you get</h3>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Fresh job vacancies posted daily</li>
                <li>Clear role, company and location</li>
                <li>Simple, fast, mobile-friendly</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Link href="/jobs" className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold">Browse Vacancies</Link>
            <Link href="/" className="bg-white border border-zinc-200 text-black px-6 py-3 rounded-xl text-sm font-bold">Home</Link>
          </div>
        </div>
      </div>
    </main>
  )
}