"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ticketsApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Package, MessageSquare, ExternalLink, Calendar, AlertCircle, MessageCircle, Globe } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
    const [statusUpdate, setStatusUpdate] = useState<string>("")
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const data = await ticketsApi.getTickets(Number(botId))
                setTickets(data)
            } catch (error) {
                console.error("Müşteri destek talepleri getirilirken hata:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchTickets()
    }, [botId])

    const handleUpdateStatus = async () => {
        if (!selectedTicket || !statusUpdate) return
        setUpdating(true)
        try {
            await ticketsApi.updateTicketStatus(Number(botId), selectedTicket.id, statusUpdate)
            setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: statusUpdate } : t))
            setSelectedTicket(null)
        } catch (error) {
            console.error("Durum güncellenirken hata:", error)
        } finally {
            setUpdating(false)
        }
    }

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
                                    <TableRow 
                                        key={ticket.id} 
                                        className="cursor-pointer hover:bg-muted/50" 
                                        onClick={() => {
                                            setSelectedTicket(ticket)
                                            setStatusUpdate(ticket.status)
                                        }}
                                    >
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
                                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-1">
                                                        <MessageCircle className="w-3 h-3" /> WhatsApp
                                                    </Badge>
                                                ) : ticket.platform === "web" ? (
                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1">
                                                        <Globe className="w-3 h-3" /> Web Form
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
                                            <Badge variant={ticket.status === 'resolved' ? "default" : ticket.status === 'in_progress' ? "default" : "secondary"} className={ticket.status === 'resolved' ? "bg-green-500 hover:bg-green-600" : ""}>
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

            <Dialog open={!!selectedTicket} onOpenChange={(open: boolean) => !open && setSelectedTicket(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Destek Talebi Detayı</DialogTitle>
                        <DialogDescription>
                            Talebe ait detayları buradan görüntüleyebilir ve durumu güncelleyebilirsiniz.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedTicket && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">İletişim / Kullanıcı ID</p>
                                    <p className="text-sm font-semibold">{selectedTicket.contact_id}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Tarih</p>
                                    <p className="text-sm font-semibold">{selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString("tr-TR") : "-"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Sipariş Numarası</p>
                                    <p className="text-sm font-semibold">{selectedTicket.order_number || "Belirtilmemiş"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Ürün Adı</p>
                                    <p className="text-sm font-semibold">{selectedTicket.product_name || "Belirtilmemiş"}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-1 bg-muted/50 p-4 rounded-lg border">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Sorun Özeti</p>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket.damage_summary || "Belirtilmemiş"}</p>
                            </div>

                            <div className="space-y-1 pt-4">
                                <p className="text-sm font-medium">Bilet Durumu</p>
                                <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Yeni (Açık)</SelectItem>
                                        <SelectItem value="in_progress">İnceleniyor</SelectItem>
                                        <SelectItem value="resolved">Çözüldü / Dönüş Yapıldı</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedTicket(null)}>Kapat</Button>
                        <Button onClick={handleUpdateStatus} disabled={updating}>
                            {updating ? "Güncelleniyor..." : "Durumu Güncelle"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
