"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Select } from "./ui/select";
import { ListPlus } from "lucide-react";

const BRANDS = [
  "ACCURIS",
  "ADS",
  "BENCHMARK",
  "BIO-RAD",
  "BIOCARE",
  "BIOTECH RABBIT",
  "HERMLE",
  "HIMEDIA",
  "IDT",
  "IMPLEN",
  "INVITEK",
  "INVIVOGEN",
  "MTC",
  "PCR BIOSYSTEMS",
  "THISTLE",
  "ZYMO",
];

interface BatchInputProps {
  onSubmitBatch: (items: { code: string; brand: string }[]) => void;
  isProcessing: boolean;
}

export function BatchInput({ onSubmitBatch, isProcessing }: BatchInputProps) {
  const [text, setText] = useState("");
  const [defaultBrand, setDefaultBrand] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const items = lines.map((line) => {
      // Try to parse "CODE | BRAND" or "CODE, BRAND" or "CODE\tBRAND"
      const separators = ["|", ",", "\t", ";"];
      for (const sep of separators) {
        if (line.includes(sep)) {
          const [code, brand] = line.split(sep).map((s) => s.trim());
          if (code && brand) {
            // Check if brand is valid
            const matchedBrand = BRANDS.find(
              (b) => b.toUpperCase() === brand.toUpperCase()
            );
            return { code, brand: matchedBrand || defaultBrand };
          }
        }
      }
      // No separator found, use default brand
      return { code: line, brand: defaultBrand };
    });

    const validItems = items.filter((i) => i.code && i.brand);
    if (validItems.length > 0) {
      onSubmitBatch(validItems);
      setText("");
    }
  }

  const lineCount = text
    .split("\n")
    .filter((l) => l.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Codigos em lote{" "}
          <span className="text-muted-foreground font-normal">
            (um por linha, formato: CODIGO | MARCA ou apenas CODIGO)
          </span>
        </label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`BR0200500 | BIOTECH RABBIT\nM085I-100G | HIMEDIA\nMCA1038A700\n1725212`}
          rows={6}
          disabled={isProcessing}
        />
      </div>
      <div className="flex gap-3 items-end">
        <div className="w-52">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Marca padrao{" "}
            <span className="text-muted-foreground font-normal">
              (para linhas sem marca)
            </span>
          </label>
          <Select
            value={defaultBrand}
            onChange={(e) => setDefaultBrand(e.target.value)}
            disabled={isProcessing}
          >
            <option value="">Selecione...</option>
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={lineCount === 0 || isProcessing}>
          <ListPlus className="w-4 h-4 mr-1.5" />
          Processar {lineCount > 0 ? `${lineCount} items` : ""}
        </Button>
      </div>
    </form>
  );
}
