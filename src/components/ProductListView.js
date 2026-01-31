import { Trash2, FileCode, Users, Copy } from 'lucide-react'

export default function ProductListView({ products, onDelete, onAddNew }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div key={p.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-blue-100 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onDelete(p.id)}
                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <div className="mb-4">
              <span className="inline-block bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-lg mb-3">
                {p.product_code}
              </span>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">{p.name}</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                <Users size={14} className="mr-2 text-slate-400 shrink-0" />
                <span className="truncate">{p.group_email}</span>
              </div>
              <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                <FileCode size={14} className="mr-2 text-slate-400 shrink-0" />
                <span className="truncate">{p.template_url ? 'Custom HTML Template' : 'Default Template'}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-400">ROLE GROUP</span>
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{p.role}</span>
            </div>
          </div>
        ))}

        <button 
          onClick={onAddNew}
          className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/10 transition-all group cursor-pointer h-full min-h-[250px]"
        >
          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
            <Copy size={24} />
          </div>
          <span className="font-bold">Tambah Produk Baru</span>
        </button>
      </div>
    </div>
  )
}