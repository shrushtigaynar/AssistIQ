import React from 'react'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'

export const UpcomingMeetingsCard = ({ meetings, onManageMeetings }) => {
  return (
    <Card className="border-zinc-800/80 bg-zinc-900/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
            <CardTitle className="text-xs uppercase tracking-wider font-mono">
              Detected Meetings & Deadlines
            </CardTitle>
          </div>
          <Badge variant="waiting" size="sm">
            {meetings.length} Scheduled
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-1">
        {meetings.length === 0 ? (
          <p className="text-xs text-zinc-500 py-2">No upcoming meetings detected.</p>
        ) : (
          meetings.map((m, idx) => (
            <div
              key={idx}
              className="rounded-md border border-zinc-800/80 bg-zinc-900/70 p-2.5 space-y-1.5 hover:border-zinc-700/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold text-zinc-200 leading-tight">
                  {m.title}
                </h4>
                <span className="text-[10px] font-mono font-medium text-emerald-400 shrink-0 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  {m.date}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-zinc-500" />
                  {m.time}
                </span>

                {m.location && (
                  <span className="flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span className="truncate">{m.location}</span>
                  </span>
                )}
              </div>

              {m.attendees && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 pt-0.5">
                  <Users className="h-3 w-3 text-zinc-600" />
                  <span className="truncate">{m.attendees.join(', ')}</span>
                </div>
              )}
            </div>
          ))
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onManageMeetings}
          className="w-full text-xs font-mono justify-center text-zinc-400 hover:text-zinc-200"
        >
          <Calendar className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
          Manage meetings
        </Button>
      </CardContent>
    </Card>
  )
}
