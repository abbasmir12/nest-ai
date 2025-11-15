"use client";

import { SimplePromptInput } from "@/components/SimplePromptInput";
import { Sparkles } from "lucide-react";

export default function SimpleDemoPage() {
  const handleSubmit = (message: string) => {
    console.log("Message submitted:", message);
    alert(`You asked: ${message}`);
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#0A0A0A] overflow-hidden p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mb-6 shadow-2xl shadow-purple-500/20">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Simple Prompt Input
          </h1>
          <p className="text-gray-400 text-lg">
            Clean, minimal, and focused input component
          </p>
        </div>

        <SimplePromptInput
          onSubmit={handleSubmit}
          placeholder="Type your message here..."
        />

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Press <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10">Enter</kbd> to send, 
            <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 ml-1">Shift + Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}
