import { PlanMasterDashboard } from "@/components/plan-master/PlanMasterDashboard"
import { RouteGuard } from "@/components/auth/RouteGuard"

export default function PlanMasterPage() {
    return (
        <RouteGuard>
            <div className="min-h-screen bg-black text-white font-sans selection:bg-[#30D158]/30">
                <div className="relative z-10 container mx-auto px-4 py-8 md:px-8 md:py-12 max-w-7xl">
                    <PlanMasterDashboard />
                </div>
            </div>
        </RouteGuard>
    )
}
