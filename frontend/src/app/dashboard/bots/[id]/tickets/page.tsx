"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Package, MessageSquare, ExternalLink, Calendar, AlertCircle } from "lucide-react"

interface Ticket {
  id: number
  order_number?: string
  product_name?: string
  damage_summary?: string
  platform: string
  contact_id?: string
  status: string
  created_at: string
}

export default function BotTicketsPage() {
  const params = useParams()
  const botId = params.id as string
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const data = await api.get<Ticket[]>(`/api/bots/${botId}/tickets`)
        setTickets(data)
      } catch (error) {
        console.error("Müşteri destek talepleri getirilirken hata:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [botId])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Destek Talepleri (Tickets)</h1>
          <p className="text-muted-foreground mt-2">
            Müşterilerin formlar veya sohbetler aracılığıyla ilettiği hasarlı/eksik ürün raporları burada listelenir.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Sipariş No</TableHead>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Sorun Özeti</TableHead>
                <TableHead>Platform / Kullanıcı</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mb-2" />
                      <p>Henüz hiçbir destek talebi/rapor oluşturulmamış.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="whitespace-nowrap">
                      {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString("tr-TR") : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ticket.order_number || "-"}
                    </TableCell>
                    <TableCell>
                      {ticket.product_name || "-"}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {ticket.damage_summary || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {ticket.platform === "whatsapp" ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            WhatsApp
                          </Badge>
                        ) : ticket.platform === "web" ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                            Web Form
                          </Badge>
                        ) : (
                          <Badge variant="outline">{ticket.platform}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {ticket.contact_id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant={
                          ticket.status === 'resolved' ? "success" : 
                          ticket.status === 'in_progress' ? "default" : "secondary"
                       }>
                          {ticket.status === 'resolved' ? "Çözüldü" : 
                           ticket.status === 'in_progress' ? "İnceleniyor" : "Yeni"}
                       </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
