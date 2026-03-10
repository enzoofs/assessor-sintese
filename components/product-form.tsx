"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Search, Plus } from "lucide-react";

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

interface ProductFormProps {
  onSubmit: (code: string, brand: string) => void;
  isProcessing: boolean;
}

export function ProductForm({ onSubmit, isProcessing }: ProductFormProps) {
  const [code, setCode] = useState("");
  const [brand, setBrand] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !brand) return;
    onSubmit(code.trim(), brand);
    setCode("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Codigo do fabricante
        </label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ex: BR0200500, M085I-100G..."
          disabled={isProcessing}
        />
      </div>
      <div className="w-52">
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Marca
        </label>
        <Select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
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
      <Button type="submit" disabled={!code.trim() || !brand || isProcessing}>
        <Plus className="w-4 h-4 mr-1.5" />
        Buscar
      </Button>
    </form>
  );
}
