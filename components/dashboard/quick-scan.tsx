'use client'

import { organizeEmails } from "@/actions/organize"
import { Button } from "@/components/ui/button"
import { Loader2, Play } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function QuickScan() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState("")
    const [folder, setFolder] = useState('inbox')
    const [count, setCount] = useState(100)
    const [deepScan, setDeepScan] = useState(false)

    const handleScan = async () => {
        setLoading(true)
        setStatus("Scanning...")
        let totalScanned = 0
        let totalMoved = 0
        let nextLink: string | undefined = undefined

        try {
            // If Deep Scan is unchecked, loop just once (or use default logic if we wanted single batch)
            // But simplify: always loop at least once. 
            // If deepScan is true, loop while nextLink exists AND limit < 10000.

            do {
                if (deepScan) {
                    setStatus(`Scanning... (${totalScanned} emails)`)
                } else {
                    setStatus("Scanning batch...")
                }

                // Call server action
                const result: any = await organizeEmails(folder, count, nextLink)

                if (!result.success) {
                    toast.error(result.message)
                    break
                }

                totalScanned += result.scanned
                totalMoved += result.moved
                nextLink = result.nextLink

                // If NOT deep scan, break immediately after first batch
                if (!deepScan) break

            } while (nextLink && totalScanned < 10000)

            toast.success(`Completed: Scanned ${totalScanned}, Moved ${totalMoved}`)
            setTimeout(() => window.location.reload(), 2000)

        } catch (e) {
            toast.error("Failed to run scan")
            console.error(e)
        } finally {
            setLoading(false)
            setStatus("")
        }
    }

    return (
        <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg">
            <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <option value="inbox">Inbox</option>
                <option value="archive">Archive</option>
                <option value="sentitems">Sent Items</option>
            </select>

            <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <option value={100}>100 / batch</option>
                <option value={500}>500 / batch</option>
                <option value={1000}>1000 / batch</option>
            </select>

            <div className="flex items-center space-x-2 px-2">
                <input
                    type="checkbox"
                    id="deepScan"
                    checked={deepScan}
                    onChange={(e) => setDeepScan(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="deepScan" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    Scan All (Deep)
                </label>
            </div>

            <Button onClick={handleScan} disabled={loading} size="sm" className="gap-2 min-w-[120px]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? (status || "Running...") : "Run Scan"}
            </Button>
        </div>
    )
}
