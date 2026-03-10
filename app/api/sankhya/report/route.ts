import { NextResponse } from "next/server";
import { generateReport } from "@/lib/sankhya-data";

export async function GET() {
  const report = generateReport();
  return NextResponse.json(report);
}
