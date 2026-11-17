import React from 'react'
import { Activity, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card'

export const RecentActivityCard = ({ activityLogs }) => {
  return (
    <Card className="border-zinc-800/80 bg-zinc-900/40">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Activity className="h-3.5 w-3.5 text-brand-400" />
          <CardTitle className="text-xs uppercase tracking-wider font-mono">
            Recent Triage Activity & Audit Log
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-1">
        {activityLogs.length === 0 ? (
          <p className="text-xs text-zinc-500 py-1">No triage activity yet.</p>
        ) : (
          <div className="space-y-2">
            {activityLogs.slice(0, 5).map((log, idx) => (
              <div
                key={log.id || idx}
                className="flex items-start justify-between gap-2 text-xs border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-zinc-300 text-xs leading-tight truncate">
                    {log.action}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                    <span>{log.user}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
