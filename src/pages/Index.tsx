import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Search, Utensils } from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { supabase } from "@/integrations/supabase/client";
import { getSessionId } from "@/lib/session";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileSelected = async (file: File) => {
    setIsUploading(true);
    try {
      const sessionId = getSessionId();
      const scanId = crypto.randomUUID();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${sessionId}/scans/${scanId}.${ext}`;

      // Upload image
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, file);
      if (uploadError) throw uploadError;

      // Create scan record
      const { error: insertError } = await supabase
        .from("scans")
        .insert({
          id: scanId,
          session_id: sessionId,
          image_path: path,
          status: "PENDING",
        });
      if (insertError) throw insertError;

      // Call analyze edge function
      const { error: fnError } = await supabase.functions.invoke("analyze-scan-start", {
        body: { scanId },
      });
      if (fnError) throw fnError;

      navigate(`/scan/${scanId}`);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto px-4 py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Snap. Identify.
            <br />
            <span className="text-primary">Nourish.</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload a photo — get instant food recognition,
            <br className="hidden sm:block" /> real nutrition facts & recipe ideas.
          </p>
        </motion.div>

        <div className="w-full mb-10">
          <UploadZone onFileSelected={handleFileSelected} isUploading={isUploading} />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-6 w-full"
        >
          {[
            { icon: Search, title: "Identify", desc: "AI-powered recognition" },
            { icon: Sparkles, title: "Nutrition", desc: "Real USDA data" },
            { icon: Utensils, title: "Ideas", desc: "Recipes & smoothies" },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-display font-semibold text-sm text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
