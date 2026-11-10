"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askTutor } from "./tutor-launcher";

export function AskButton({ question, label = "Ask the tutor" }: { question: string; label?: string }) {
  return (
    <Button variant="outline" onClick={() => askTutor(question)}>
      <Sparkles className="text-learn" /> {label}
    </Button>
  );
}
