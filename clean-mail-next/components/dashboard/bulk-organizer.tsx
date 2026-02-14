'use client'

import { moveBatch, moveFromTestFolder, scanBatch, getRules } from "@/actions/scan"
import { setupMailFolders } from "@/actions/setup-folders"
import { listMailFolders } from "@/actions/list-folders"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, RefreshCw, Trash2, X, FolderPlus, FolderOpen } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { MultiSelect } from "@/components/ui/multi-select"

type Match = {
    id: string
    subject: string
    sender: string
    receivedDateTime: string
    parentFolderId?: string
    matchedRule: string
    targetFolder: string
    ruleCategories?: string[]
    messageCategories?: string[]
}

export function BulkOrganizer() {
    const TEST_FOLDER = "CleanMail_Test"
    const [matches, setMatches] = useState<Match[]>([])
    const [selected, setSelected] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [setupLoading, setSetupLoading] = useState(false)
    const [testMoveLoading, setTestMoveLoading] = useState(false)
    const [status, setStatus] = useState("")
    const [testMode, setTestMode] = useState(true)
    const [totalScanned, setTotalScanned] = useState(0)

    // Rules selector state
    const [availableRules, setAvailableRules] = useState<any[]>([])
    const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([])
    const [rulesLoading, setRulesLoading] = useState(true)

    // Move dialog state
    const [moveDialogOpen, setMoveDialogOpen] = useState(false)
    const [categoryOverride, setCategoryOverride] = useState<string[]>([])
    const [targetFolderOverride, setTargetFolderOverride] = useState("")
    const [applyTagsOnly, setApplyTagsOnly] = useState(false)
    const [tagMode, setTagMode] = useState<'replace' | 'add' | 'remove'>('replace')
    const [folderPickerOpen, setFolderPickerOpen] = useState(false)
    const [availableFolders, setAvailableFolders] = useState<any[]>([])
    const [folderSearchQuery, setFolderSearchQuery] = useState("")
    const [newFolderPath, setNewFolderPath] = useState("")
    const [tagInput, setTagInput] = useState("")
    const categoryInputRef = useRef<HTMLInputElement>(null)
    const [availableCategories, setAvailableCategories] = useState<string[]>([
        "Cashback",
        "Cashback_DigiCard",
        "Cashback_Signature",
        "Transaction Notification",
        "Statement",
        "Marketing",
        "OTP",
        "Balance"
    ])

    // Filters
    const currentYear = new Date().getFullYear()
    const prevYear = currentYear - 1
    const prev2Year = currentYear - 2
    const prev3Year = currentYear - 3
    const [additionalYear, setAdditionalYear] = useState(prevYear) // default include prev + current

    // Load folders when dialog opens
    useEffect(() => {
        if (moveDialogOpen && availableFolders.length === 0) {
            listMailFolders().then((res) => {
                if (res.success && res.folders) {
                    setAvailableFolders(res.folders)
                }
            })
        }
    }, [moveDialogOpen, availableFolders.length])

    // Load available rules on mount
    useEffect(() => {
        getRules().then((res) => {
            if (res.success && res.rules) {
                setAvailableRules(res.rules)
                // Pre-select all active rules by default
                const activeRuleIds = res.rules
                    .filter((r: any) => r.is_active !== false)
                    .map((r: any) => r.id)
                setSelectedRuleIds(activeRuleIds)
            }
            setRulesLoading(false)
        })
    }, [])

    const handleSetupFolders = async () => {
        setSetupLoading(true)
        const res = await setupMailFolders()
        if (res.success) {
            toast.success("Folder structure created!")
            console.log(res.created)
        } else {
            toast.error(res.message)
        }
        setSetupLoading(false)
    }

    const handleMoveFromTest = async () => {
        setTestMoveLoading(true)
        const fromYear = additionalYear === -1 ? 0 : (additionalYear > 0 ? additionalYear : currentYear)
        const res: any = await moveFromTestFolder(fromYear)
        if (res.success) {
            toast.success(`Moved ${res.moved} from test (${res.failed} failed)`)
        } else {
            toast.error(res.message || "Test move failed")
        }
        setTestMoveLoading(false)
    }

    const handleScan = async () => {
        // Pass selectedRuleIds to scan
        if (selectedRuleIds.length === 0) {
            toast.error("Please select at least one rule to scan")
            return
        }

        setScanning(true)
        setMatches([])
        setSelected([])
        setStatus("Starting scan...")

        try {
            let nextLink = undefined
            let page = 0
            const fromYear = additionalYear === -1 ? 0 : (additionalYear > 0 ? additionalYear : currentYear)

            // Loop!
            while (true) {
                setStatus(`Scanning page ${page + 1}... (Found ${matches.length})`)
                const res: any = await scanBatch('inbox', nextLink, fromYear, selectedRuleIds)

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
        
        // Collect target info from selected matches
        const selectedMatches = matches.filter(m => selected.includes(m.id))
        const firstTarget = testMode ? TEST_FOLDER : selectedMatches[0]?.targetFolder
        const ruleCategories = selectedMatches.flatMap(m => m.ruleCategories || [])
        const mergedCategories = [...new Set([...availableCategories, ...ruleCategories])]

        setTargetFolderOverride(firstTarget || "")
        setCategoryOverride([])
        setApplyTagsOnly(false)
        setTagMode('replace')
        setAvailableCategories(mergedCategories)
        setMoveDialogOpen(true)
    }

    const handleUpdateTags = async () => {
        if (selected.length === 0) return

        const selectedMatches = matches.filter(m => selected.includes(m.id))
        const ruleCategories = selectedMatches.flatMap(m => m.ruleCategories || [])
        const mergedCategories = [...new Set([...availableCategories, ...ruleCategories])]

        setTargetFolderOverride("")
        setCategoryOverride([])
        setApplyTagsOnly(true)
        setTagMode('replace')
        setAvailableCategories(mergedCategories)
        setMoveDialogOpen(true)
    }

    const executeMove = async () => {
        setLoading(true)
        setMoveDialogOpen(false)

        // Group by target folder
        const groups: Record<string, { id: string; parentFolderId?: string; categories?: string[] }[]> = {}
        for (const id of selected) {
            const m = matches.find(x => x.id === id)
            if (m) {
                const destination = applyTagsOnly
                    ? (targetFolderOverride || m.targetFolder)
                    : (targetFolderOverride || (testMode ? TEST_FOLDER : m.targetFolder))
                if (!groups[destination]) groups[destination] = []
                groups[destination].push({ id: m.id, parentFolderId: m.parentFolderId, categories: m.ruleCategories })
            }
        }

        let totalMoved = 0
        for (const target of Object.keys(groups)) {
            const items = groups[target]
            setStatus(`${applyTagsOnly ? 'Updating tags for' : 'Moving'} ${items.length} ${applyTagsOnly ? 'emails' : `to ${target}`}...`)
            const res = await moveBatch(
                items,
                target,
                categoryOverride.length > 0 ? categoryOverride : undefined,
                { 
                    applyTagsOnly, 
                    replaceTags: tagMode === 'replace',
                    removeMode: tagMode === 'remove'
                }
            )
            if (res.success) totalMoved += res.moved ?? items.length
            else toast.error(`Failed to move to ${target}: ${res.message}`)
        }

        toast.success(`${applyTagsOnly ? 'Updated tags for' : 'Moved'} ${totalMoved} emails!`)

        // Remove moved from list
        setMatches(prev => prev.filter(m => !selected.includes(m.id)))
        setSelected([])
        setLoading(false)
        setStatus("")
    }

    const handleAddTag = () => {
        const trimmed = tagInput.trim()
        if (trimmed && !categoryOverride.includes(trimmed)) {
            setCategoryOverride([...categoryOverride, trimmed])
            setTagInput("")
            categoryInputRef.current?.focus()
        }
    }

    const handleRemoveTag = (tag: string) => {
        setCategoryOverride(categoryOverride.filter(t => t !== tag))
    }

    const handleSelectFolder = (path: string) => {
        setTargetFolderOverride(path)
        setFolderPickerOpen(false)
        setFolderSearchQuery("")
    }

    const handleCreateNewFolder = () => {
        const trimmed = newFolderPath.trim()
        if (trimmed) {
            setTargetFolderOverride(trimmed)
            setNewFolderPath("")
            setFolderPickerOpen(false)
        }
    }

    const filterFolders = (folders: any[], query: string): any[] => {
        if (!query) return folders
        const lowerQuery = query.toLowerCase()
        return folders.reduce((acc: any[], folder) => {
            const matchesName = folder.name.toLowerCase().includes(lowerQuery)
            const matchesPath = folder.path.toLowerCase().includes(lowerQuery)
            const filteredChildren = folder.children ? filterFolders(folder.children, query) : []
            
            if (matchesName || matchesPath || filteredChildren.length > 0) {
                acc.push({
                    ...folder,
                    children: filteredChildren
                })
            }
            return acc
        }, [])
    }

    const renderFolderTree = (folders: any[], depth = 0) => {
        return folders.map((folder) => (
            <div key={folder.id} style={{ marginLeft: depth * 12 }}>
                <div
                    className="px-2 py-1 hover:bg-accent rounded cursor-pointer text-sm flex items-center gap-1"
                    onClick={() => handleSelectFolder(folder.path)}
                >
                    <FolderOpen className="w-3 h-3" />
                    {folder.name}
                </div>
                {folder.children && folder.children.length > 0 && (
                    <div>
                        {renderFolderTree(folder.children, depth + 1)}
                    </div>
                )}
            </div>
        ))
    }

    const toggleAll = (checked: boolean) => {
        if (checked) setSelected(matches.map(m => m.id))
        else setSelected([])
    }

    const toggleOne = (id: string, checked: boolean) => {
        if (checked) setSelected(prev => [...prev, id])
        else setSelected(prev => prev.filter(x => x !== id))
    }

    const [sourceFolder, setSourceFolder] = useState('all')

    // Modified Scan to use sourceFolder
    const runScan = async () => {
        // Check if rules selected
        if (selectedRuleIds.length === 0) {
            toast.error("Please select at least one rule to scan")
            return
        }

        setScanning(true)
        setMatches([]) // Reset UI
        setTotalScanned(0)
        setStatus("Initializing...")

        let nextLink = undefined
        let totalFound = 0
        const fromYear = additionalYear === -1 ? 0 : (additionalYear > 0 ? additionalYear : currentYear)

        try {
            while (true) {
                const res: any = await scanBatch(sourceFolder, nextLink, fromYear, selectedRuleIds)

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

                if (typeof res.scanned === "number") {
                    setTotalScanned(prev => prev + res.scanned)
                }

                const lastDate = res.batchLastDate ? new Date(res.batchLastDate).toLocaleString() : ""
                setStatus(`Scanning... Scanned ${totalScanned + (res.scanned || 0)}, Found ${totalFound}${lastDate ? `, Last: ${lastDate}` : ""}`)

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
                        <option value="all">All Mail</option>
                        <option value="inbox">Inbox</option>
                        <option value="archive">Archive</option>
                        <option value="sentitems">Sent Items</option>
                    </select>
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Additional Filter</label>
                    <select
                        value={additionalYear}
                        onChange={(e) => setAdditionalYear(Number(e.target.value))}
                        className="h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                        <option value={-1}>All years</option>
                        <option value={0}>Current year only ({currentYear})</option>
                        <option value={prevYear}>+ Include {prevYear} ({prevYear}-{currentYear})</option>
                        <option value={prev2Year}>+ Include {prev2Year} ({prev2Year}-{currentYear})</option>
                        <option value={prev3Year}>+ Include {prev3Year} ({prev3Year}-{currentYear})</option>
                    </select>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <Switch checked={testMode} onCheckedChange={setTestMode} />
                    <span className="text-muted-foreground">Test mode: move to {TEST_FOLDER}</span>
                </div>

                <div className="flex-1"></div>

                <Button onClick={handleSetupFolders} disabled={setupLoading} variant="outline" className="gap-2">
                    {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                    Setup Folders
                </Button>

                <Button onClick={handleMoveFromTest} disabled={testMoveLoading || scanning || loading} variant="outline" className="gap-2">
                    {testMoveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Move From Test
                </Button>

                <Button onClick={runScan} disabled={scanning || loading} className="gap-2">
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {scanning ? "Scanning..." : "Scan Matches"}
                </Button>
            </div>

            {status && <div className="text-sm text-muted-foreground animate-pulse">{status}</div>}

            {/* Rule Selector */}
            {availableRules.length > 0 && (
                <div className="bg-card rounded-lg border shadow-sm p-4">
                    <div className="text-sm font-medium mb-3">Select Rules to Scan</div>
                    {rulesLoading ? (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading rules...
                        </div>
                    ) : (
                        <MultiSelect
                            options={availableRules.map((rule: any) => ({
                                id: rule.id,
                                name: rule.name
                            }))}
                            selected={selectedRuleIds}
                            onChange={setSelectedRuleIds}
                            placeholder="Select rules to scan..."
                            className="max-w-full"
                        />
                    )}
                </div>
            )}

            {matches.length > 0 && (
                <div className="bg-card rounded-lg border shadow-sm">
                    <div className="p-4 border-b flex justify-between items-center">
                        <div className="font-medium">{matches.length} Emails Found</div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelected([])} disabled={loading}>Clear Selection</Button>
                            <Button variant="outline" size="sm" onClick={handleUpdateTags} disabled={selected.length === 0 || loading}>
                                Update Tags
                            </Button>
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
                                    <TableHead>Tags</TableHead>
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
                                        <TableCell className="text-xs max-w-[220px] truncate" title={(m.messageCategories || []).join(', ')}>
                                            {(m.messageCategories && m.messageCategories.length > 0)
                                                ? m.messageCategories.join(', ')
                                                : '-'}
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
            <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Review Before Moving</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-2">Target Folder</label>
                            <div className="flex gap-2">
                                <Input
                                    value={targetFolderOverride}
                                    onChange={(e) => setTargetFolderOverride(e.target.value)}
                                    placeholder="e.g., MailOrganized/Cashback/Vietcombank"
                                    disabled={applyTagsOnly}
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setFolderPickerOpen(!folderPickerOpen)}
                                    disabled={applyTagsOnly}
                                >
                                    <FolderOpen className="w-4 h-4" />
                                </Button>
                            </div>
                            {folderPickerOpen && !applyTagsOnly && (
                                <div className="mt-2 border rounded-md bg-popover">
                                    {/* Search */}
                                    <div className="p-2 border-b">
                                        <Input
                                            placeholder="Search folders..."
                                            value={folderSearchQuery}
                                            onChange={(e) => setFolderSearchQuery(e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    
                                    {/* Folder tree */}
                                    <div className="p-2 max-h-48 overflow-auto">
                                        {availableFolders.length > 0 ? (
                                            renderFolderTree(filterFolders(availableFolders, folderSearchQuery))
                                        ) : (
                                            <div className="text-sm text-muted-foreground">Loading folders...</div>
                                        )}
                                    </div>
                                    
                                    {/* Create new folder */}
                                    <div className="p-2 border-t">
                                        <div className="text-xs text-muted-foreground mb-2">Or create new:</div>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="e.g., MailOrganized/NewBank"
                                                value={newFolderPath}
                                                onChange={(e) => setNewFolderPath(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        handleCreateNewFolder()
                                                    }
                                                }}
                                                className="h-8 text-sm"
                                            />
                                            <Button size="sm" variant="outline" onClick={handleCreateNewFolder}>Add</Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium block mb-3">Tag Management</label>
                            
                            {/* Tag Mode Selector */}
                            <div className="space-y-2 mb-4 p-3 bg-muted/50 rounded-lg">
                                <div className="text-xs font-medium text-muted-foreground mb-2">Choose Action:</div>
                                <div className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-background rounded">
                                        <input
                                            type="radio"
                                            name="tagMode"
                                            checked={tagMode === 'replace'}
                                            onChange={() => setTagMode('replace')}
                                            className="w-4 h-4"
                                        />
                                        <div>
                                            <div className="font-medium">Replace Tags</div>
                                            <div className="text-xs text-muted-foreground">Clear all existing tags and apply new ones</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-background rounded">
                                        <input
                                            type="radio"
                                            name="tagMode"
                                            checked={tagMode === 'add'}
                                            onChange={() => setTagMode('add')}
                                            className="w-4 h-4"
                                        />
                                        <div>
                                            <div className="font-medium">Add Tags</div>
                                            <div className="text-xs text-muted-foreground">Keep existing tags and add new ones</div>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-background rounded">
                                        <input
                                            type="radio"
                                            name="tagMode"
                                            checked={tagMode === 'remove'}
                                            onChange={() => setTagMode('remove')}
                                            className="w-4 h-4"
                                        />
                                        <div>
                                            <div className="font-medium">Remove Tags</div>
                                            <div className="text-xs text-muted-foreground">Remove specific tags from emails</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Tag Selection */}
                            {tagMode !== 'remove' ? (
                                <>
                                    {/* Badge display */}
                                    <div className="flex flex-wrap gap-2 mb-3 min-h-[32px] p-2 border rounded-md bg-background">
                                        {categoryOverride.length === 0 ? (
                                            <span className="text-sm text-muted-foreground">
                                                {tagMode === 'replace' ? 'Will clear all tags' : 'No tags to add'}
                                            </span>
                                        ) : (
                                            categoryOverride.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="gap-1">
                                                    {tag}
                                                    <X 
                                                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleRemoveTag(tag)
                                                        }} 
                                                    />
                                                </Badge>
                                            ))
                                        )}
                                    </div>

                                    {/* Input to add new tags */}
                                    <div className="flex gap-2 mb-3">
                                        <Input
                                            ref={categoryInputRef}
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleAddTag()
                                                }
                                            }}
                                            placeholder="Type tag and press Enter"
                                        />
                                        <Button variant="outline" onClick={handleAddTag}>Add</Button>
                                    </div>

                                    {/* Quick select from common tags */}
                                    <div className="text-xs text-muted-foreground mb-2">Quick select:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {availableCategories.map(cat => (
                                            <Badge
                                                key={cat}
                                                variant={categoryOverride.includes(cat) ? "default" : "outline"}
                                                className="cursor-pointer"
                                                onClick={() => {
                                                    if (categoryOverride.includes(cat)) {
                                                        setCategoryOverride(prev => prev.filter(c => c !== cat))
                                                    } else {
                                                        setCategoryOverride(prev => [...prev, cat])
                                                    }
                                                }}
                                            >
                                                {cat}
                                            </Badge>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Remove mode - show checkboxes */}
                                    <div className="text-xs text-muted-foreground mb-2">Select tags to remove:</div>
                                    <div className="space-y-2 p-3 border rounded-md max-h-48 overflow-y-auto">
                                        {availableCategories.map(cat => (
                                            <label key={cat} className="flex items-center gap-2 cursor-pointer">
                                                <Checkbox
                                                    checked={categoryOverride.includes(cat)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setCategoryOverride(prev => [...prev, cat])
                                                        } else {
                                                            setCategoryOverride(prev => prev.filter(c => c !== cat))
                                                        }
                                                    }}
                                                />
                                                <span className="text-sm">{cat}</span>
                                            </label>
                                        ))}
                                        {availableCategories.length === 0 && (
                                            <div className="text-sm text-muted-foreground text-center py-4">
                                                No tags available
                                            </div>
                                        )}
                                    </div>
                                    {categoryOverride.length > 0 && (
                                        <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                            <Badge variant="destructive" className="text-xs">{categoryOverride.length}</Badge>
                                            tag(s) will be removed from selected emails
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="space-y-2 border-t pt-3">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <Checkbox
                                    checked={applyTagsOnly}
                                    onCheckedChange={(checked) => setApplyTagsOnly(!!checked)}
                                />
                                <span>Update tags only (don't move emails)</span>
                            </label>
                        </div>

                        <div className="text-sm text-muted-foreground">
                            {applyTagsOnly ? (
                                tagMode === 'remove' 
                                    ? `Removing ${categoryOverride.length} tag(s) from ${selected.length} email${selected.length !== 1 ? "s" : ""}`
                                    : `${tagMode === 'replace' ? 'Replacing' : 'Adding'} tags for ${selected.length} email${selected.length !== 1 ? "s" : ""}`
                            ) : (
                                `Moving ${selected.length} email${selected.length !== 1 ? "s" : ""} and ${tagMode === 'replace' ? 'replacing' : tagMode === 'add' ? 'adding' : 'removing'} tags`
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={executeMove} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {applyTagsOnly ? (
                                tagMode === 'remove' ? 'Remove Tags' : 'Update Tags'
                            ) : (
                                'Move & Tag'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
