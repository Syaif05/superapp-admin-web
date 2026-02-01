'use client'
// PENTING: Import 'use' untuk menangani params di Next.js 15+
import { useState, useEffect, use } from 'react' 
import { supabase } from '@/lib/supabase'
import Editor from '@monaco-editor/react'
import { useRouter } from 'next/navigation'

export default function ProductTemplateEditor({ params }) {
  // Unwrapping params (Wajib di Next.js versi baru)
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  const [productName, setProductName] = useState('Memuat...')
  const [subject, setSubject] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (productId) fetchProductData()
  }, [productId])

  const fetchProductData = async () => {
    setLoading(true)
    
    // 1. Cek di tabel products
    let { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()
    
    // 2. Jika tidak ada, cek tabel link_items (untuk produk link)
    if (!data) {
       const resLink = await supabase
        .from('link_items')
        .select('*')
        .eq('id', productId)
        .single()
       data = resLink.data
    }

    if (data) {
      setProductName(data.name)
      setSubject(data.email_subject || 'Pesanan: {{product_name}}')
      
      // Template Default
      const defaultTemplate = `
<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
  <h2 style="color: #2563eb;">Halo, {{buyer_email}}</h2>
  <p>Terima kasih telah membeli <b>{{product_name}}</b>.</p>
  
  <div style="background: #f3f4f6; padding: 15px; margin: 20px 0; border-radius: 5px;">
    <p style="margin: 0; font-size: 14px; color: #666;">Kode Akses Anda:</p>
    <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #111;">{{product_code}}</p>
  </div>

  <p style="font-size: 12px; color: #888;">ID Transaksi: {{transaction_id}}</p>
</div>`
      
      // Prioritas: Ambil dari Kolom Text -> Kolom URL -> Default
      let currentBody = data.email_body;
      if (!currentBody && data.template_url) {
          // Jika kosong tapi punya URL, kita biarkan kosong dulu (nanti fetch di backend) 
          // atau kita tampilkan default di editor biar user bisa edit ulang.
          // Untuk editor, lebih aman tampilkan default/kosong biar user buat baru.
          currentBody = defaultTemplate; 
      }
      
      setCode(currentBody || defaultTemplate)
    } else {
      alert('Produk tidak ditemukan!')
      router.push('/')
    }
    setLoading(false)
  }

  const handleSave = async () => {
    // Coba simpan ke products
    let { error } = await supabase
      .from('products')
      .update({ email_subject: subject, email_body: code })
      .eq('id', productId)

    // Jika error (berarti ID ada di link_items), simpan ke link_items
    if (error) {
       await supabase
        .from('link_items')
        .update({ email_subject: subject, email_body: code })
        .eq('id', productId)
    }

    alert('✅ Template Berhasil Disimpan!')
  }

  // Preview dengan Data Dummy (Anti Error)
  const getPreviewHTML = () => {
    if (!code) return ""
    return code
      .replace(/{{transaction_id}}/g, 'TRX-12345')
      .replace(/{{buyer_email}}/g, 'user@contoh.com')
      .replace(/{{product_name}}/g, productName || 'Nama Produk')
      .replace(/{{product_code}}/g, 'KODE-DEMO-123')
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Memuat Editor...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800">
        <div>
            <h1 className="text-lg font-bold text-blue-400">🎨 Edit Template: {productName}</h1>
            <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white mt-1">← Kembali ke Dashboard</button>
        </div>
        <button 
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold transition flex items-center gap-2 shadow-lg"
        >
            💾 SIMPAN
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* EDITOR */}
        <div className="w-1/2 flex flex-col border-r border-gray-700">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Subject Email</label>
                <input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-blue-500 outline-none" 
                    placeholder="Contoh: Pesanan {{product_name}} Berhasil"
                />
            </div>
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    defaultLanguage="html"
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value)}
                    options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                    loading={<div className="text-center p-4">Memuat Code Editor...</div>}
                />
            </div>
        </div>

        {/* PREVIEW */}
        <div className="w-1/2 flex flex-col bg-gray-100 text-black">
            <div className="p-2 bg-gray-200 border-b border-gray-300 text-xs font-bold text-gray-600 uppercase text-center">
                Preview Tampilan (Simulasi Data)
            </div>
            <div className="flex-1 p-8 overflow-auto flex justify-center bg-gray-50">
                <div className="w-full max-w-[600px]">
                    <div className="bg-white shadow-xl rounded-lg overflow-hidden min-h-[400px]">
                        <div dangerouslySetInnerHTML={{ __html: getPreviewHTML() }} />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}