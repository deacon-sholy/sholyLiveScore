import { Share2, Check } from 'lucide-react';
import { useState } from 'react';

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
}

export default function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = url || window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // user cancelled
      }
    } else {
      // fallback: copy link
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback: prompt
        prompt('Copy this link:', shareUrl);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="group flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-ink-200 transition-all hover:border-white/20 hover:bg-white/10"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Share2 className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
      )}
      <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
    </button>
  );
}