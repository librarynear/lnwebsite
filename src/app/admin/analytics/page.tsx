import { BarChart3, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const dashboardUrl = process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_URL;

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-black">
            <BarChart3 className="w-6 h-6 text-primary" /> Analytics Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time insights powered by PostHog
          </p>
        </div>
        
        <Link 
          href="https://us.posthog.com/project" 
          target="_blank"
          className="flex items-center gap-2 text-sm font-medium bg-white border border-border px-4 py-2 rounded-lg hover:bg-muted transition-colors shadow-sm"
        >
          Open PostHog <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </Link>
      </div>

      {dashboardUrl ? (
        <div className="flex-1 bg-white border border-border rounded-xl shadow-sm overflow-hidden mb-6">
          <iframe 
            src={dashboardUrl} 
            className="w-full h-full border-0 min-h-[600px]"
            title="PostHog Shared Dashboard"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      ) : (
        <div className="flex-1 bg-white border border-border border-dashed rounded-xl flex flex-col items-center justify-center text-center p-8 mb-6 mt-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2">Connect Your Dashboard</h2>
          <p className="text-muted-foreground max-w-md mb-8">
            You can inject your entire PostHog analytics suite (Traffic, Funnels, User Events) directly into this page.
          </p>
          
          <div className="text-left bg-muted/30 border border-border/60 rounded-xl p-6 text-sm max-w-2xl w-full mx-auto">
            <h3 className="font-bold text-black mb-4">How to set this up:</h3>
            <ol className="list-decimal pl-5 space-y-3 text-muted-foreground">
              <li>Open your PostHog account and navigate to <strong>Dashboards</strong>.</li>
              <li>Click on the Dashboard you want to embed (e.g. &quot;App Project Default&quot;).</li>
              <li>Click the <strong>Share</strong> button in the top right corner.</li>
              <li>Turn on <strong>Share Dashboard via link</strong>.</li>
              <li>Copy that specific Embedded Link URL.</li>
              <li>Add it to your <code>.env.local</code> file exactly like this:
                <pre className="mt-3 p-3 bg-slate-900 text-green-400 rounded-lg overflow-x-auto">
                  NEXT_PUBLIC_POSTHOG_DASHBOARD_URL=&quot;https://us.posthog.com/shared/your_unique_id&quot;
                </pre>
              </li>
              <li>Restart your development server.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
