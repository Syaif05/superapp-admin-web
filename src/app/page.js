'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import DashboardView from '@/components/DashboardView'
import ProductListView from '@/components/ProductListView'
import AddProductForm from '@/components/AddProductForm'
import { History } from 'lucide-react'

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

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'products' && 'Manajemen Produk'}
              {activeTab === 'add_new' && 'Tambah Produk Baru'}
            </h2>
            <p className="text-slate-500 mt-1">Control Tower SuperApp</p>
          </div>
          <button onClick={fetchData} className="p-3 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 hover:text-blue-600 hover:shadow-md transition-all">
            <History size={20} />
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView products={products} histories={histories} />}
            {activeTab === 'products' && (
              <ProductListView 
                products={products} 
                onDelete={handleDelete} 
                onAddNew={() => setActiveTab('add_new')} 
              />
            )}
            {activeTab === 'add_new' && (
              <AddProductForm onSuccess={() => {
                fetchData()
                setActiveTab('products')
              }} />
            )}
          </>
        )}
      </main>
    </div>
  )
}