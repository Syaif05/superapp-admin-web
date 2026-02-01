'use client'
import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import Editor from '@monaco-editor/react'
import { useRouter } from 'next/navigation'

export default function CategoryTemplateEditor({ params }) {
  const resolvedParams = use(params);
  const categoryId = resolvedParams.id; // Ini sekarang ID Kategori

  const [categoryName, setCategoryName] = useState('Memuat...')
  const [subject, setSubject] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (categoryId) fetchCategoryData()
  }, [categoryId])

  const fetchCategoryData = async () => {
    setLoading(true)
    
    // Ambil data dari link_categories
    const { data, error } = await supabase
      .from('link_categories')
      .select('*')
      .eq('id', categoryId)
      .single()

    if (data) {
      setCategoryName(data.name)
      setSubject(data.email_subject || 'Akses: {{category_name}}')
      
      // Default Template (Sesuai Request Anda - Console Archive)
      const defaultTemplate = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Akses Game Console</title>
    <style>
        body { margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; }
        table { border-spacing: 0; width: 100%; }
        td { padding: 0; }
        a { text-decoration: none; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #0f172a; padding-bottom: 40px; }
        .container { margin: 0 auto; max-width: 600px; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%); padding: 30px 20px; text-align: center; border-bottom: 4px solid #3b82f6; }
        .header-icons { font-size: 24px; color: #60a5fa; letter-spacing: 10px; margin-bottom: 10px; opacity: 0.8; font-weight: bold; }
        .header-title { font-size: 24px; font-weight: 800; color: white; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
        .list-container { padding: 25px 20px; }
        
        /* ITEM CARD STYLE (Wajib ada agar Item terlihat bagus) */
        .item-card { background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .item-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px; }
        .item-title { font-size: 16px; font-weight: 700; color: #f8fafc; }
        .item-badge { background-color: #3b82f6; color: white; font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
        .btn-grid { width: 100%; border-spacing: 5px; }
        .btn-cell { width: 50%; }
        .btn-server { display: block; background-color: #2563eb; color: #ffffff !important; text-align: center; padding: 10px; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .btn-drive { display: block; background-color: #334155; color: #94a3b8 !important; text-align: center; padding: 10px; border-radius: 6px; font-size: 13px; font-weight: 600; border: 1px solid #475569; }
        
        .footer { background-color: #0f172a; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #334155; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table role="presentation" width="100%">
            <tr>
                <td align="center" style="padding-top: 20px;">
                    <div class="container">
                        <div class="header">
                            <div class="header-icons">△ ○ ✕ □</div>
                            <h1 class="header-title">{{category_name}}</h1>
                            <p style="color: #93c5fd; font-size: 13px; margin-top: 5px;">Koleksi Digital Anda Siap</p>
                        </div>
                        <div class="list-container">
                            <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 20px; text-align: center;">
                                Berikut adalah akses link untuk produk yang Anda pesan.
                            </p>
                            
                            {{items_list}}
                            
                        </div>
                        <div class="footer">
                            <p>Transaction ID: {{transaction_id}}</p>
                            <p>© 2024 SuperApp Official</p>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`
      
      setCode(data.email_body || defaultTemplate)
    } else {
      alert('Kategori tidak ditemukan!')
      router.back()
    }
    setLoading(false)
  }

  const handleSave = async () => {
    // Simpan ke tabel link_categories
    const { error } = await supabase
      .from('link_categories')
      .update({ email_subject: subject, email_body: code })
      .eq('id', categoryId)

    if (!error) {
        alert('✅ Template Kategori Berhasil Disimpan!')
    } else {
        alert('❌ Gagal: ' + error.message)
    }
  }

  // --- PREVIEW SIMULATOR ---
  const getPreviewHTML = () => {
    if (!code) return ""
    
    // Kita buat 2 Item Dummy untuk simulasi tampilan
    const dummyItems = `
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">🎮 Contoh Game 1 (Simulasi)</span>
            <span class="item-badge">ITEM</span>
        </div>
        <table class="btn-grid"><tr>
            <td class="btn-cell"><a href="#" class="btn-server">⬇️ Server Utama</a></td>
            <td class="btn-cell"><a href="#" class="btn-drive">📂 Google Drive</a></td>
        </tr></table>
    </div>
    <div class="item-card">
        <div class="item-header">
            <span class="item-title">🎮 Contoh Game 2 (Simulasi)</span>
            <span class="item-badge">ITEM</span>
        </div>
        <table class="btn-grid"><tr>
            <td class="btn-cell"><a href="#" class="btn-server">⬇️ Server Utama</a></td>
            <td class="btn-cell"><a href="#" class="btn-drive">📂 Google Drive</a></td>
        </tr></table>
    </div>
    `

    return code
      .replace(/{{transaction_id}}/g, 'LINK-TRX-888')
      .replace(/{{buyer_email}}/g, 'user@contoh.com')
      .replace(/{{category_name}}/g, categoryName || 'Nama Kategori')
      .replace(/{{items_list}}/g, dummyItems) // <-- INI YANG PENTING
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Memuat Editor Kategori...</div>

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800">
        <div>
            <h1 className="text-lg font-bold text-indigo-400">📁 Edit Template Kategori: {categoryName}</h1>
            <p className="text-xs text-gray-400">Pastikan ada kode <code>{`{{items_list}}`}</code> untuk menampilkan daftar game.</p>
        </div>
        <div className="flex gap-3">
             <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-white px-3 py-2">Batal</button>
             <button 
                onClick={handleSave}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded font-bold transition flex items-center gap-2 shadow-lg"
            >
                💾 SIMPAN
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* EDITOR */}
        <div className="w-1/2 flex flex-col border-r border-gray-700">
            <div className="p-4 bg-gray-800 border-b border-gray-700">
                <label className="text-xs text-gray-400 uppercase font-bold block mb-1">Subject Email</label>
                <input 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-indigo-500 outline-none" 
                    placeholder="Contoh: Akses {{category_name}}"
                />
            </div>
            <div className="flex-1 relative">
                <Editor
                    height="100%"
                    defaultLanguage="html"
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value)}
                    options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }}
                />
            </div>
        </div>

        {/* PREVIEW */}
        <div className="w-1/2 flex flex-col bg-gray-100 text-black">
            <div className="p-2 bg-gray-200 border-b border-gray-300 text-xs font-bold text-gray-600 uppercase text-center">
                Preview (Wrapper + Dummy Items)
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