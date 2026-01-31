import { useState } from 'react'
import { LayoutDashboard, Package, Plus, Link2, Menu, X, LogOut } from 'lucide-react'

export default function Sidebar({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
    { id: 'products', label: 'Produk Satuan', icon: Package, color: 'text-indigo-400' },
    { id: 'links', label: 'Produk Link', icon: Link2, color: 'text-purple-400' },
    { id: 'add_new', label: 'Tambah Produk', icon: Plus, color: 'text-emerald-400' },
  ]

  return (
    <>
      {/* TOMBOL MENU MOBILE (Hanya muncul di layar kecil) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* OVERLAY GELAP (Saat menu terbuka di HP) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm"
        />
      )}

      {/* SIDEBAR UTAMA */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-white shadow-2xl transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
    <div>
      {/* UPDATE BAGIAN INI: Ganti H1 dengan Image Logo */}
      <div className="flex items-center space-x-3">
         {/* Sesuaikan width (w-8) dan height (h-8) sesuai ukuran logo */}
         <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
         <h1 className="text-2xl font-bold tracking-tight text-white">SuperApp</h1>
      </div>
      <p className="text-xs text-slate-400 mt-1 ml-11">Admin Console</p>
    </div>
  </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  setIsOpen(false) // Tutup menu saat diklik di HP
                }}
                className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} className={`mr-3 ${isActive ? 'text-white' : item.color}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center p-3 rounded-xl bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-xs">SA</div>
            <div className="ml-3 truncate">
              <p className="text-sm font-medium truncate">Syaifulloh</p>
              <p className="text-xs text-slate-500">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}