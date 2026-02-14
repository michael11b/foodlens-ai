import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, ChefHat, Flame } from "lucide-react";
import { RecipeDetailModal } from "./RecipeDetailModal";

export interface RecipeIdea {
  name: string;
  ingredients: string[];
  steps: string[];
  time_estimate: string;
  nutrition_note: string;
}

interface RecipeCardSliderProps {
  ideas: RecipeIdea[];
  mode: string;
  onSelect?: (idea: RecipeIdea) => void;
}

const modeLabels: Record<string, string> = {
  smoothie: "Smoothie Ideas",
  recipe: "Recipes",
  add_to_meal: "Meal Plans",
  healthier: "Healthier Options",
};

export function RecipeCardSlider({ ideas, mode, onSelect }: RecipeCardSliderProps) {
  const [selectedIdea, setSelectedIdea] = useState<RecipeIdea | null>(null);

  if (!ideas.length) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="flex items-center gap-2 mb-3">
          <ChefHat className="w-4 h-4 text-primary" />
          <h4 className="font-display font-semibold text-sm text-foreground">
            {modeLabels[mode] || "Ideas"}
          </h4>
          <span className="text-xs text-muted-foreground">
            Scroll → tap for details
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide">
          {ideas.map((idea, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => setSelectedIdea(idea)}
              className="flex-shrink-0 w-56 snap-start rounded-xl border border-border bg-card p-4 
                         shadow-sm hover:shadow-md transition-shadow text-left group"
            >
              <h5 className="font-display font-semibold text-sm text-foreground mb-2 line-clamp-2 
                             group-hover:text-primary transition-colors">
                {idea.name}
              </h5>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Clock className="w-3 h-3" />
                {idea.time_estimate}
              </div>

              <div className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {idea.ingredients.slice(0, 3).join(", ")}
                {idea.ingredients.length > 3 && ` +${idea.ingredients.length - 3} more`}
              </div>

              <div className="flex items-start gap-1.5 text-[10px] text-accent">
                <Flame className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{idea.nutrition_note}</span>
              </div>
            </motion.button>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground mt-2 italic">
          ⚠️ AI-generated suggestions. Verify nutritional info independently.
        </p>
      </motion.div>

      <RecipeDetailModal
        idea={selectedIdea}
        onClose={() => setSelectedIdea(null)}
        onSelect={onSelect}
      />
    </>
  );
}
