import { Calculator } from "@/components/calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CalculatorPage() {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-sm">
        <Calculator />
      </div>
    </div>
  );
}
