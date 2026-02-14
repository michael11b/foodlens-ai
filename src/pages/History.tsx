import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScanHistoryItem } from "@/components/ScanHistoryItem";
import { getSessionId } from "@/lib/session";

interface ScanRow {
  id: string;
  image_path: string;
  top_label: string | null;
  category: string | null;
  created_at: string;
}

export default function History() {
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sessionId = getSessionId();
      const { data } = await supabase
        .from("scans")
        .select("id, image_path, top_label, category, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });
      if (data) setScans(data as unknown as ScanRow[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Scan History</h1>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No scans yet. Upload your first image!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <ScanHistoryItem
              key={scan.id}
              id={scan.id}
              imageUrl={supabase.storage.from("uploads").getPublicUrl(scan.image_path).data.publicUrl}
              topLabel={scan.top_label}
              category={scan.category}
              createdAt={scan.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
