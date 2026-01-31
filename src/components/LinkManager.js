import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Folder, FileCode, ArrowLeft, UploadCloud, Link as LinkIcon, HardDrive, Trash2 } from 'lucide-react'

export default function LinkManager() {
  const [view, setView] = useState('categories') 
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const [catForm, setCatForm] = useState({ name: '', email: '' })
  const [catFile, setCatFile] = useState(null)
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

  async function handleCreateCategory(e) {
    e.preventDefault()
    try {
      let publicUrl = null
      if (catFile) {
        const fileName = `cat-${Date.now()}-${catFile.name}`
        await supabase.storage.from('email-templates').upload(fileName, catFile)
        const { data } = supabase.storage.from('email-templates').getPublicUrl(fileName)
        publicUrl = data.publicUrl
      }

      const { error } = await supabase.from('link_categories').insert({
        name: catForm.name,
        group_email: catForm.email,
        template_url: publicUrl
      })

      if (error) throw error
      alert('Kategori Berhasil Dibuat!')
      setCatForm({ name: '', email: '' })
      setCatFile(null)
      fetchCategories()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleCreateItem(e) {
    e.preventDefault()
    try {
      const { error } = await supabase.from('link_items').insert({
        category_id: selectedCategory.id,
        name: itemForm.name,
        main_url: itemForm.main_url,
        drive_url: itemForm.drive_url
      })
      if (error) throw error
      alert('Link Berhasil Disimpan!')
      setItemForm({ name: '', main_url: '', drive_url: '' })
      fetchItems(selectedCategory.id)
    } catch (err) {
      alert(err.message)
    }
  }

  async function deleteCategory(id) {
    if (!confirm('Hapus kategori ini beserta semua link di dalamnya?')) return
    await supabase.from('link_categories').delete().eq('id', id)
    fetchCategories()
  }

  async function deleteItem(id) {
    if (!confirm('Hapus item link ini?')) return
    await supabase.from('link_items').delete().eq('id', id)
    fetchItems(selectedCategory.id)
  }

  if (view === 'categories') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg mb-4 text-slate-800">Buat Kategori Baru</h3>
          <form onSubmit={handleCreateCategory} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Nama Kategori (Misal: Game PS2)" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="p-3 border rounded-xl bg-slate-50 outline-none" />
            <input placeholder="Email Google Group (Opsional)" value={catForm.email} onChange={e => setCatForm({...catForm, email: e.target.value})} className="p-3 border rounded-xl bg-slate-50 outline-none" />
            
            <div className="md:col-span-2 border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center cursor-pointer hover:bg-slate-50 relative">
                <input type="file" accept=".html" onChange={e => setCatFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="flex items-center space-x-2 text-slate-500">
                    <UploadCloud size={20} />
                    <span>{catFile ? catFile.name : 'Upload Template HTML Kategori (Opsional)'}</span>
                </div>
            </div>
            
            <button type="submit" className="md:col-span-2 bg-slate-900 text-white p-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">SIMPAN KATEGORI</button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(cat => (
            <div key={cat.id} onClick={() => { setSelectedCategory(cat); setView('items'); fetchItems(cat.id) }} 
                 className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 cursor-pointer transition-all shadow-sm hover:shadow-md relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Folder size={24} />
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }} className="p-2 text-red-300 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">{cat.name}</h3>
              <p className="text-xs text-slate-500 truncate">{cat.group_email || 'Tanpa Grup'}</p>
              <div className="mt-4 flex items-center text-xs font-medium text-slate-400">
                <FileCode size={14} className="mr-1" />
                {cat.template_url ? 'Template Aktif' : 'Default'}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
      <button onClick={() => setView('categories')} className="flex items-center text-slate-500 hover:text-slate-900 font-medium transition-colors">
        <ArrowLeft size={20} className="mr-2" /> Kembali ke Kategori
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">{selectedCategory.name}</h2>
            <p className="text-slate-500 text-sm">Kelola daftar link untuk kategori ini.</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold">
            ID Kategori: {selectedCategory.id}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Tambah Link Item</h3>
        <form onSubmit={handleCreateItem} className="space-y-4">
            <input required placeholder="Nama Item (Misal: God of War II)" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50 outline-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <LinkIcon size={18} className="absolute left-3 top-3.5 text-slate-400" />
                    <input placeholder="Link Server Utama (Opsional)" value={itemForm.main_url} onChange={e => setItemForm({...itemForm, main_url: e.target.value})} className="w-full pl-10 p-3 border rounded-xl bg-slate-50 outline-none" />
                </div>
                <div className="relative">
                    <HardDrive size={18} className="absolute left-3 top-3.5 text-slate-400" />
                    <input placeholder="Link Google Drive (Opsional)" value={itemForm.drive_url} onChange={e => setItemForm({...itemForm, drive_url: e.target.value})} className="w-full pl-10 p-3 border rounded-xl bg-slate-50 outline-none" />
                </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors">TAMBAH ITEM</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
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
                              <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}