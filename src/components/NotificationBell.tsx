'use client';

import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";
import { markNotificationRead } from "@/app/actions/notification-actions";
import { useRouter } from "next/navigation";

export function NotificationBell({ 
  notifications 
}: { 
  notifications: any[] 
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleRead = async (id: string) => {
    await markNotificationRead(id);
    // Let the server component re-fetch
    router.refresh();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors mr-2">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-background"></span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b border-border bg-muted/20">
          <h3 className="font-semibold text-foreground">Notifications</h3>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map(notif => (
              <div 
                key={notif.id} 
                className={`p-4 border-b border-border last:border-0 hover:bg-muted/10 transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <p className={`text-sm ${!notif.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{notif.title}</p>
                    <p className="text-xs text-muted-foreground">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(notif.createdAt).toLocaleDateString()}</p>
                  </div>
                  {!notif.isRead && (
                    <button 
                      onClick={() => handleRead(notif.id)}
                      className="shrink-0 text-xs text-primary hover:underline"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
