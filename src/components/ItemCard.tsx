import { Link } from 'react-router-dom';
import { StoreItem } from '../types';
import { cn } from '../lib/utils';
import { Flame } from 'lucide-react';

interface ItemCardProps {
  item: StoreItem;
  key?: string | number;
}

export default function ItemCard({ item }: ItemCardProps) {
  const isProduct = item.type === 'products';
  
  const image = (item as any).logo || (isProduct ? item.productImage : null);
  const name = isProduct ? item.productName : (item as any).name;
  const description = item.description;
  const avgRating = item.averageRating || 0;
  const totalRatings = item.totalRatings || 0;
  const creatorLevel = item.creatorLevel || 0;

  let linkPath = '';
  switch (item.type) {
    case 'apps': linkPath = `/apps/${item.id}`; break;
    case 'earning_apps': linkPath = `/earning-apps/${item.id}`; break;
    case 'products': linkPath = `/products/${item.id}`; break;
  }
  
  let typeLabel = '';
  switch (item.type) {
    case 'apps': typeLabel = 'App'; break;
    case 'earning_apps': typeLabel = 'Earning App'; break;
    case 'products': typeLabel = 'Product'; break;
  }

  return (
    <Link 
      to={linkPath}
      className={cn(
        "group flex flex-col sm:flex-row p-4 sm:p-5 hover:bg-white/[0.04] transition-all duration-300 border-b active:bg-white/5 relative overflow-hidden", 
        creatorLevel >= 2 ? "border-blue-500/30 bg-gradient-to-r from-blue-500/[0.05] to-transparent hover:from-blue-500/[0.08]" : 
        (creatorLevel === 1 ? "border-green-500/20 bg-gradient-to-r from-green-500/[0.03] to-transparent hover:from-green-500/[0.06]" : "border-white/5")
      )}
    >
      {/* Background radial gradient glow on hover */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none translate-y-1/2 scale-150" />

      <div className="flex items-start gap-4 sm:gap-5 w-full relative z-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black flex-shrink-0 shadow-lg border border-white/10 group-hover:shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)] transition-all duration-300 relative group-hover:-translate-y-0.5">
          {image ? (
            <img src={image} alt={name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 transform group-hover:scale-110" />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-600 font-medium">NO IMG</div>
          )}
          {creatorLevel > 0 && (
             <div className={cn("absolute bottom-0 inset-x-0 py-0.5 text-[8px] font-extrabold tracking-widest text-center uppercase border-t backdrop-blur-md", creatorLevel >= 2 ? "bg-blue-500/90 text-white border-blue-400 group-hover:bg-blue-400/90" : "bg-green-500/90 text-white border-green-400 group-hover:bg-green-400/90")}>
               Featured
             </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 pr-2 pt-0.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className="text-[17px] sm:text-lg text-white font-bold truncate tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400 transition-all duration-300">
                 {name}
              </h3>
              {creatorLevel >= 2 && <Flame className="w-4 h-4 text-blue-400 shrink-0 drop-shadow-[0_0_3px_rgba(59,130,246,0.8)] animate-pulse" />}
            </div>
            {totalRatings > 0 && (
               <div className="flex items-center gap-1.5 shrink-0 bg-black/40 px-2 py-0.5 rounded-full border border-white/5 backdrop-blur-sm shadow-inner group-hover:border-yellow-500/30 transition-colors">
                <span className="text-yellow-500 text-[10px] sm:text-xs font-bold drop-shadow-md">★</span>
                <span className="text-white font-bold text-[10px] sm:text-xs">{avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          <p className="text-[13px] sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed mb-2 group-hover:text-zinc-300 transition-colors">
            {description}
          </p>
          
          <div className="flex items-center gap-2 mt-auto">
            <span className={cn(
               "text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded flex items-center justify-center",
               item.type === 'apps' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
               item.type === 'earning_apps' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
               "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            )}>
              {typeLabel}
            </span>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center justify-center shrink-0 self-center pl-4 ml-2 h-full">
           <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] flex items-center justify-center text-zinc-400 transition-all duration-300 border border-white/5 group-hover:border-primary">
              <svg className="w-5 h-5 -translate-x-[1px] group-hover:translate-x-[1px] transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
           </div>
        </div>
      </div>
    </Link>
  );
}
