'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Package, Plus, Trash2, Upload, Download, FileSpreadsheet, X, Search } from 'lucide-react'

export default function AccountManager({ product, onBack }) {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, sold: 0, available: 0 })
  
  // New Stock Form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newStockData, setNewStockData] = useState({})
  
  // CSV Import
  const fileInputRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)

  // Config from Product
  // NORMALIZE FIELDS (Support Old String[] and New Object[])
  const rawFields = product.account_config?.fields || []
  const fields = rawFields.map(f => {
      if (typeof f === 'string') return { name: f, type: 'text' }
      return f
  })
  const [isDeleting, setIsDeleting] = useState(false)
  
  useEffect(() => {
    fetchStocks()
  }, [])

  async function fetchStocks() {
    const { data, error } = await supabase
        .from('account_stocks')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false }) // Newest first for view

    if (data) {
        setStocks(data)
        // Calc Stats
        const total = data.length
        const sold = data.filter(s => s.is_sold).length
        setStats({
            total,
            sold,
            available: total - sold
        })
    }
  }

  // --- ACTIONS ---
  async function addStock(e) {
    e.preventDefault()
    
    // Validate required fields
    if (fields.some(f => !newStockData[f.name])) {
        alert("Semua data akun wajib diisi!")
        return
    }

    const { error } = await supabase.from('account_stocks').insert({
        product_id: product.id,
        is_sold: false,
        account_data: newStockData // Fix: Include indexable data
    })

    if (!error) {
        setNewStockData({})
        setShowAddForm(false)
        fetchStocks()
        alert("Stok berhasil ditambah!")
    } else {
        alert("Gagal: " + error.message)
    }
  }

  async function deleteStock(id) {
    if (!confirm("Hapus stok ini?")) return
    await supabase.from('account_stocks').delete().eq('id', id)
    fetchStocks()
  }

  // --- CSV ACTIONS ---
  const downloadTemplate = () => {
    // Header based on fields
    const csvHeader = fields.map(f => f.name).join(',') + "\n"
    const csvExample = fields.map(f => `Contoh ${f.name}`).join(',')

    const blob = new Blob([csvHeader + csvExample], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `template_akun_${product.product_code}.csv`
    link.click()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUploading(true)
    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const text = event.target.result
        const lines = text.split('\n')
        const newItems = []

        // Header check
        const header = lines[0].trim().split(',')
        if (header.some((h, i) => h.trim() !== fields[i]?.name)) {
            alert("Format header CSV tidak sesuai konfigurasi produk!")
            return
        }

        // Parse Body
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          
          const cols = line.split(',')
          const rowData = {}
          let isValidRow = true

          fields.forEach((f, idx) => {
             const val = cols[idx]?.trim()
             if (!val) isValidRow = false
             rowData[f.name] = val
          })

          if (isValidRow) {
             newItems.push({
                 product_id: product.id,
                 account_data: rowData,
                 is_sold: false
             })
          }
        }

        if (newItems.length > 0) {
          const { error } = await supabase.from('account_stocks').insert(newItems)
          if (error) throw error
          alert(`Berhasil import ${newItems.length} akun!`)
          fetchStocks()
        } else {
          alert("File kosong atau tidak ada data valid.")
        }

      } catch (err) {
        alert("Gagal import: " + err.message)
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
        {/* HEADER */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                    <X size={20}/>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Stok: {product.name}</h2>
                    <div className="flex gap-4 mt-1 text-xs font-bold uppercase tracking-wider">
                        <span className="text-green-600">Available: {stats.available}</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-blue-600">Total: {stats.total}</span>
                        <span className="text-slate-400">|</span>
                        <span className="text-orange-600">Sold: {stats.sold}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                    <Download size={16} /> Template
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
                        className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-100 transition"
                    >
                        {isUploading ? <Upload size={16} className="animate-bounce" /> : <FileSpreadsheet size={16} />}
                        {isUploading ? 'Importing...' : 'Import CSV'}
                    </button>
                </div>
                <button 
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition"
                >
                    <Plus size={16} /> Tambah Stok
                </button>
            </div>
        </div>

        {/* ADD FORM */}
        {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={18} /> Tambah Stok Manual
            </h3>
            <form onSubmit={addStock} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fields.map((f, i) => (
                    <div key={i}>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{f.name}</label>
                        <input 
                            type={f.type === 'string' ? 'text' : f.type || 'text'} // Handle clean type
                            value={newStockData[f.name] || ''}
                            onChange={e => setNewStockData({ ...newStockData, [f.name]: e.target.value })}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder={f.name}
                            required
                        />
                    </div>
                ))}
                <div className="flex items-end">
                    <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition h-[38px]">
                        Simpan
                    </button>
                    {/* Add CSV Import Info or Helper */}
                </div>
            </form>
        </div>
        )}

        {/* LIST TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                    <tr>
                        <th className="p-4">Status</th>
                        {fields.map((f, i) => <th key={i} className="p-4">{f.name}</th>)}
                        <th className="p-4">Terjual Ke</th>
                        <th className="p-4 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {stocks.length === 0 ? (
                        <tr><td colSpan={fields.length + 3} className="p-8 text-center text-slate-400">Belum ada stok akun.</td></tr>
                    ) : stocks.map(stock => (
                        <tr key={stock.id} className="hover:bg-slate-50 group">
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    stock.is_sold ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                                }`}>
                                    {stock.is_sold ? 'TERJUAL' : 'TERSEDIA'}
                                </span>
                            </td>
                            {fields.map((f, i) => (
                                <td key={i} className="p-4 font-mono text-slate-700">
                                    {stock.account_data[f.name]}
                                </td>
                            ))}
                            <td className="p-4 text-slate-500 text-xs">
                                {stock.is_sold ? (
                                    <div>
                                        <div className="font-bold text-slate-700">{stock.sold_to}</div>
                                        <div className="font-mono text-[10px]">{stock.transaction_id}</div>
                                    </div>
                                ) : '-'}
                            </td>
                            <td className="p-4 text-right">
                                {!stock.is_sold && (
                                    <button onClick={() => deleteStock(stock.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  )
}
