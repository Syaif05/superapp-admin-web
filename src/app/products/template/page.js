'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Editor from '@monaco-editor/react'

export default function TemplateEditor() {
  const [templates, setTemplates] = useState([])
  const [selectedType, setSelectedType] = useState('')
  const [subject, setSubject] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 1. Ambil Semua Template dari Database saat Loading
  useEffect(() => {
    fetchTemplates()
  }, [])

  // 2. Saat tipe dipilih, update editor
  useEffect(() => {
    if (selectedType && templates.length > 0) {
        const tpl = templates.find(t => t.type === selectedType)
        if (tpl) {
            setSubject(tpl.subject_template || '')
            setCode(tpl.html_content || '')
        }
    }
  }, [selectedType, templates])

  const fetchTemplates = async () => {
    setLoading(true)
    // Ambil data dari tabel email_templates
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('id', { ascending: true })
    
    if (data && data.length > 0) {
        setTemplates(data)
        // Default pilih yang pertama
        if (!selectedType) setSelectedType(data[0].type)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('email_templates')
      .update({ 
          subject_template: subject, 
          html_content: code, 
          updated_at: new Date() 
      })
      .eq('type', selectedType)

    setSaving(false)
    if (!error) {
        alert('✅ Template Berhasil Disimpan ke Database!')
        // Refresh data agar sinkron
        fetchTemplates()
    } else {
        alert('❌ Gagal Simpan: ' + error.message)
    }
  }

  // 3. GENERATOR PREVIEW (Anti-Error / Anti-Blank)
  // Kita ganti variabel {{...}} dengan teks palsu agar tampilan terlihat
  const getPreviewHTML = () => {
    if (!code) return "<div style='padding:20px; text-align:center; color:#888'>Area Preview Kosong</div>"
    
    return code
      .replace(/{{transaction_id}}/g, 'TRX-DEMO-12345')
      .replace(/{{buyer_email}}/g, 'pembeli@contoh.com')
      .replace(/{{product_names}}/g, 'Produk Demo A, Produk Demo B')
      .replace(/{{product_name}}/g, 'Nama Produk Demo')
      .replace(/{{product_code}}/g, 'KODE-AKSES-123')
      // Jika ada tabel produk dinamis
      .replace(/{{product_table}}/g, `
        <tr>
            <td style="padding:8px; border:1px solid #ddd;">Produk Demo 1</td>
            <td style="padding:8px; border:1px solid #ddd;"><b>KODE-111</b></td>
        </tr>
        <tr>
            <td style="padding:8px; border:1px solid #ddd;">Produk Demo 2</td>
            <td style="padding:8px; border:1px solid #ddd;"><b>KODE-222</b></td>
        </tr>
      `)
  }

  if (loading) return <div className="p-10 text-white">Memuat Database Template...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* HEADER TOOLBAR */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800 shadow-md">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-blue-400">📧 Template Engine</h1>
            
            {/* Dropdown Pilihan Template */}
            <div className="flex flex-col">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">Edit Template:</label>
                <select 
                    value={selectedType} 
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="bg-gray-700 text-white text-sm p-1 rounded border border-gray-600 focus:border-blue-500 outline-none w-48"
                >
                    {templates.map(t => (
                        <option key={t.id} value={t.type}>
                            {t.type.toUpperCase().replace('_', ' ')}
                        </option>
                    ))}
                </select>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <div className="text-right mr-4">
                <label className="block text-[10px] text-gray-400 uppercase">Subject Email</label>
                <input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 w-80 focus:border-blue-500 outline-none"
                    placeholder="Subject Email..."
                />
            </div>
            <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded font-bold shadow transition flex items-center gap-2"
            >
                {saving ? 'Menyimpan...' : '💾 SIMPAN DATABASE'}
            </button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* KIRI: CODE EDITOR (Monaco) */}
        <div className="w-1/2 flex flex-col border-r border-gray-700">
            <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 flex justify-between">
                <span>EDITOR HTML (Source Code)</span>
                <span>Variabel: <code>{{buyer_email}}, {{product_names}}, {{transaction_id}}</code></span>
            </div>
            <div className="flex-1">
                <Editor
                    height="100%"
                    defaultLanguage="html"
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value)}
                    options={{ 
                        minimap: { enabled: false }, 
                        fontSize: 14, 
                        wordWrap: 'on',
                        padding: { top: 10 }
                    }}
                />
            </div>
        </div>

        {/* KANAN: LIVE PREVIEW */}
        <div className="w-1/2 flex flex-col bg-gray-100">
            <div className="bg-gray-200 px-4 py-2 text-xs text-gray-600 font-bold border-b border-gray-300 uppercase flex justify-between items-center">
                <span>Live Preview (Simulasi Data)</span>
                <span className="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded text-[10px]">Auto-Refresh</span>
            </div>
            
            {/* Container HP-like Preview */}
            <div className="flex-1 p-8 overflow-auto flex justify-center bg-gray-50">
                <div className="w-full max-w-[600px] bg-white shadow-2xl min-h-[500px] rounded-lg overflow-hidden border border-gray-200">
                    {/* Header Email Pura-pura */}
                    <div className="bg-gray-50 border-b p-4 text-sm text-gray-600">
                        <p><b>To:</b> pembeli@contoh.com</p>
                        <p><b>Subject:</b> {subject.replace(/{{transaction_id}}/g, 'TRX-DEMO-123').replace(/{{product_names}}/g, 'Produk Demo')}</p>
                    </div>
                    {/* Body HTML */}
                    <div 
                        className="p-0"
                        dangerouslySetInnerHTML={{ __html: getPreviewHTML() }} 
                    />
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}