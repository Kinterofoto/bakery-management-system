import { InventoryPage } from "@/components/plan-master/InventoryPage"
import { RouteGuard } from "@/components/auth/RouteGuard"

export default function PlanMasterInventoryPage() {
    return (
        <RouteGuard>
            <div className="min-h-screen bg-black text-white font-sans selection:bg-[#30D158]/30">
                <InventoryPage />
            </div>
        </RouteGuard>
    )
}
