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
  const [preselectedType, setPreselectedType] = useState('manual') // For AddProductForm

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

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    // Jika klik sidebar "Tambah Produk", reset tipe agar user bisa pilih
    if (tab === 'add_new') {
      setPreselectedType(null) 
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
      
      {/* MAIN CONTENT */}
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 transition-all duration-300">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'products_manual' && 'Produk Satuan'}
              {activeTab === 'products_account' && 'Produk Akun'}
              {activeTab === 'links' && 'Produk Link'} 
              {activeTab === 'add_new' && 'Tambah Produk'}
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
            
            {activeTab === 'products_manual' && (
              <ProductListView 
                products={products.filter(p => p.product_type === 'manual')} 
                onDelete={handleDelete} 
                onAddNew={() => {
                   setPreselectedType('manual')
                   setActiveTab('add_new')
                }}
              />
            )}

            {activeTab === 'products_account' && (
              <ProductListView 
                products={products.filter(p => p.product_type === 'account')} 
                onDelete={handleDelete} 
                onAddNew={() => {
                   setPreselectedType('account')
                   setActiveTab('add_new')
                }}
              />
            )}
            
            {activeTab === 'links' && <LinkManager />}

            {activeTab === 'add_new' && (
              <AddProductForm 
                initialType={preselectedType}
                onSuccess={() => {
                  fetchData()
                  // Redirect back to appropriate tab based on type
                  if (preselectedType === 'account') setActiveTab('products_account')
                  else if (preselectedType === 'manual') setActiveTab('products_manual')
                  else setActiveTab('dashboard')
                }} 
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}