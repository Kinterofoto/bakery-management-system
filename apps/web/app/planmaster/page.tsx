import { PlanMasterDashboard } from "@/components/plan-master/PlanMasterDashboard"
import { RouteGuard } from "@/components/auth/RouteGuard"

export default function PlanMasterPage() {
    return (
        <RouteGuard>
            <div className="min-h-screen bg-black text-white font-sans selection:bg-[#30D158]/30">
                <div className="relative z-10 h-screen">
                    <PlanMasterDashboard />
                </div>
            </div>
        </RouteGuard>
    )
}
