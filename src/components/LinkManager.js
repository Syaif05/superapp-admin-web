'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Folder, ArrowLeft, Trash2, Palette } from 'lucide-react' // Tambah Palette
import Link from 'next/link'

export default function LinkManager() {
  const [view, setView] = useState('categories')
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  // Form States
  const [catForm, setCatForm] = useState({ name: '', email: '' })
  const [itemForm, setItemForm] = useState({ name: '', main_url: '', drive_url: '' })

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    setLoading(true)
    const { data } = await supabase.from('link_categories').select('*').order('id', { ascending: true })
    if (data) setCategories(data)
    setLoading(false)
  }

  async function fetchItems(catId) {
    setLoading(true)
    const { data } = await supabase.from('link_items').select('*').eq('category_id', catId).order('id', { ascending: true })
    if (data) setItems(data)
    setLoading(false)
  }

  // --- ACTIONS ---
  async function addCategory(e) {
    e.preventDefault()
    const { error } = await supabase.from('link_categories').insert({
        name: catForm.name,
        group_email: catForm.email
    })
    if (!error) { setCatForm({ name: '', email: '' }); fetchCategories() }
  }

  async function deleteCategory(id) {
    if(!confirm('Hapus kategori ini beserta isinya?')) return
    await supabase.from('link_categories').delete().eq('id', id)
    fetchCategories()
  }

  async function addItem(e) {
    e.preventDefault()
    const { error } = await supabase.from('link_items').insert({
        category_id: selectedCategory.id,
        name: itemForm.name,
        main_url: itemForm.main_url,
        drive_url: itemForm.drive_url
    })
    if(!error) { setItemForm({ name: '', main_url: '', drive_url: '' }); fetchItems(selectedCategory.id) }
  }

  async function deleteItem(id) {
    if(!confirm('Hapus item ini?')) return
    await supabase.from('link_items').delete().eq('id', id)
    fetchItems(selectedCategory.id)
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {view === 'categories' ? (
        // --- TAMPILAN KATEGORI ---
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Kategori Link (Folder)</h2>
            
            {/* Form Tambah Kategori */}
            <form onSubmit={addCategory} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Kategori</label>
                    <input required value={catForm.name} onChange={e=>setCatForm({...catForm, name: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="Contoh: Game PC" />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Group Email (Opsional)</label>
                    <input value={catForm.email} onChange={e=>setCatForm({...catForm, email: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="group@sekolah.sch.id" />
                </div>
                <button type="submit" className="bg-slate-900 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-800 transition">
                    + Buat Folder
                </button>
            </form>

            {/* List Kategori */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition group relative overflow-hidden">
                        
                        {/* Header Folder */}
                        <div className="flex justify-between items-start mb-4 cursor-pointer" onClick={() => { setSelectedCategory(cat); setView('items'); fetchItems(cat.id) }}>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                                <Folder size={24} />
                            </div>
                        </div>

                        <div className="mb-4 cursor-pointer" onClick={() => { setSelectedCategory(cat); setView('items'); fetchItems(cat.id) }}>
                            <h3 className="text-lg font-bold text-slate-800">{cat.name}</h3>
                            <p className="text-sm text-slate-500 mt-1 truncate">{cat.group_email || 'No Group Email'}</p>
                        </div>

                        {/* Footer: Tombol Hapus & Edit Template */}
                        <div className="pt-4 border-t border-slate-50 flex gap-2">
                            {/* TOMBOL EDIT TEMPLATE (PINDAH KE SINI) */}
                            <Link 
                                href={`/links/template/${cat.id}`}
                                className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 py-2 rounded-lg hover:bg-indigo-100 transition"
                            >
                                <Palette size={14} />
                                Edit Desain
                            </Link>

                            <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id) }} className="p-2 text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded-lg transition">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ) : (
        // --- TAMPILAN ITEMS ---
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => setView('categories')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Isi Folder: {selectedCategory?.name}</h2>
                    <p className="text-slate-500 text-sm">Kelola link produk di dalam kategori ini</p>
                </div>
            </div>

            {/* Form Tambah Item */}
            <form onSubmit={addItem} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Item</label>
                    <input required value={itemForm.name} onChange={e=>setItemForm({...itemForm, name: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="Nama Produk" />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Server URL (Opsional)</label>
                    <input value={itemForm.main_url} onChange={e=>setItemForm({...itemForm, main_url: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="https://..." />
                </div>
                <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Google Drive URL</label>
                    <input required value={itemForm.drive_url} onChange={e=>setItemForm({...itemForm, drive_url: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="https://drive.google.com/..." />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition">
                    + Tambah Item
                </button>
            </form>

            {/* Tabel Items (Tanpa tombol Edit Template lagi) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                        <tr>
                            <th className="p-4">Nama Item</th>
                            <th className="p-4">Server URL</th>
                            <th className="p-4">Drive URL</th>
                            <th className="p-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {items.length === 0 ? (
                            <tr><td colSpan="4" className="p-8 text-center text-slate-400">Belum ada item link.</td></tr>
                        ) : items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-4 font-bold text-slate-800">{item.name}</td>
                                <td className="p-4 text-slate-500 truncate max-w-[150px]">{item.main_url || '-'}</td>
                                <td className="p-4 text-slate-500 truncate max-w-[150px]">{item.drive_url || '-'}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => deleteItem(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  )
}