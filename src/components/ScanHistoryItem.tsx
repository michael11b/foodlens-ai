import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";

interface ScanHistoryItemProps {
  id: string;
  imageUrl: string;
  topLabel: string | null;
  category: string | null;
  createdAt: string;
}

export function ScanHistoryItem({
  id,
  imageUrl,
  topLabel,
  category,
  createdAt,
}: ScanHistoryItemProps) {
  const date = new Date(createdAt);
  const timeAgo = getTimeAgo(date);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
    >
      <Link
        to={`/scan/${id}`}
        className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border shadow-card hover:shadow-elevated transition-shadow"
      >
        <img
          src={imageUrl}
          alt={topLabel || "Scan"}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-semibold text-sm text-foreground truncate">
              {topLabel || "Analyzing..."}
            </p>
            {category && (
              <span
                className={`
                  px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider
                  ${category === "FOOD"
                    ? "bg-food-badge/10 text-food-badge"
                    : "bg-nonfood-badge/10 text-nonfood-badge"
                  }
                `}
              >
                {category === "FOOD" ? "Food" : "Non-food"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground" />
      </Link>
    </motion.div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
