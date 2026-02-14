import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";
import { NutritionCard } from "./NutritionCard";
import { ActionChips } from "./ActionChips";
import { QuickReplies } from "./QuickReplies";
import { RecipeCardSlider, type RecipeIdea } from "./RecipeCardSlider";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown> | null;
  onAction?: (action: string) => void;
  onQuickReply?: (reply: string) => void;
  showActions?: boolean;
  showQuickReplies?: boolean;
  nutrition?: Record<string, unknown> | null;
  category?: string | null;
  sending?: boolean;
}

export function ChatMessage({
  role,
  content,
  metadata,
  onAction,
  onQuickReply,
  showActions,
  showQuickReplies,
  nutrition,
  category,
  sending,
}: ChatMessageProps) {
  const isUser = role === "user";

  const quickReplies = (metadata?.quick_replies as string[]) || [];
  const ideas = (metadata?.ideas as RecipeIdea[]) || [];
  const displayType = metadata?.display_type as string | undefined;
  const mode = (metadata?.mode as string) || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1
          ${isUser ? "bg-primary" : "bg-muted"}
        `}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-foreground" />
        )}
      </div>
      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm leading-relaxed
            ${isUser
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-card shadow-card border border-border rounded-tl-md"
            }
          `}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>

        {/* Recipe Card Slider */}
        {displayType === "recipe_cards" && ideas.length > 0 && !isUser && (
          <RecipeCardSlider ideas={ideas} mode={mode} />
        )}

        {nutrition && category === "FOOD" && (
          <NutritionCard nutrition={nutrition} />
        )}

        {category === "NON_FOOD" && !isUser && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-nonfood-badge/10 border border-nonfood-badge/20">
            <span className="w-2 h-2 rounded-full bg-nonfood-badge" />
            <span className="text-xs font-medium text-nonfood-badge">Not a food product</span>
          </div>
        )}

        {/* Quick Reply Chips */}
        {showQuickReplies && quickReplies.length > 0 && onQuickReply && !isUser && (
          <QuickReplies options={quickReplies} onSelect={onQuickReply} disabled={sending} />
        )}

        {showActions && onAction && !isUser && (
          <ActionChips onAction={onAction} />
        )}
      </div>
    </motion.div>
  );
}
