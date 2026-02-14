import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChatMessage } from "@/components/ChatMessage";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown> | null;
}

interface Scan {
  id: string;
  image_path: string;
  status: string;
  top_label: string | null;
  top_confidence: number | null;
  category: string | null;
  nutrition: Record<string, unknown> | null;
}

export default function ScanChat() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const imageUrl = scan?.image_path
    ? supabase.storage.from("uploads").getPublicUrl(scan.image_path).data.publicUrl
    : null;

  // Load scan and messages
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      const [scanRes, msgRes] = await Promise.all([
        supabase.from("scans").select("*").eq("id", id).single(),
        supabase.from("chat_messages").select("*").eq("scan_id", id).order("created_at", { ascending: true }),
      ]);

      if (scanRes.data) setScan(scanRes.data as unknown as Scan);
      if (msgRes.data) setMessages(msgRes.data as unknown as Message[]);
      setLoading(false);
    };

    loadData();

    // Subscribe to new messages
    const channel = supabase
      .channel(`scan-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `scan_id=eq.${id}` }, (payload) => {
        const newMsg = payload.new as unknown as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "scans", filter: `id=eq.${id}` }, (payload) => {
        setScan(payload.new as unknown as Scan);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !id || sending) return;
    setSending(true);
    setInput("");

    // Optimistic user message
    const tempId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: text.trim() }]);

    try {
      const { data, error } = await supabase.functions.invoke("chat-turn", {
        body: { scanId: id, userMessage: text.trim() },
      });
      if (error) throw error;
      
      // Refresh scan data
      const { data: updatedScan } = await supabase.from("scans").select("*").eq("id", id).single();
      if (updatedScan) setScan(updatedScan as unknown as Scan);
    } catch (err) {
      console.error("Chat error:", err);
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!id) return;
    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("get-ideas", {
        body: { scanId: id, mode: action },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Action error:", err);
      toast({
        title: "Failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === "assistant");
  const lastAssistantMsgIdx = lastAssistantIdx >= 0 ? messages.length - 1 - lastAssistantIdx : -1;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        <Link to="/" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        {imageUrl && (
          <img src={imageUrl} alt="Scan" className="w-10 h-10 rounded-lg object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-foreground truncate">
            {scan?.top_label || "Analyzing..."}
          </p>
          {scan?.top_confidence != null && (
            <p className="text-xs text-muted-foreground">
              {Math.round(scan.top_confidence * 100)}% confidence
            </p>
          )}
        </div>
        {scan?.category && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
              scan.category === "FOOD"
                ? "bg-food-badge/10 text-food-badge"
                : "bg-nonfood-badge/10 text-nonfood-badge"
            }`}
          >
            {scan.category === "FOOD" ? "Food" : "Non-food"}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, idx) => (
          <ChatMessage
            key={msg.id}
            role={msg.role as "user" | "assistant"}
            content={msg.content}
            metadata={msg.metadata}
            onAction={handleAction}
            onQuickReply={(reply) => sendMessage(reply)}
            showActions={idx === lastAssistantMsgIdx && scan?.category === "FOOD" && scan?.nutrition != null}
            showQuickReplies={idx === lastAssistantMsgIdx && !sending}
            nutrition={idx === lastAssistantMsgIdx ? scan?.nutrition : null}
            category={msg.role === "assistant" ? scan?.category : null}
            sending={sending}
          />
        ))}
        {sending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-foreground animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-md bg-card shadow-card border border-border px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
