import { GraphCalculator } from "@/components/graph-calculator";

export default function GraphPage() {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-4xl">
        <GraphCalculator />
      </div>
    </div>
  );
}
