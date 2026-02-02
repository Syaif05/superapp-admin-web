'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import DashboardView from '@/components/DashboardView'
import ProductListView from '@/components/ProductListView'
import AddProductForm from '@/components/AddProductForm'
import LinkManager from '@/components/LinkManager'
import { History, RefreshCw } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [histories, setHistories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: prodData } = await supabase.from('products').select('*').order('id', { ascending: true })
    const { data: histData } = await supabase.from('history').select('*').order('created_at', { ascending: false }).limit(20)
    
    if (prodData) setProducts(prodData)
    if (histData) setHistories(histData)
    setLoading(false)
  }

  async function handleDelete(id) {
    if(!confirm('Yakin ingin menghapus produk ini?')) return
    await supabase.from('products').delete().eq('id', id)
    fetchData()
  }

  async function handleDeleteHistory(id) {
    const { error } = await supabase.from('history').delete().eq('id', id)
    if (error) {
      alert('Gagal hapus history: ' + error.message)
    } else {
      fetchData()
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* MAIN CONTENT: Margin kiri hilang di mobile (ml-0), ada di desktop (md:ml-64) */}
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 transition-all duration-300">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'products' && 'Produk Satuan'}
              {activeTab === 'links' && 'Produk Link'} 
              {activeTab === 'add_new' && 'Tambah Baru'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">Control Tower SuperApp</p>
          </div>
          <button 
            onClick={fetchData} 
            className="flex items-center justify-center p-3 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 hover:text-blue-600 hover:shadow-md transition-all active:scale-95"
          >
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <History size={20} />}
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'dashboard' && (
               <DashboardView 
                 products={products} 
                 histories={histories} 
                 onDeleteHistory={handleDeleteHistory}
               />
            )}
            
            {activeTab === 'products' && (
              <ProductListView 
                products={products} 
                onDelete={handleDelete} 
                onAddNew={() => setActiveTab('add_new')} 
              />
            )}
            
            {activeTab === 'links' && <LinkManager />}

            {activeTab === 'add_new' && (
              <AddProductForm onSuccess={() => {
                fetchData()
                setActiveTab('products')
              }} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}