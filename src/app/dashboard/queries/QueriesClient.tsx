'use client'

import { MessageSquare, Star, AlertTriangle, CheckCircle2 } from "lucide-react"
export function QueriesClient({ queries }: { queries: any[] }) {

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Queries & Feedback</h1>
          <p className="text-muted-foreground mt-1">Manage student reviews, feedback, and complaints.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {queries.length === 0 && (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-xl">
            No queries found in the database.
          </div>
        )}

        {queries.map((query, index) => (
          <div key={query.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row gap-6 items-start">
            <div className={`p-3 rounded-xl shrink-0 ${query.type === 'FEEDBACK' ? 'bg-primary/10 text-primary' : query.type === 'COMPLAINT' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
              {query.type === 'FEEDBACK' && <MessageSquare className="w-6 h-6" />}
              {query.type === 'COMPLAINT' && <AlertTriangle className="w-6 h-6" />}
              {query.type === 'REVIEW' && <Star className="w-6 h-6 fill-warning" />}
            </div>
            
            <div className="flex-1 space-y-2 w-full">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground">#{index + 1}. {query.student.name}</h3>
                  <span className="text-muted-foreground text-sm">• {new Date(query.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {query.type === 'REVIEW' && query.rating && (
                <div className="flex gap-1">
                  {Array.from({length: 5}).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < query.rating! ? 'text-warning fill-warning' : 'text-muted-foreground'}`} />
                  ))}
                </div>
              )}
              
              <p className="text-foreground leading-relaxed bg-muted/30 p-4 rounded-xl border border-border/50 mt-2">
                "{query.content}"
              </p>
            </div>
            
            <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
              <a href={`mailto:${query.student.email}?subject=Reply to your query&body=Hi ${query.student.name},`} className="flex-1 sm:flex-none bg-background border border-border text-foreground hover:bg-muted font-semibold px-4 py-2 rounded-lg text-sm transition-colors text-center inline-block">
                Reply
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
