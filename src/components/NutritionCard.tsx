import { motion } from "framer-motion";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";

interface NutritionCardProps {
  nutrition: Record<string, unknown>;
}

export function NutritionCard({ nutrition }: NutritionCardProps) {
  const n = nutrition as {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    serving_size?: string;
    food_name?: string;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full rounded-xl border border-border bg-card p-4 shadow-card"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display font-semibold text-sm text-foreground">
          Nutrition Facts
        </h4>
        {n.serving_size && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {n.serving_size}
          </span>
        )}
      </div>
      {n.food_name && (
        <p className="text-xs text-muted-foreground mb-3">{n.food_name} (USDA)</p>
      )}
      <div className="grid grid-cols-4 gap-3">
        <NutrientPill
          icon={<Flame className="w-4 h-4" />}
          label="Calories"
          value={n.calories}
          unit="kcal"
          color="text-accent"
          bgColor="bg-accent/10"
        />
        <NutrientPill
          icon={<Beef className="w-4 h-4" />}
          label="Protein"
          value={n.protein}
          unit="g"
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <NutrientPill
          icon={<Wheat className="w-4 h-4" />}
          label="Carbs"
          value={n.carbs}
          unit="g"
          color="text-warning"
          bgColor="bg-warning/10"
        />
        <NutrientPill
          icon={<Droplets className="w-4 h-4" />}
          label="Fat"
          value={n.fat}
          unit="g"
          color="text-destructive"
          bgColor="bg-destructive/10"
        />
      </div>
    </motion.div>
  );
}

function NutrientPill({
  icon,
  label,
  value,
  unit,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  unit: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <span className="text-base font-display font-bold text-foreground">
        {value !== undefined ? Math.round(value) : "—"}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {unit}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
