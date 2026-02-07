import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, AlertCircle, Plus, Trash2, Calendar, Lock, Type, Hash, UploadCloud, Loader2, X, Eye } from 'lucide-react'

export default function AddProductForm({ onSuccess, initialType = 'manual' }) {
  const [loading, setLoading] = useState(false)
  
  const [productType, setProductType] = useState(initialType)
  
  // Basic Info
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [prefixCode, setPrefixCode] = useState('') // Pindah ke Basic Info (khusus Akun)
  
  // Manual / Invite Only
  const [groupEmail, setGroupEmail] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [file, setFile] = useState(null)
  
  // Account Product Config
  // accountFields sekarang array of objects: { name: 'Email', type: 'text' }
  const [accountFields, setAccountFields] = useState([
    { name: 'Email', type: 'text' },
    { name: 'Password', type: 'password' }
  ])
  const [copyTemplate, setCopyTemplate] = useState(`Terimakasih sudah membeli {Nama Produk}.
Berikut detail akun anda:
Email: {Email}
Password: {Password}
Transaction ID: {Transaction ID}`)
  
  // Temp State untuk Tambah Field Baru
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState('text') // text, password, date, number

  // Template Preview
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (initialType) setProductType(initialType)
  }, [initialType])

  const FIELD_TYPES = [
    { id: 'text', label: 'Teks', icon: Type },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'date', label: 'Tanggal', icon: Calendar },
    { id: 'number', label: 'Angka', icon: Hash },
  ]

  const handleAddAccountField = () => {
    if (!newFieldName.trim()) return
    // Cek duplikat
    if (accountFields.some(f => f.name.toLowerCase() === newFieldName.trim().toLowerCase())) {
        alert("Nama kolom sudah ada!")
        return
    }
    setAccountFields([...accountFields, { name: newFieldName.trim(), type: newFieldType }])
    setNewFieldName('')
    setNewFieldType('text')
  }

  const handleRemoveAccountField = (index) => {
    const newFields = [...accountFields]
    newFields.splice(index, 1)
    setAccountFields(newFields)
  }

  const getTemplatePreview = () => {
      let preview = copyTemplate
      preview = preview.replace(/{Nama Produk}/g, name || 'Netflix Premium')
      preview = preview.replace(/{Transaction ID}/g, `${prefixCode || 'NFX'}-123456789`)
      preview = preview.replace(/{Email Pembeli}/g, 'customer@example.com')
      
      accountFields.forEach(f => {
          let dummyVal = '...'
          if (f.type === 'date') dummyVal = '2026-12-31'
          else if (f.type === 'password') dummyVal = 'secret123'
          else if (f.type === 'number') dummyVal = '1234'
          else dummyVal = f.name === 'Email' ? 'user@netflix.com' : 'Sesuatu...'
          
          preview = preview.replace(new RegExp(`{${f.name}}`, 'g'), dummyVal)
      })
      return preview
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let publicUrl = null

      // Upload HTML Template if Manual
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
        name,
        product_code: code || null, 
        product_type: productType,
        // Removed is_active handling to fix DB error
        template_url: publicUrl
      }

      if (productType === 'manual') {
        payload.group_email = groupEmail
        payload.email_subject = emailSubject.toUpperCase()
        payload.email_body = emailBody
        
        if(!groupEmail) throw new Error("Email Group wajib diisi untuk produk manual!")
      }
      else if (productType === 'account') {
        payload.prefix_code = prefixCode.toUpperCase()
        payload.account_config = {
            fields: accountFields, // Array of { name, type }
            template: copyTemplate
        }
        
        if (prefixCode.length !== 3) throw new Error("Prefix Code harus 3 huruf!")
        if (accountFields.length === 0) throw new Error("Minimal harus ada 1 kolom data akun!")
      }

      const { error } = await supabase.from('products').insert(payload)
      
      if (error) throw error
      
      alert('Produk berhasil dibuat!')
      onSuccess()

    } catch (err) {
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-5 duration-500">
      
      <div className="flex items-center space-x-4 border-b pb-6 border-slate-200">
          <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
             <Plus className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Tambah Produk Baru</h2>
            <p className="text-slate-500">Konfigurasi produk sistem otomatis</p>
          </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* STEP 1: PILIH TIPE (Disabled jika initialType ada) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold mb-4 text-slate-700">Jenis Produk</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { id: 'manual', label: 'Sistem Undangan', desc: 'Via Email Group/Invite' },
                    { id: 'account', label: 'Stok Akun', desc: 'Email/Pass/PIN' },
                    { id: 'link', label: 'Produk Link', desc: 'Direct URL Access' },
                ].map(type => (
                    <button
                        type="button"
                        key={type.id}
                        disabled={initialType && initialType !== type.id} 
                        onClick={() => setProductType(type.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            productType === type.id 
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 ring-offset-2' 
                            : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 opacity-100' // Always visible
                        } ${initialType && initialType !== type.id ? 'opacity-50 cursor-not-allowed hidden' : ''}`} 
                    >
                        <span className="block font-bold text-slate-800">{type.label}</span>
                        <span className="text-xs text-slate-500">{type.desc}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* STEP 2: INFO DASAR */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
           <h3 className="text-lg font-bold text-slate-700">Informasi Dasar</h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nama Produk</label>
                  <input 
                    required
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="Contoh: Netflix Premium 1 Bulan"
                  />
               </div>
               
               {productType !== 'account' ? ( 
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Kode Produk (Opsional)</label>
                      <input 
                        type="text" 
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="NETFLIX-1B"
                      />
                   </div>
               ) : (
                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Prefix Kode (3 Huruf)</label>
                      <div className="relative">
                        <input 
                          required
                          maxLength={3}
                          type="text" 
                          value={prefixCode}
                          onChange={e => setPrefixCode(e.target.value.toUpperCase())}
                          className="w-full p-3 bg-slate-50 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest uppercase font-bold"
                          placeholder="NFX"
                        />
                        <div className="absolute right-3 top-3 text-xs text-slate-400 font-bold">
                             {prefixCode.length}/3
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Digunakan untuk generate Transaction ID (Contoh: NFX-8273...)</p>
                  </div>
               )}
           </div>
        </div>

        {/* STEP 3: KONFIGURASI KHUSUS */}
        
        {/* A. CONFIG MANUAL */}
        {productType === 'manual' && (
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><AlertCircle size={20}/></div>
                 <h3 className="text-lg font-bold text-slate-700">Konfigurasi Undangan</h3>
              </div>

              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email Group / Sender</label>
                  <input 
                    required
                    type="email" 
                    value={groupEmail}
                    onChange={e => setGroupEmail(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="family-plan@netflix.com"
                  />
              </div>

              <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Subject Email (Keyword)</label>
                  <input 
                    type="text" 
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="NETFLIX HOUSEHOLD UPDATE"
                  />
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
           </div>
        )}

        {/* B. CONFIG AKUN (UPDATED WITH PREVIEW & TYPED FIELDS) */}
        {productType === 'account' && (
           <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-6 animate-in slide-in-from-top-2">
               <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-blue-200 text-blue-700 rounded-lg"><Hash size={20}/></div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-700">Konfigurasi Stok Akun</h3>
                    <p className="text-sm text-slate-500">Tentukan format data akun yang akan dijual.</p>
                 </div>
              </div>
              
              {/* Dynamic Field Builder with TYPES */}
              <div className="bg-white p-5 rounded-xl border border-blue-100">
                  <label className="block text-sm font-bold text-slate-700 mb-4">Kolom Data Akun</label>
                  
                  {/* List Existing Fields */}
                  <div className="space-y-3 mb-4">
                      {accountFields.map((f, i) => (
                          <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider w-20 text-center">
                                  {f.type}
                              </span>
                              <span className="font-bold text-slate-700 flex-1">{f.name}</span>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveAccountField(i)}
                                className="text-red-400 hover:text-red-600 p-1"
                              >
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                      ))}
                  </div>

                  {/* Add New Field Form */}
                  <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border border-dashed border-slate-300">
                      <div className="flex-1">
                          <label className="text-xs text-slate-500 font-bold mb-1 block">Nama Kolom</label>
                          <input 
                            type="text" 
                            value={newFieldName}
                            onChange={e => setNewFieldName(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                            placeholder="Misal: Tanggal Expired"
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAccountField())}
                          />
                      </div>
                      <div className="w-1/3">
                          <label className="text-xs text-slate-500 font-bold mb-1 block">Tipe Data</label>
                          <select 
                            value={newFieldType}
                            onChange={e => setNewFieldType(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                              {FIELD_TYPES.map(t => (
                                  <option key={t.id} value={t.id}>{t.label}</option>
                              ))}
                          </select>
                      </div>
                      <button 
                         type="button" 
                         onClick={handleAddAccountField}
                         className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition mb-0.5"
                      >
                         <Plus size={20}/>
                      </button>
                  </div>
              </div>

              {/* Template Editor with Live Preview */}
              <div className="bg-white p-5 rounded-xl border border-blue-100">
                  <div className="flex justify-between items-center mb-4">
                      <label className="block text-sm font-bold text-slate-700">Template Pesan Salin</label>
                      <button 
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                         <Eye size={14} /> {showPreview ? 'Sembunyikan Preview' : 'Lihat Preview'}
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Editor */}
                      <div className="space-y-2">
                          <textarea 
                            rows={8}
                            value={copyTemplate}
                            onChange={e => setCopyTemplate(e.target.value)}
                            className="w-full p-4 bg-slate-900 text-green-400 font-mono text-sm rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Ketik template pesan anda disini..."
                          />
                          <div className="flex flex-wrap gap-2">
                                {['{Nama Produk}', '{Transaction ID}', '{Email Pembeli}', ...accountFields.map(f => `{${f.name}}`)].map(token => (
                                    <button
                                      key={token}
                                      type="button"
                                      onClick={() => setCopyTemplate(prev => prev + ' ' + token)}
                                      className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium rounded-md hover:bg-white hover:border-blue-400 hover:text-blue-600 transition"
                                    >
                                        {token}
                                    </button>
                                ))}
                          </div>
                      </div>

                      {/* Preview Box */}
                      {showPreview ? (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full">
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Preview</div>
                              <div className="whitespace-pre-wrap font-mono text-sm text-slate-700 bg-white p-4 rounded-lg border border-slate-100 h-[200px] overflow-y-auto shadow-sm">
                                  {getTemplatePreview()}
                              </div>
                          </div>
                      ) : (
                          <div className="hidden lg:flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                              Klik tombol "Lihat Preview" untuk melihat hasil.
                          </div>
                      )}
                  </div>
              </div>
           </div>
        )}

        <div className="pt-6 border-t border-slate-200 flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-xl shadow-slate-900/10 disabled:opacity-50"
            >
               {loading ? <Loader2 className="animate-spin" /> : <Save size={20}/>}
              <span>Simpan Produk</span>
            </button>
        </div>

      </form>
    </div>
  )
}