"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Paperclip, Plus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

const MIN_HEIGHT = 48;
const MAX_HEIGHT = 164;

const AnimatedPlaceholder = ({ showSearch }: { showSearch: boolean }) => (
  <AnimatePresence mode="wait">
    <motion.p
      key={showSearch ? "search" : "ask"}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.1 }}
      className="pointer-events-none text-sm text-gray-500"
    >
      {showSearch ? "Search the web..." : "Ask about OWASP Nest..."}
    </motion.p>
  </AnimatePresence>
);

interface AiInputProps {
  onSubmit: (message: string, file?: File) => void;
  disabled?: boolean;
}

export function AiInput({ onSubmit, disabled }: AiInputProps) {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  });
  const [showSearch, setShowSearch] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setImagePreview(null);
    setSelectedFile(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSubmit(value, selectedFile || undefined);
    setValue("");
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    adjustHeight(true);
  };

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <div className="w-full">
      <div className="relative max-w-3xl mx-auto">
        <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl flex flex-col shadow-2xl">
          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${MAX_HEIGHT}px` }}
          >
            <div className="relative">
              <Textarea
                id="ai-input-04"
                value={value}
                placeholder=""
                className="w-full rounded-2xl rounded-b-none px-5 py-4 bg-transparent border-none text-white resize-none focus-visible:ring-0 leading-relaxed placeholder:text-gray-500"
                ref={textareaRef}
                disabled={disabled}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
              />
              {!value && (
                <div className="absolute left-5 top-4">
                  <AnimatedPlaceholder showSearch={showSearch} />
                </div>
              )}
            </div>
          </div>
          <div className="h-14 border-t border-white/10 rounded-b-2xl flex items-center px-4">
            <div className="flex items-center gap-2">
              <label
                className={cn(
                  "cursor-pointer relative rounded-xl p-2.5 transition-all duration-200",
                  imagePreview
                    ? "bg-purple-500/20 border border-purple-500/50 text-purple-400"
                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleChange}
                  className="hidden"
                  accept="image/*"
                />
                <Paperclip
                  className={cn(
                    "w-4 h-4 transition-colors",
                    imagePreview && "text-purple-400"
                  )}
                />
                {imagePreview && (
                  <div className="absolute w-[100px] h-[100px] bottom-16 left-0 z-10">
                    <Image
                      className="object-cover rounded-xl border-2 border-purple-500/50 shadow-xl"
                      src={imagePreview}
                      height={500}
                      width={500}
                      alt="additional image"
                    />
                    <button
                      onClick={handleClose}
                      className="bg-red-500 hover:bg-red-600 text-white absolute -top-2 -right-2 rounded-full p-1 shadow-lg transition-colors"
                    >
                      <Plus className="w-3 h-3 rotate-45" />
                    </button>
                  </div>
                )}
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowSearch(!showSearch);
                }}
                className={cn(
                  "rounded-xl transition-all duration-200 flex items-center gap-2 px-3 py-2.5",
                  showSearch
                    ? "bg-purple-500/20 border border-purple-500/50 text-purple-400"
                    : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                )}
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <motion.div
                    animate={{
                      rotate: showSearch ? 180 : 0,
                      scale: showSearch ? 1.1 : 1,
                    }}
                    whileHover={{
                      rotate: showSearch ? 180 : 15,
                      scale: 1.1,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 10,
                      },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 25,
                    }}
                  >
                    <Globe className="w-4 h-4" />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {showSearch && (
                    <motion.span
                      initial={{ width: 0, opacity: 0 }}
                      animate={{
                        width: "auto",
                        opacity: 1,
                      }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm overflow-hidden whitespace-nowrap flex-shrink-0"
                    >
                      Search
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={disabled || !value.trim()}
                className={cn(
                  "rounded-xl p-2.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                  value && !disabled
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20"
                    : "bg-white/5 text-gray-400"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
