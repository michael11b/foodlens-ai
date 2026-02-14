import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Clock, ChefHat, Flame, CheckCircle2 } from "lucide-react";
import type { RecipeIdea } from "./RecipeCardSlider";

interface RecipeDetailModalProps {
  idea: RecipeIdea | null;
  onClose: () => void;
  onSelect?: (idea: RecipeIdea) => void;
}

export function RecipeDetailModal({ idea, onClose, onSelect }: RecipeDetailModalProps) {
  if (!idea) return null;

  return (
    <Dialog open={!!idea} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg pr-6">{idea.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {idea.time_estimate}
          </DialogDescription>
        </DialogHeader>

        {/* Ingredients */}
        <div>
          <h4 className="font-display font-semibold text-sm text-foreground mb-2 flex items-center gap-1.5">
            <ChefHat className="w-4 h-4 text-primary" />
            Ingredients
          </h4>
          <ul className="space-y-1.5">
            {idea.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div>
          <h4 className="font-display font-semibold text-sm text-foreground mb-2">Steps</h4>
          <ol className="space-y-2">
            {idea.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary 
                               text-xs font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Nutrition Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/10">
          <Flame className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{idea.nutrition_note}</p>
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          ⚠️ AI-generated. Verify nutritional info independently.
        </p>

        {onSelect && (
          <button
            onClick={() => {
              onSelect(idea);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                       bg-primary text-primary-foreground font-medium text-sm
                       hover:opacity-90 transition-opacity"
          >
            <CheckCircle2 className="w-4 h-4" />
            Select this recipe
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
