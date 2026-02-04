import { useState, useRef } from 'react'
import Link from 'next/link'
import { Trash2, FileCode, Users, Palette, Upload, Download, FileSpreadsheet } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ProductListView({ products, onDelete, onAddNew }) {
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)

  // CSV TEMPLATE
  const downloadTemplate = () => {
    const csvContent = "name,product_code,group_email,role,email_subject\nContoh Produk,CODE123,group@domain.com,MEMBER,Subject Email Custom"
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "template_produk.csv"
    link.click()
  }

  // HANDLE CSV UPLOAD
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUploading(true)
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const lines = text.split('\n')
        const newProducts = []

        // Skip header (index 0), start from 1
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          
          // Simple CSV Split (assuming no commas in content for now, or simple split)
          // Format orders: name, product_code, group_email, role, email_subject
          const cols = line.split(',')
          if (cols.length < 2) continue // Min name & code

          newProducts.push({
            name: cols[0]?.trim(),
            product_code: cols[1]?.trim(),
            group_email: cols[2]?.trim(),
            role: cols[3]?.trim() || 'MEMBER',
            email_subject: cols[4]?.trim() || '',
            // Default values
            is_active: true
          })
        }

        if (newProducts.length > 0) {
          const { error } = await supabase.from('products').insert(newProducts)
          if (error) throw error
          alert(`Berhasil import ${newProducts.length} produk!`)
          window.location.reload() // Reload simple
        } else {
          alert("File kosong atau format salah!")
        }

      } catch (err) {
        alert("Gagal import: " + err.message)
      } finally {
        setIsUploading(false)
        if(fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* TOOLBAR */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button 
          onClick={() => onAddNew()}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
        >
          <span>+ Tambah Manual</span>
        </button>

        <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

        <button 
           onClick={downloadTemplate}
           className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
        >
           <Download size={16} />
           <span>Template CSV</span>
        </button>

        <div className="relative">
           <input 
              type="file" 
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
           />
           <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-100 transition"
           >
              {isUploading ? <Upload size={16} className="animate-bounce"/> : <FileSpreadsheet size={16} />}
              <span>{isUploading ? 'Mengupload...' : 'Import CSV'}</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div key={p.id} className="group bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md hover:border-blue-100 transition-all duration-300 relative overflow-hidden">
            
            {/* Tombol Hapus (Muncul saat Hover) */}
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button 
                onClick={() => onDelete(p.id)}
                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                title="Hapus Produk"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            {/* Header Produk */}
            <div className="mb-4">
              <span className="inline-block bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-lg mb-3">
                {p.product_code || 'NO-CODE'}
              </span>
              <h3 className="text-lg font-bold text-slate-800 truncate" title={p.name}>
                {p.name}
              </h3>
            </div>

            {/* Info Detail */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                <Users size={14} className="mr-2 text-slate-400 shrink-0" />
                <span className="truncate" title={p.group_email}>
                  {p.group_email || 'Tidak ada grup'}
                </span>
              </div>
              <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                <FileCode size={14} className="mr-2 text-slate-400 shrink-0" />
                <span className="truncate">
                  {p.email_body ? 'Custom Template' : 'Default Template'}
                </span>
              </div>
            </div>

            {/* Footer: Role & Tombol Edit */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
               <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                  {p.role || 'MEMBER'}
               </span>

               {/* TOMBOL EDIT TEMPLATE (YANG DIPERBAIKI) */}
               <Link 
                  href={`/products/template/${p.id}`}
                  className="flex items-center gap-2 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-2 rounded-lg hover:bg-purple-100 transition"
               >
                  <Palette size={14} />
                  Edit Desain
               </Link>
            </div>
          </div>
        ))}

        {/* Tombol Tambah Produk Baru */}
        <button 
          onClick={onAddNew}
          className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/10 transition-all group cursor-pointer min-h-[250px]"
        >
          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
            <span className="text-2xl font-light text-slate-300 group-hover:text-blue-500">+</span>
          </div>
          <span className="font-medium text-sm">Tambah Produk Baru</span>
        </button>
      </div>
    </div>
  )
}