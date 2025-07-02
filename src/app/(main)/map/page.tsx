import { MapCalculator } from "@/components/map-calculator";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function MapPage() {
  return (
    <div className="h-full w-full relative">
      <Suspense fallback={<Skeleton className="h-full w-full" />}>
        <MapCalculator />
      </Suspense>
    </div>
  );
}
