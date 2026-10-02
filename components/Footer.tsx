import Link from 'next/link'

export default function Footer(){
  return (
    <footer className="mt-12 border-t border-zinc-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 grid md:grid-cols-3 gap-8">
        <div>
          <p className="font-black text-black">Job Vacancy Basket</p>
          <p className="text-sm text-zinc-700 mt-2 leading-6">Your daily basket of fresh job vacancies in Kenya. We make it easier to find openings as soon as they are available.</p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Explore</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-black">
            <Link href="/jobs" className="hover:underline">All Vacancies</Link>
            <Link href="/about" className="hover:underline">About Us</Link>
            <Link href="/jobs?county=Nairobi" className="hover:underline">Jobs in Nairobi</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Safety</p>
          <p className="text-sm text-zinc-700 mt-3 leading-6">Never pay for any recruitment. If asked for money, report. Applications are handled by employers directly.</p>
          <p className="text- text-zinc-500 mt-4">© 2026 Job Vacancy Basket</p>
        </div>
      </div>
    </footer>
  )
}