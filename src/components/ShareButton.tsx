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
      className="group flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-fg sm:w-auto sm:gap-1.5 sm:px-2.5"
    >
      {copied ? (
        <Check className="h-4 w-4 text-accent-500" />
      ) : (
        <Share2 className="h-4 w-4 transition-transform group-hover:scale-110" />
      )}
      <span className="hidden text-xs font-semibold sm:inline">{copied ? 'Copied' : 'Share'}</span>
    </button>
  );
}