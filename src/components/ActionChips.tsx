import { motion } from "framer-motion";
import { Salad, ChefHat, Plus, Sparkles } from "lucide-react";

interface ActionChipsProps {
  onAction: (action: string) => void;
}

const actions = [
  { id: "smoothie", label: "Smoothie ideas", icon: Sparkles },
  { id: "recipe", label: "Recipes", icon: ChefHat },
  { id: "add_to_meal", label: "Add to meal", icon: Plus },
  { id: "healthier", label: "Healthier version", icon: Salad },
];

export function ActionChips({ onAction }: ActionChipsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-wrap gap-2"
    >
      {actions.map((a) => (
        <button
          key={a.id}
          onClick={() => onAction(a.id)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
        >
          <a.icon className="w-3.5 h-3.5" />
          {a.label}
        </button>
      ))}
    </motion.div>
  );
}
