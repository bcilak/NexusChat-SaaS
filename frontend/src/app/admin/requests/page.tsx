"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";

const formatDate = (dateStr: string) => {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateStr));
};

interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  request_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<ContactRequest | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchRequests = async () => {
    try {
      const data = await apiFetch("/api/contact/admin");
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (status: string) => {
    if (!selectedReq) return;
    setUpdating(true);
    try {
      const updated = await apiFetch(`/api/contact/admin/${selectedReq.id}`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelectedReq(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Demo ve İletişim Talepleri</h1>
      </div>

      <div className="bg-[#1f1f38] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#2a2a4a] text-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">Firma</th>
                <th className="px-4 py-3 font-medium">Paket</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white">{req.name}</td>
                  <td className="px-4 py-3">{req.company || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">
                      {req.request_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${req.status === 'bekliyor' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-400'}`}>
                      {req.status === 'bekliyor' ? 'Bekliyor' : 'Dönüş Yapıldı'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(req.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedReq(req)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md transition-colors"
                    >
                      Detay
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Henüz talep bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedReq} onOpenChange={(open) => !open && setSelectedReq(null)}>
        <DialogContent className="sm:max-w-[500px] bg-[#1f1f38] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Talep Detayı</DialogTitle>
          </DialogHeader>
          
          {selectedReq && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400 block text-xs">Ad Soyad</span>
                  <span className="font-medium">{selectedReq.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Firma</span>
                  <span className="font-medium">{selectedReq.company || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">E-posta</span>
                  <span className="font-medium">{selectedReq.email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Telefon</span>
                  <span className="font-medium">{selectedReq.phone || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Talep Türü</span>
                  <span className="font-medium text-indigo-400">{selectedReq.request_type}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Tarih</span>
                  <span className="font-medium">{formatDate(selectedReq.created_at)}</span>
                </div>
              </div>
              
              <div>
                <span className="text-gray-400 block text-xs mb-1">Mesaj</span>
                <div className="bg-black/30 p-3 rounded-md text-sm whitespace-pre-wrap">
                  {selectedReq.message || <span className="text-gray-500 italic">Mesaj girilmemiş.</span>}
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 mt-6">
                <span className="text-gray-400 block text-xs mb-2">Durum Güncelle</span>
                <div className="flex gap-2">
                  <button
                    disabled={updating || selectedReq.status === 'bekliyor'}
                    onClick={() => updateStatus('bekliyor')}
                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${selectedReq.status === 'bekliyor' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                  >
                    Bekliyor
                  </button>
                  <button
                    disabled={updating || selectedReq.status === 'donus_yapildi'}
                    onClick={() => updateStatus('donus_yapildi')}
                    className={`flex-1 py-2 text-sm rounded-md transition-colors ${selectedReq.status === 'donus_yapildi' ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-white/5 hover:bg-white/10 text-gray-300'}`}
                  >
                    Dönüş Yapıldı
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}