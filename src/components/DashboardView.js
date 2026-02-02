import { useState } from 'react'
import { Package, CheckCircle, TrendingUp, Trash2, X, AlertTriangle } from 'lucide-react'

export default function DashboardView({ products, histories, onDeleteHistory }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [inputCode, setInputCode] = useState('')

  const openDeleteModal = (id) => {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    setVerifyCode(code)
    setInputCode('')
    setSelectedId(id)
    setIsModalOpen(true)
  }

  const confirmDelete = () => {
    if (inputCode === verifyCode) {
      onDeleteHistory(selectedId)
      setIsModalOpen(false)
    } else {
      alert("Kode verifikasi salah!")
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* Grid: 1 kolom di HP, 3 di Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Produk</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{products.length}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <Package className="text-blue-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Terkirim</p>
            <p className="text-3xl font-bold text-slate-800 mt-1">{histories.length}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle className="text-emerald-500" size={24} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Server Status</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">Online</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <TrendingUp className="text-slate-500" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="font-bold text-lg text-slate-800">Riwayat Terakhir</h3>
        </div>
        {/* Wrapper agar tabel bisa digeser di HP */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-semibold">Tanggal</th>
                <th className="p-4 font-semibold">Email Pembeli</th>
                <th className="p-4 font-semibold">Produk</th>
                <th className="p-4 font-semibold">ID</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {histories.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-slate-500 bg-white sticky left-0 md:bg-transparent">{new Date(h.created_at).toLocaleDateString()}</td>
                  <td className="p-4 font-medium text-slate-900">{h.buyer_email}</td>
                  <td className="p-4"><span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 max-w-[200px] truncate" title={h.product_name}>{h.product_name}</span></td>
                  <td className="p-4 font-mono text-slate-400 text-xs">{h.generated_id}</td>
                  <td className="p-4"><span className="text-emerald-600 font-bold text-xs">SUKSES</span></td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => openDeleteModal(h.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-100 rounded-full text-red-600">
                <AlertTriangle size={24} />
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Riwayat?</h3>
            <p className="text-slate-500 text-sm mb-4">
              Tindakan ini tidak bisa dibatalkan. Masukkan kode verifikasi di bawah untuk melanjutkan.
            </p>

            <div className="bg-slate-100 p-4 rounded-xl text-center mb-4">
              <span className="text-2xl font-mono font-bold tracking-widest text-slate-800 select-all">
                {verifyCode}
              </span>
              <p className="text-xs text-slate-400 mt-1">Kode Verifikasi</p>
            </div>

            <input 
              type="text" 
              placeholder="Masukkan 4 angka di atas"
              className="w-full p-3 border border-slate-200 rounded-xl mb-4 text-center font-mono focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              maxLength={4}
            />

            <div className="flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={confirmDelete}
                disabled={inputCode !== verifyCode}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}