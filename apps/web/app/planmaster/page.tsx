import { PlanMasterDashboard } from "@/components/plan-master/PlanMasterDashboard"
import { RouteGuard } from "@/components/auth/RouteGuard"

export default function PlanMasterPage() {
    return (
        <RouteGuard>
            <div className="fixed inset-0 bg-black text-white font-sans selection:bg-[#30D158]/30">
                <div className="relative z-10 h-full w-full">
                    <PlanMasterDashboard />
                </div>
            </div>
        </RouteGuard>
    )
}
