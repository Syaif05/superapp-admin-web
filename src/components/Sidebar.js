import { LayoutDashboard, Package, Plus } from 'lucide-react'

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
    { id: 'products', label: 'Produk & Template', icon: Package, color: 'text-indigo-400' },
    { id: 'add_new', label: 'Tambah Produk', icon: Plus, color: 'text-emerald-400' },
  ]

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white">SuperApp</h1>
        <p className="text-xs text-slate-400 mt-1">Admin Console</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
        <div className="flex items-center p-2 rounded-lg bg-slate-800/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-xs">SA</div>
          <div className="ml-3">
            <p className="text-sm font-medium">Syaifulloh</p>
            <p className="text-xs text-slate-500">Super Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}