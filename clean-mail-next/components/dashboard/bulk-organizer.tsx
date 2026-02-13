'use client'

import { moveBatch, scanBatch } from "@/actions/scan"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Play, RefreshCw, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

type Match = {
    id: string
    subject: string
    sender: string
    receivedDateTime: string
    matchedRule: string
    targetFolder: string
}

export function BulkOrganizer() {
    const [matches, setMatches] = useState<Match[]>([])
    const [selected, setSelected] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [status, setStatus] = useState("")

    // Filters
    const [filterYear, setFilterYear] = useState(2025)

    const handleScan = async () => {
        setScanning(true)
        setMatches([])
        setSelected([])
        setStatus("Starting scan...")

        try {
            let nextLink = undefined
            let page = 0

            // Loop!
            while (true) {
                setStatus(`Scanning page ${page + 1}... (Found ${matches.length})`)
                const res: any = await scanBatch('inbox', nextLink, filterYear)
                // Note: user requested 'Archive' or 'Inbox' - need input?
                // Let's hardcode to Inbox + Archive later or add select?
                // Add select below.

                if (!res.success) {
                    toast.error(res.message)
                    break
                }

                if (res.matches && res.matches.length > 0) {
                    setMatches(prev => [...prev, ...res.matches])
                }

                if (res.stop || !res.nextLink) {
                    setStatus("Scan complete.")
                    break
                }

                nextLink = res.nextLink
                page++

                // Safety break
                if (page > 100) break
            }
        } catch (e) {
            console.error(e)
            toast.error("Scan failed")
        } finally {
            setScanning(false)
        }
    }

    const handleMove = async () => {
        if (selected.length === 0) return
        setLoading(true)

        // Group by target folder effectively?
        // For MVP, assume one target (VCBANK) or handle one by one?
        // moveBatch handles one target folder string. matches have targetFolder.
        // We must group selected by targetFolder.

        const groups: Record<string, string[]> = {}
        for (const id of selected) {
            const m = matches.find(x => x.id === id)
            if (m) {
                if (!groups[m.targetFolder]) groups[m.targetFolder] = []
                groups[m.targetFolder].push(id)
            }
        }

        let totalMoved = 0
        for (const target of Object.keys(groups)) {
            const ids = groups[target]
            setStatus(`Moving ${ids.length} to ${target}...`)
            const res = await moveBatch(ids, target)
            if (res.success) totalMoved += res.moved
            else toast.error(`Failed to move to ${target}: ${res.message}`)
        }

        toast.success(`Moved ${totalMoved} emails!`)

        // Remove moved from list
        setMatches(prev => prev.filter(m => !selected.includes(m.id)))
        setSelected([])
        setLoading(false)
        setStatus("")
    }

    const toggleAll = (checked: boolean) => {
        if (checked) setSelected(matches.map(m => m.id))
        else setSelected([])
    }

    const toggleOne = (id: string, checked: boolean) => {
        if (checked) setSelected(prev => [...prev, id])
        else setSelected(prev => prev.filter(x => x !== id))
    }

    const [sourceFolder, setSourceFolder] = useState('inbox')

    // Modified Scan to use sourceFolder
    const runScan = async () => {
        setScanning(true)
        setMatches([]) // Reset UI
        // But maybe we want append? 
        // Reset for now.
        setStatus("Initializing...")

        let nextLink = undefined
        let totalFound = 0

        try {
            while (true) {
                const res: any = await scanBatch(sourceFolder, nextLink, filterYear)

                if (!res.success) {
                    toast.error(res.message); break
                }

                if (res.matches.length > 0) {
                    setMatches(prev => {
                        const next = [...prev, ...res.matches]
                        totalFound = next.length
                        return next
                    })
                }

                setStatus(`Scanning... Found ${totalFound} matches`)

                if (res.stop || !res.nextLink) break
                nextLink = res.nextLink

                // Small delay to be nice to API
                // await new Promise(r => setTimeout(r, 100))
            }
            setStatus("Scan finished.")
        } catch (e) {
            toast.error("Error scanning")
        } finally {
            setScanning(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Folder</label>
                    <select
                        value={sourceFolder}
                        onChange={(e) => setSourceFolder(e.target.value)}
                        className="h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value="inbox">Inbox</option>
                        <option value="archive">Archive</option>
                        <option value="sentitems">Sent Items</option>
                    </select>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Year Limit</label>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(Number(e.target.value))}
                        className="h-10 w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value={2026}>2026</option>
                        <option value={2025}>2025</option>
                        <option value={2024}>2024</option>
                    </select>
                </div>

                <div className="flex-1"></div>

                <Button onClick={runScan} disabled={scanning || loading} className="gap-2">
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {scanning ? "Scanning..." : "Scan Matches"}
                </Button>
            </div>

            {status && <div className="text-sm text-muted-foreground animate-pulse">{status}</div>}

            {matches.length > 0 && (
                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="p-4 border-b flex justify-between items-center">
                        <div className="font-medium">{matches.length} Emails Found</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelected([])} disabled={loading}>Clear Selection</Button>
                            <Button onClick={handleMove} disabled={selected.length === 0 || loading} className="gap-2">
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Move Selected ({selected.length})
                            </Button>
                        </div>
                    </div>
                    <div className="max-h-[600px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={matches.length > 0 && selected.length === matches.length}
                                            onCheckedChange={(c) => toggleAll(!!c)}
                                        />
                                    </TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Sender</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Target</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {matches.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selected.includes(m.id)}
                                                onCheckedChange={(c) => toggleOne(m.id, !!c)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-xs whitespace-nowrap">
                                            {new Date(m.receivedDateTime).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-xs max-w-[150px] truncate" title={m.sender}>
                                            {m.sender}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium max-w-[300px] truncate" title={m.subject}>
                                            {m.subject}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                {m.targetFolder}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {!scanning && matches.length === 0 && (
                <div className="text-center py-20 text-muted-foreground border rounded-lg border-dashed">
                    No matches found. Try adjusting filters or source folder.
                </div>
            )}
        </div>
    )
}
