import { ReactNode } from 'react';

export function PostSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-muted-foreground/30 transition-colors animate-pulse mb-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0"></div>
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 bg-muted rounded w-32"></div>
            <div className="h-4 bg-muted/50 rounded w-20"></div>
          </div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
          <div className="mt-4 flex gap-6">
            <div className="h-4 bg-muted/50 rounded w-10"></div>
            <div className="h-4 bg-muted/50 rounded w-10"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-border rounded-2xl bg-muted/10 mx-auto w-full mt-6">
      <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-5 text-muted-foreground border border-border/50">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground text-[15px]">{description}</p>
    </div>
  );
}
