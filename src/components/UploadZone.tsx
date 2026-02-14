import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Camera, Image } from "lucide-react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  isUploading: boolean;
}

export function UploadZone({ onFileSelected, isUploading }: UploadZoneProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        setPreview(URL.createObjectURL(file));
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxSize: 8 * 1024 * 1024,
    multiple: false,
    disabled: isUploading,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed p-12
          transition-all duration-300 cursor-pointer
          ${isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
          }
          ${isUploading ? "opacity-60 pointer-events-none" : ""}
        `}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {preview && !isUploading ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4"
            >
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-xl shadow-card"
              />
              <p className="text-sm text-muted-foreground">Analyzing your image...</p>
            </motion.div>
          ) : isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-soft">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Uploading & analyzing...</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Camera className="w-7 h-7 text-primary" />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Image className="w-7 h-7 text-accent" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-display font-semibold text-foreground">
                  {isDragActive ? "Drop your image here" : "Drag & drop a photo"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse · JPG, PNG, WebP · max 8MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
