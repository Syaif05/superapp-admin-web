'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Save, Eye, RefreshCw } from 'lucide-react'

export default function AccountTemplateEditor({ product, onClose, onSuccess }) {
  const [template, setTemplate] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Load initial template
  useEffect(() => {
    if (product?.account_config?.template) {
      setTemplate(product.account_config.template)
    } else {
        // Default
        setTemplate(`Terimakasih sudah membeli {Nama Produk}.
Berikut detail akun anda:
Email: {Email}
Password: {Password}
Transaction ID: {Transaction ID}`)
    }
  }, [product])

  // Parse Fields from Config
  const rawFields = product.account_config?.fields || []
  const fields = rawFields.map(f => typeof f === 'string' ? { name: f, type: 'text' } : f)

  // Generate Preview
  const getPreview = () => {
      let preview = template
      preview = preview.replace(/{Nama Produk}/g, product.name)
      preview = preview.replace(/{Transaction ID}/g, `${product.prefix_code || 'TRX'}-123456789`)
      preview = preview.replace(/{Email Pembeli}/g, 'customer@example.com')
      
      fields.forEach(f => {
          let dummyVal = '...'
          if (f.type === 'date') dummyVal = '2026-12-31'
          else if (f.type === 'password') dummyVal = 'secret123'
          else if (f.type === 'number') dummyVal = '1234'
          else dummyVal = f.name.toLowerCase().includes('email') ? 'user@netflix.com' : 'data-dummy'
          
          preview = preview.replace(new RegExp(`{${f.name}}`, 'g'), dummyVal)
      })
      return preview
  }

  const handleSave = async () => {
      setLoading(true)
      try {
          // Prepare new config (preserve fields)
          const newConfig = {
              ...product.account_config,
              template: template
          }

          const { error } = await supabase
              .from('products')
              .update({ account_config: newConfig })
              .eq('id', product.id)
          
          if (error) throw error

          alert("Template berhasil disimpan!")
          onSuccess()
          onClose()

      } catch (err) {
          alert("Gagal simpan: " + err.message)
      } finally {
          setLoading(false)
      }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
          
          {/* HEADER */}
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                  <h2 className="text-xl font-bold text-slate-800">Edit Template Pesan</h2>
                  <p className="text-sm text-slate-500">Produk: {product.name}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
                  <X size={24} className="text-slate-400" />
              </button>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  
                  {/* EDITOR */}
                  <div className="flex flex-col space-y-4">
                      <div className="flex justify-between items-center">
                          <label className="text-sm font-bold text-slate-700">Editor Template</label>
                          <div className="text-xs text-slate-400">Gunakan tombol variabel dibawah</div>
                      </div>
                      
                      <textarea 
                          value={template}
                          onChange={e => setTemplate(e.target.value)}
                          className="flex-1 p-4 bg-slate-900 text-green-400 font-mono text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px]"
                          placeholder="Ketik template pesan..."
                      />

                      {/* Variables */}
                      <div className="flex flex-wrap gap-2">
                            {['{Nama Produk}', '{Transaction ID}', '{Email Pembeli}', ...fields.map(f => `{${f.name}}`)].map(token => (
                                <button
                                    key={token}
                                    onClick={() => setTemplate(prev => prev + ' ' + token)}
                                    className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-white hover:border-blue-400 hover:text-blue-600 transition shadow-sm"
                                >
                                    {token}
                                </button>
                            ))}
                      </div>
                  </div>

                  {/* PREVIEW */}
                  <div className="flex flex-col space-y-4">
                       <label className="text-sm font-bold text-slate-700 flex justify-between">
                           <span>Preview Output</span>
                           <button onClick={() => setShowPreview(!showPreview)} className="text-blue-600 text-xs hover:underline">
                               {showPreview ? 'Refresh' : 'Lihat'}
                           </button>
                       </label>
                       
                       <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-6 overflow-y-auto relative">
                           <div className="absolute top-2 right-2 text-[10px] font-bold text-slate-300 uppercase">Simulasi</div>
                           <pre className="font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                               {getPreview()}
                           </pre>
                       </div>
                  </div>

              </div>
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
              <button 
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition"
              >
                  Batal
              </button>
              <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/10 flex items-center gap-2"
              >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  <span>Simpan Template</span>
              </button>
          </div>

       </div>
    </div>
  )
}
