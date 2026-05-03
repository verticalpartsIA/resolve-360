export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black shadow-[var(--shadow-elegant)] border border-gold">
        <span className="font-bold text-sm tracking-tight">VP</span>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">VerticalParts</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-gold">Pós-Venda 360°</div>
        </div>
      )}
    </div>
  );
}
