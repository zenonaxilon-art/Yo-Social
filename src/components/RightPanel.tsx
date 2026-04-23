import { Search } from 'lucide-react';

export default function RightPanel() {
  return (
    <div className="hidden lg:block w-[350px] pl-8 pt-2 h-screen sticky top-0 flex-shrink-0">
      <div className="sticky top-0 bg-background/80 backdrop-blur-md pt-1 pb-2 z-10">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search Yo Social"
            className="w-full bg-muted border border-transparent rounded-full py-3 pr-4 pl-12 text-[15px] focus:outline-none focus:bg-background focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="bg-muted/50 border border-border rounded-2xl p-4 mt-2">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Trending Today</h2>
        {/* Placeholder for trending items */}
        <div className="space-y-4">
          <div className="cursor-pointer hover:bg-muted px-2 -mx-2 py-2 rounded-xl transition-colors">
            <p className="text-[12px] text-muted-foreground">Technology · Trending</p>
            <p className="font-semibold text-[15px] mt-0.5">#React19</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">25.4K posts</p>
          </div>
          <div className="cursor-pointer hover:bg-muted px-2 -mx-2 py-2 rounded-xl transition-colors">
            <p className="text-[12px] text-muted-foreground">Marketplace · Hot</p>
            <p className="font-semibold text-[15px] mt-0.5">iPhone 15 Pro Max</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">2.1K listings</p>
          </div>
        </div>
      </div>

      <div className="bg-muted/50 rounded-2xl p-4 border border-border mt-6">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Marketplace Highlight</h2>
        <div className="relative rounded-xl overflow-hidden mb-3">
          <div className="h-32 bg-muted flex items-center justify-center">
            <Search className="w-12 h-12 text-muted-foreground/50" />
          </div>
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">$450</div>
        </div>
        <p className="font-medium text-sm">Vintage Camera</p>
        <p className="text-xs text-muted-foreground mt-1">San Francisco, CA</p>
        <button className="w-full mt-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90">View Item</button>
      </div>
      
      <div className="text-[13px] text-muted-foreground px-4 mt-4 flex flex-wrap gap-x-3 gap-y-1">
        <span>Terms of Service</span>
        <span>Privacy Policy</span>
        <span>Cookie Policy</span>
        <span>Accessibility</span>
        <span>© 2026 Yo Social!</span>
      </div>
    </div>
  );
}
