export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              © {new Date().getFullYear()} TrueLabel Network
            </span>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Support</a>
            <a href="#" className="hover:text-slate-600 transition-colors">API</a>
          </div>
          
          <div className="text-xs text-slate-300">
            v1.0.0 • Secure • Encrypted
          </div>
        </div>
      </div>
    </footer>
  );
}