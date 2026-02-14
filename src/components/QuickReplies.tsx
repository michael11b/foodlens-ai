import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ options, onSelect, disabled }: QuickRepliesProps) {
  if (!options.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex flex-wrap gap-2"
    >
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary
                     transition-colors border border-border disabled:opacity-40 disabled:pointer-events-none"
        >
          <MessageCircle className="w-3 h-3" />
          {opt}
        </button>
      ))}
    </motion.div>
  );
}
