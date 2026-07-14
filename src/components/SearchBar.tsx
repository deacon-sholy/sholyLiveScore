import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search teams or leagues..."
        className="w-full rounded-xl border border-white/5 bg-white/[0.03] py-2.5 pl-10 pr-9 text-sm font-medium text-ink-100 placeholder:text-ink-500 transition-colors hover:border-white/10 focus:border-accent-500/50 focus:outline-none focus:ring-1 focus:ring-accent-500/20"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 transition-colors hover:text-ink-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}