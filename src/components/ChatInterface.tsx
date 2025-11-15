"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Paperclip, Plus, Send, Settings, X, Loader2 } from "lucide-react";
import { StaggerCards } from "./ui/stagger-cards";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { AIConfig } from "@/types";

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
      className="pointer-events-none w-[150px] text-sm absolute text-black/70 dark:text-white/70"
    >
      {showSearch ? "Search the web..." : "Ask Nest AI..."}
    </motion.p>
  </AnimatePresence>
);

export function ChatInterface() {
  const [value, setValue] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: MIN_HEIGHT,
    maxHeight: MAX_HEIGHT,
  });
  const [showSearch, setShowSearch] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string; cards?: any[] }>>([]);
  const [config, setConfig] = useState<AIConfig>({
    provider: "huggingface",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    apiKey: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleClose = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setImagePreview(null);
  };

  const handleChange = (e: any) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!value.trim()) return;

    // Mock cards for testing (remove this when API is working)
    const mockCards = [
      {
        title: "OWASP ZAP",
        description: "The world's most widely used web app scanner. Free and open source.",
        subtitle: "Security Testing Tool",
        imgSrc: "https://i.pravatar.cc/150?img=1",
        link: "https://www.zaproxy.org/"
      },
      {
        title: "OWASP Top 10",
        description: "Standard awareness document for developers and web application security.",
        subtitle: "Security Standard",
        imgSrc: "https://i.pravatar.cc/150?img=2",
        link: "https://owasp.org/www-project-top-ten/"
      },
      {
        title: "OWASP ModSecurity",
        description: "Open source web application firewall (WAF) engine.",
        subtitle: "Web Application Firewall",
        imgSrc: "https://i.pravatar.cc/150?img=3",
        link: "https://owasp.org/www-project-modsecurity/"
      },
      {
        title: "OWASP Dependency-Check",
        description: "Software composition analysis tool that detects publicly disclosed vulnerabilities.",
        subtitle: "Vulnerability Scanner",
        imgSrc: "https://i.pravatar.cc/150?img=4",
        link: "https://owasp.org/www-project-dependency-check/"
      },
      {
        title: "OWASP ASVS",
        description: "Application Security Verification Standard - a framework of security requirements.",
        subtitle: "Security Framework",
        imgSrc: "https://i.pravatar.cc/150?img=5",
        link: "https://owasp.org/www-project-application-security-verification-standard/"
      },
      {
        title: "OWASP Juice Shop",
        description: "Probably the most modern and sophisticated insecure web application.",
        subtitle: "Training Platform",
        imgSrc: "https://i.pravatar.cc/150?img=6",
        link: "https://owasp.org/www-project-juice-shop/"
      },
      {
        title: "OWASP WebGoat",
        description: "Deliberately insecure application for teaching web security lessons.",
        subtitle: "Educational Tool",
        imgSrc: "https://i.pravatar.cc/150?img=7",
        link: "https://owasp.org/www-project-webgoat/"
      }
    ];

    if (!config.apiKey) {
      // Show mock cards for testing without API key
      const userMessage = { role: "user", content: value.trim() };
      setMessages((prev) => [...prev, userMessage]);
      
      setValue("");
      adjustHeight(true);
      
      setTimeout(() => {
        const mockMessage = {
          role: "assistant",
          content: "Here are some popular OWASP projects (mock data for testing):",
          cards: mockCards
        };
        setMessages((prev) => [...prev, mockMessage]);
      }, 500);
      return;
    }

    const userMessage = { role: "user", content: value.trim() };
    setMessages((prev) => [...prev, userMessage]);
    
    const currentMessage = value.trim();
    setValue("");
    adjustHeight(true);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentMessage,
          config,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from API");
      }

      const data = await response.json();

      const aiMessage = { 
        role: "assistant", 
        content: data.message || "No response received",
        cards: data.cards || []
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please check your API configuration and try again." 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <>
      {/* Settings Modal - Outside main container */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-48 w-[90%] max-w-md bg-[#111111] border border-white/10 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">
                  AI Configuration
                </h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Provider
                  </label>
                  <select
                    value={config.provider}
                    onChange={(e) =>
                      setConfig({ ...config, provider: e.target.value as any })
                    }
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="huggingface">HuggingFace</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) =>
                      setConfig({ ...config, model: e.target.value })
                    }
                    placeholder="meta-llama/Llama-3.1-8B-Instruct"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) =>
                      setConfig({ ...config, apiKey: e.target.value })
                    }
                    placeholder="Enter your HuggingFace API key"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="relative flex items-center justify-center min-h-screen bg-[#0A0A0A] overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
        </div>

        {/* Settings Icon - Top Right */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-6 right-6 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 group z-50"
        >
          <Settings className="w-6 h-6 text-gray-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
        </button>

        {/* Title - Fixed at top-left */}
        <motion.div
          initial={false}
          animate={{
            opacity: 1,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="absolute top-6 left-6 z-10"
        >
          <h1 className="text-2xl font-bold text-white tracking-tight">
            OWASP NEST AI
          </h1>
        </motion.div>

        {/* Main Content */}
      <div className={`relative z-0 w-full h-full flex flex-col ${messages.length === 0 ? 'justify-center' : 'pt-20'}`}>

        {/* Messages Area */}
        {messages.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 overflow-y-auto px-4 pb-32"
          >
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-3"
                >
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-[#ff3f17]/15 border border-[#ff3f17] text-white'
                          : 'bg-white/5 border border-white/10 text-white'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="w-full my-4">
                      <StaggerCards cards={msg.cards} height={500} />
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#ff3f17]" />
                    <span className="text-sm text-gray-300">Thinking...</span>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            {/* Empty state - just shows centered title above */}
          </div>
        )}

        {/* Input Area - moves to bottom when chat starts */}
        <motion.div
          animate={{
            position: messages.length === 0 ? 'relative' : 'fixed',
            bottom: messages.length === 0 ? 'auto' : '0',
            left: messages.length === 0 ? 'auto' : '0',
            right: messages.length === 0 ? 'auto' : '0',
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full px-4 py-4"
        >
          <div className="relative max-w-xl w-full mx-auto">
            <div className="relative rounded-2xl flex flex-col">
              <div
                className="overflow-y-auto"
                style={{ maxHeight: `${MAX_HEIGHT}px` }}
              >
                <div className="relative">
                  <Textarea
                    id="ai-input-04"
                    value={value}
                    placeholder=""
                    className="w-full rounded-2xl rounded-b-none px-4 py-3 border-none dark:text-white resize-none focus-visible:ring-0 leading-[1.2]"
                    style={{ backgroundColor: 'rgb(22, 22, 22)' }}
                    ref={textareaRef}
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
                    <div className="absolute left-4 top-3">
                      <AnimatedPlaceholder showSearch={showSearch} />
                    </div>
                  )}
                </div>
              </div>
              <div className="h-12 bg-black/5 dark:bg-white/5 rounded-b-xl">
                <div className="absolute left-3 bottom-3 flex items-center gap-2">
                  <label
                    className={cn(
                      "cursor-pointer relative rounded-full p-2 bg-black/5 dark:bg-white/5",
                      imagePreview
                        ? "bg-[#ff3f17]/15 border border-[#ff3f17] text-[#ff3f17]"
                        : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleChange}
                      className="hidden"
                    />
                    <Paperclip
                      className={cn(
                        "w-4 h-4 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors",
                        imagePreview && "text-[#ff3f17]"
                      )}
                    />
                    {imagePreview && (
                      <div className="absolute w-[100px] h-[100px] top-14 -left-4">
                        <Image
                          className="object-cover rounded-2xl"
                          src={imagePreview || "/picture1.jpeg"}
                          height={500}
                          width={500}
                          alt="additional image"
                        />
                        <button
                          onClick={handleClose}
                          className="bg-[#e8e8e8] text-[#464646] absolute -top-1 -left-1 shadow-3xl rounded-full rotate-45"
                        >
                          <Plus className="w-4 h-4" />
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
                      "rounded-full transition-all flex items-center gap-2 px-1.5 py-1 border h-8",
                      showSearch
                        ? "bg-[#ff3f17]/15 border-[#ff3f17] text-[#ff3f17]"
                        : "bg-black/5 dark:bg-white/5 border-transparent text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
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
                        <Globe
                          className={cn(
                            "w-4 h-4",
                            showSearch ? "text-[#ff3f17]" : "text-inherit"
                          )}
                        />
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
                          className="text-sm overflow-hidden whitespace-nowrap text-[#ff3f17] flex-shrink-0"
                        >
                          Search
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
                <div className="absolute right-3 bottom-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className={cn(
                      "rounded-full p-2 transition-colors",
                      value
                        ? "bg-[#ff3f17]/15 text-[#ff3f17]"
                        : "bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}
