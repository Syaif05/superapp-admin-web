import { Package, CheckCircle, TrendingUp } from 'lucide-react'

export default function DashboardView({ products, histories }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <p className="text-sm font-medium text-slate-500">Status Server</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">Online</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <TrendingUp className="text-slate-500" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Riwayat Pengiriman Terbaru</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-semibold">Tanggal</th>
                <th className="p-4 font-semibold">Email Pembeli</th>
                <th className="p-4 font-semibold">Produk</th>
                <th className="p-4 font-semibold">ID Transaksi</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {histories.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-slate-500">{new Date(h.created_at).toLocaleDateString()}</td>
                  <td className="p-4 font-medium text-slate-900">{h.buyer_email}</td>
                  <td className="p-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{h.product_name}</span></td>
                  <td className="p-4 font-mono text-slate-400">{h.generated_id}</td>
                  <td className="p-4"><span className="text-emerald-600 font-medium text-xs">Sukses</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}