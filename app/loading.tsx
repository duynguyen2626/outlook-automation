import { LayoutDashboard } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <LayoutDashboard className="h-10 w-10 animate-bounce text-muted-foreground" />
        </div>
    )
}
