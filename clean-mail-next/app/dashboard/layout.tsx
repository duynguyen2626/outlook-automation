import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LayoutDashboard, ListFilter, LogOut, Menu, Settings } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    if (!session) redirect("/api/auth/signin")

    return (
        <div className="flex h-screen w-full flex-col md:flex-row">
            {/* Mobile Nav */}
            <div className="md:hidden p-4 border-b flex justify-between items-center">
                <h1 className="font-bold">CleanMail</h1>
                <Sheet>
                    <SheetTrigger asChild><Button variant="ghost"><Menu /></Button></SheetTrigger>
                    <SheetContent side="left">
                        <NavContent />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 flex-col border-r bg-muted/40 h-full">
                <div className="p-6 font-bold text-xl border-b">CleanMail</div>
                <ScrollArea className="flex-1">
                    <NavContent />
                </ScrollArea>
                <div className="p-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        {session.user?.email}
                    </div>
                    <form action={async () => {
                        'use server';
                        // await signOut(); // Need to import signOut from auth
                    }}>
                        <Button variant="outline" className="w-full justify-start gap-2">
                            <LogOut className="w-4 h-4" /> Sign Out
                        </Button>
                    </form>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-background">
                {children}
            </main>
            <Toaster />
        </div>
    )
}

function NavContent() {
    return (
        <div className="p-4 flex flex-col gap-2">
            <Link href="/dashboard">
                <Button variant="ghost" className="w-full justify-start gap-2">
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Button>
            </Link>
            <Link href="/dashboard/rules">
                <Button variant="ghost" className="w-full justify-start gap-2">
                    <ListFilter className="w-4 h-4" /> Rules
                </Button>
            </Link>
            <Link href="/dashboard/settings">
                <Button variant="ghost" className="w-full justify-start gap-2">
                    <Settings className="w-4 h-4" /> Settings
                </Button>
            </Link>
        </div>
    )
}
