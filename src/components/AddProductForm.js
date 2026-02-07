import { useState } from 'react'
import { UploadCloud, Loader2, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AddProductForm({ onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Basic Info
  const [form, setForm] = useState({ name: '', code: '', email: '', role: 'MEMBER' })
  const [productType, setProductType] = useState('manual') // manual, link, account
  const [file, setFile] = useState(null)

  // Account Config
  const [prefixCode, setPrefixCode] = useState('')
  const [accountFields, setAccountFields] = useState(['Email', 'Password']) // Default fields
  const [copyTemplate, setCopyTemplate] = useState(
`Terimakasih sudah membeli di toko.
Berikut produk {Nama Produk} yang anda beli : 
Email : {Email}
Password : {Password}
akun aktif sejak {Tanggal Aktif}.
Terimakasih sudah berbelanja.`
  )
  const [newField, setNewField] = useState('')

  // Field Management
  const addField = () => {
    if (newField && !accountFields.includes(newField)) {
      setAccountFields([...accountFields, newField])
      setNewField('')
    }
  }

  const removeField = (field) => {
    setAccountFields(accountFields.filter(f => f !== field))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let publicUrl = null

      if (file && productType === 'manual') {
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

      const payload = {
        name: form.name,
        product_code: form.code.toUpperCase(),
        group_email: form.email,
        role: form.role,
        template_url: publicUrl,
        product_type: productType
      }

      // Add Account Config if Account Type
      if (productType === 'account') {
        payload.prefix_code = prefixCode.toUpperCase()
        payload.account_config = {
            fields: accountFields,
            template: copyTemplate
        }
        // Validate
        if(prefixCode.length !== 3) throw new Error("Prefix Code harus 3 huruf!")
        if(accountFields.length === 0) throw new Error("Minimal harus ada 1 kolom data akun!")
      }

      const { error: dbError } = await supabase.from('products').insert(payload)

      if (dbError) throw dbError
      
      alert('Produk berhasil disimpan!')
      // Reset
      setForm({ name: '', code: '', email: '', role: 'MEMBER' })
      setProductType('manual')
      setPrefixCode('')
      setAccountFields(['Email', 'Password'])
      setFile(null)
      onSuccess()
      
    } catch (error) {
      console.error(error)
      if (error.code === '23505') {
        alert('Gagal: Produk dengan kode tersebut sudah ada.')
      } else {
        alert(`Gagal menyimpan: ${error.message}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-6 md:p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Produk Baru</h2>
        
        {/* TIPE PRODUK */}
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tipe Produk</label>
            <div className="flex gap-4">
                {['manual', 'link', 'account'].map(type => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setProductType(type)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition ${
                            productType === type 
                            ? 'bg-slate-900 text-white shadow-md' 
                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        {type === 'manual' ? 'Undangan Email' : type === 'link' ? 'Link / File' : 'Akun Otomatis'}
                    </button>
                ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
                {productType === 'manual' && "Kirim undangan email Google Group secara manual/otomatis."}
                {productType === 'link' && "Kirim link download file atau akses server."}
                {productType === 'account' && "Jual akun otomatis (Email, Password, dll) dengan sistem stok."}
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Nama Produk</label>
              <input 
                required 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Netflix Premium"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Kode Unik</label>
              <input 
                required 
                maxLength={10} 
                type="text" 
                value={form.code} 
                onChange={e => setForm({...form, code: e.target.value})}
                placeholder="NETFLIX"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
              />
            </div>
          </div>
          
          {/* KONFIGURASI KHUSUS AKUN */}
          {productType === 'account' && (
             <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-6 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">KONFIGURASI AKUN</span>
                </div>

                {/* PREFIX */}
                <div>
                     <label className="text-sm font-bold text-slate-700">Prefix Transaksi (3 Huruf)</label>
                     <input 
                        required 
                        maxLength={3}
                        value={prefixCode}
                        onChange={e => setPrefixCode(e.target.value.toUpperCase())}
                        placeholder="NFL"
                        className="w-24 mt-1 p-3 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono text-center font-bold"
                     />
                     <p className="text-xs text-blue-400 mt-1">Contoh ID nanti: <b>{prefixCode || 'NFL'}-A1B2C3...</b></p>
                </div>

                {/* FIELDS CONFIG */}
                <div>
                    <label className="text-sm font-bold text-slate-700">Kolom Data Akun</label>
                    <p className="text-xs text-slate-500 mb-2">Data apa saja yang perlu disimpan untuk setiap akun?</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                        {accountFields.map(f => (
                            <span key={f} className="flex items-center gap-1 bg-white border border-blue-200 text-blue-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                                {f}
                                <button type="button" onClick={() => removeField(f)} className="hover:text-red-500"><X size={14}/></button>
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input 
                            value={newField}
                            onChange={e => setNewField(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addField())}
                            placeholder="Tambah kolom.. (misal: PIN, Expired)"
                            className="flex-1 p-2 bg-white border border-blue-200 rounded-lg text-sm"
                        />
                        <button type="button" onClick={addField} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus size={20}/></button>
                    </div>
                </div>

                {/* TEMPLATE EDITOR */}
                <div>
                    <label className="text-sm font-bold text-slate-700">Template Pesan (Salin Teks)</label>
                    <p className="text-xs text-slate-500 mb-2">Gunakan <b>{`{NamaKolom}`}</b> sebagai placeholder.</p>
                    <textarea 
                        rows={6}
                        value={copyTemplate}
                        onChange={e => setCopyTemplate(e.target.value)}
                        className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <div className="mt-2 flex gap-2 flex-wrap">
                        <span className="text-xs text-slate-400">Placeholder Tersedia: </span>
                        {accountFields.map(f => (
                            <span key={f} className="text-xs bg-slate-200 px-1 rounded text-slate-600 font-mono cursor-pointer hover:bg-slate-300" onClick={() => setCopyTemplate(prev => prev + ` {${f}}`)}>
                                {`{${f}}`}
                            </span>
                        ))}
                        <span className="text-xs bg-slate-200 px-1 rounded text-slate-600 font-mono cursor-pointer hover:bg-slate-300" onClick={() => setCopyTemplate(prev => prev + ` {Nama Produk}`)}>{`{Nama Produk}`}</span>
                    </div>
                </div>

             </div>
          )}

          {/* EMAIL GROUP (Hanya Manual) */}
          {productType === 'manual' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email Google Group</label>
                <input 
                  required 
                  type="email" 
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="nama-grup@sekolah.sch.id"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Role Akses (Default)</label>
            <select 
              value={form.role} 
              onChange={e => setForm({...form, role: e.target.value})}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="MEMBER">MEMBER (Anggota)</option>
              <option value="MANAGER">MANAGER (Pengelola)</option>
              <option value="OWNER">OWNER (Pemilik)</option>
            </select>
          </div>

          {/* TEMPLATE HTML (Hanya Manual) */}
          {productType === 'manual' && (
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
          )}

          <button 
            disabled={isSubmitting} 
            type="submit" 
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-70 transition-all flex justify-center items-center shadow-lg shadow-slate-900/20"
          >
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'SIMPAN PRODUK'}
          </button>
        </form>
      </div>
    </div>
  )
}