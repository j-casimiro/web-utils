import React from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ToolWrapperProps {
  title: string
  description: string
  onBack: () => void
  children: React.ReactNode
}

export function ToolWrapper({ title, description, onBack, children }: ToolWrapperProps) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          className="border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to home</span>
        </Button>
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">{title}</h2>
          <p className="text-sm text-zinc-400">{description}</p>
        </div>
      </div>

      <Card className="border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xl">
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}
