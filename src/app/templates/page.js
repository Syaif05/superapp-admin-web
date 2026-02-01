'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Editor from '@monaco-editor/react'

export default function TemplateEditor() {
  const [selectedType, setSelectedType] = useState('order_success')
  const [subject, setSubject] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch Template saat tipe dipilih
  useEffect(() => {
    fetchTemplate(selectedType)
  }, [selectedType])

  const fetchTemplate = async (type) => {
    setLoading(true)
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', type)
      .single()
    
    if (data) {
      setSubject(data.subject_template)
      setCode(data.html_content)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    const { error } = await supabase
      .from('email_templates')
      .update({ subject_template: subject, html_content: code, updated_at: new Date() })
      .eq('type', selectedType)

    if (!error) alert('✅ Template Berhasil Disimpan!')
    else alert('❌ Gagal Simpan')
  }

  return (
    <div className="p-6 h-screen flex flex-col bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📧 Email Template IDE</h1>
        <button 
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold"
        >
            💾 SIMPAN PERUBAHAN
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-4 mb-4 bg-gray-800 p-4 rounded">
        <div>
            <label className="block text-sm text-gray-400 mb-1">Tipe Email</label>
            <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-gray-700 text-white p-2 rounded w-64"
            >
                <option value="order_success">Order Satuan (Produk)</option>
                <option value="link_access">Order Link (Grup/Drive)</option>
            </select>
        </div>
        <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">Subject Template</label>
            <input 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded" 
            />
            <p className="text-xs text-yellow-500 mt-1">Variabel tersedia: <code>{{transaction_id}}, {{product_names}}, {{buyer_email}}</code></p>
        </div>
      </div>

      {/* Editor & Preview Area */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* KIRI: IDE (Monaco Editor) */}
        <div className="w-1/2 border border-gray-700 rounded overflow-hidden">
            <Editor
                height="100%"
                defaultLanguage="html"
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value)}
                options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
        </div>

        {/* KANAN: Live Preview */}
        <div className="w-1/2 bg-white text-black rounded overflow-auto p-4 border border-gray-700">
            <h3 className="text-gray-500 font-bold border-b pb-2 mb-4 text-xs uppercase">Live Preview (Data Dummy)</h3>
            <div dangerouslySetInnerHTML={{ 
                __html: code
                    .replace(/{{transaction_id}}/g, 'TRX-123456789')
                    .replace(/{{buyer_email}}/g, 'pembeli@contoh.com')
                    .replace(/{{product_names}}/g, 'Produk Demo 1, Produk Demo 2')
                    .replace(/{{product_table}}/g, '<tr><td>Produk A</td><td>KODE-123</td></tr>') 
            }} />
        </div>
      </div>
    </div>
  )
}