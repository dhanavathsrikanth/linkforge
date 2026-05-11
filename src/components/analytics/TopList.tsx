export function TopList({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-[#141418] p-5 shadow-xl">
      <h4 className="mb-4 text-sm font-medium text-zinc-400">{title}</h4>
      
      {data.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
          No data yet
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between group">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-sm font-medium text-white truncate max-w-[150px]">
                  {item.name || "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">{item.value}</span>
                <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-violet-500 rounded-full group-hover:bg-violet-400 transition-colors"
                    style={{ width: `${Math.max(2, (item.value / total) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
