'use client'
import { useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'

export default function ImportCSV() {
  const [data, setData] = useState([])
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        // Filter data kosong
        const validData = results.data.filter(row => row.name && row.price)
        setData(validData)
      }
    })
  }

  const processUpload = async () => {
    setUploading(true)
    // Sesuaikan nama kolom dengan database Anda
    const { error } = await supabase.from('link_items').insert(
        data.map(item => ({
            name: item.name,
            price: parseInt(item.price),
            description: item.description,
            drive_url: item.drive_url, // Kolom di CSV harus 'drive_url'
            image_url: item.image_url,
            is_active: true
        }))
    )

    setUploading(false)
    if (!error) {
        alert(`Sukses import ${data.length} item!`)
        setData([])
    } else {
        alert('Gagal import: ' + error.message)
    }
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🚀 Import Link Item Masal</h1>
        
        <div className="bg-white p-6 rounded shadow mb-6">
            <p className="mb-2 font-bold">1. Siapkan file CSV dengan header:</p>
            <code className="block bg-gray-100 p-3 rounded mb-4">name, price, description, drive_url, image_url</code>
            
            <p className="mb-2 font-bold">2. Upload File:</p>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100
            "/>
        </div>

        {data.length > 0 && (
            <div>
                <h3 className="font-bold mb-2">Preview Data ({data.length} items):</h3>
                <div className="overflow-x-auto mb-4 border rounded">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">Price</th>
                                <th className="p-2">Drive URL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice(0, 5).map((row, i) => (
                                <tr key={i} className="border-b">
                                    <td className="p-2">{row.name}</td>
                                    <td className="p-2">{row.price}</td>
                                    <td className="p-2 text-blue-500 truncate max-w-xs">{row.drive_url}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.length > 5 && <p className="p-2 text-center text-gray-500">...dan {data.length - 5} lainnya</p>}
                </div>

                <button 
                    onClick={processUpload} 
                    disabled={uploading}
                    className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {uploading ? 'Sedang Memproses...' : `🚀 EKSEKUSI IMPORT (${data.length} DATA)`}
                </button>
            </div>
        )}
    </div>
  )
}