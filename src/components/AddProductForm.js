import { useState } from 'react'
import { UploadCloud, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AddProductForm({ onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', email: '', role: 'MEMBER' })
  const [file, setFile] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let publicUrl = null

      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('email-templates')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('email-templates')
          .getPublicUrl(fileName)
        
        publicUrl = data.publicUrl
      }

      const { error: dbError } = await supabase.from('products').insert({
        name: form.name,
        product_code: form.code.toUpperCase(),
        group_email: form.email,
        role: form.role,
        template_url: publicUrl
      })

      if (dbError) throw dbError
      
      alert('Produk berhasil disimpan!')
      setForm({ name: '', code: '', email: '', role: 'MEMBER' })
      setFile(null)
      onSuccess()
      
    } catch (error) {
      console.error(error)
      if (error.code === '23505') {
        alert('Gagal: Produk dengan kode atau ID tersebut sudah ada. Coba refresh halaman.')
      } else {
        alert(`Gagal menyimpan: ${error.message}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Konfigurasi Produk Baru</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nama Produk</label>
              <input 
                required 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Database Film"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Kode (2 Huruf)</label>
              <input 
                required 
                maxLength={2} 
                type="text" 
                value={form.code} 
                onChange={e => setForm({...form, code: e.target.value})}
                placeholder="DF"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all uppercase font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Email Google Group</label>
            <input 
              required 
              type="email" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})}
              placeholder="nama-grup@sekolah.sch.id"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Role Akses</label>
            <select 
              value={form.role} 
              onChange={e => setForm({...form, role: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            >
              <option value="MEMBER">MEMBER (Anggota)</option>
              <option value="MANAGER">MANAGER (Pengelola)</option>
              <option value="OWNER">OWNER (Pemilik)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Template Email (HTML)</label>
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-slate-50 hover:border-blue-400 transition-all text-center">
              <input 
                type="file" 
                accept=".html" 
                onChange={e => setFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center pointer-events-none">
                <UploadCloud className={`mb-3 ${file ? 'text-blue-500' : 'text-slate-400'}`} size={32} />
                <span className="font-medium text-slate-700">{file ? file.name : 'Klik untuk upload file .html'}</span>
                <span className="text-xs text-slate-400 mt-1">Opsional. Jika kosong akan pakai default.</span>
              </div>
            </div>
          </div>

          <button 
            disabled={isSubmitting} 
            type="submit" 
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20 transition-all flex justify-center items-center"
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'SIMPAN PRODUK'}
          </button>
        </form>
      </div>
    </div>
  )
}