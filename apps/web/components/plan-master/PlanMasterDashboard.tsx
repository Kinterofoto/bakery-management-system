"use client"

import { WeeklyPlanGrid } from "./weekly-grid"
import { ArrowLeft } from "lucide-react"
import { VideoTutorialButton } from "@/components/shared/VideoTutorialButton"
import Link from "next/link"

export function PlanMasterDashboard() {
    return (
        <div className="flex flex-col h-screen">
            {/* Fixed Header Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-[#1C1C1E]">
                <div className="container mx-auto px-4 py-3 md:px-8 max-w-7xl">
                    <div className="flex items-center justify-between gap-4">
                        {/* Left side - Back arrow and Title */}
                        <div className="flex items-center gap-3">
                            <Link href="/" className="p-2 rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] transition-colors">
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </Link>
                            <h1 className="text-lg font-bold tracking-tight text-white">Plan Master</h1>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-2">
                            <VideoTutorialButton modulePath="/planmaster" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area - with top padding for fixed header */}
            <div className="flex-1 pt-16 overflow-hidden">
                <WeeklyPlanGrid />
            </div>
        </div>
    )
}
