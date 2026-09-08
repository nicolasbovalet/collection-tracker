import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Disc3 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { getStats } from "../api/stats";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

function StatTile({ label, value }) {
  return (
    <motion.div variants={item}>
      <Card className="min-w-40 flex-1">
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-40" />
      <div className="mb-8 flex flex-wrap gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 min-w-40 flex-1 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mb-4 h-6 w-48" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) {
    return <DashboardSkeleton />;
  }

  const totalValueLabel =
    stats.total_estimated_value !== null
      ? `$${Number(stats.total_estimated_value).toFixed(2)}`
      : "—";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Dashboard</h1>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mb-8 flex flex-wrap gap-4"
      >
        <StatTile label="Collection" value={stats.collection_count} />
        <StatTile label="Wishlist" value={stats.wishlist_count} />
        <StatTile label="Estimated Value" value={totalValueLabel} />
      </motion.div>

      <h2 className="mb-3 text-lg font-medium tracking-tight">Recent Additions</h2>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4"
      >
        {stats.recent_additions.map((release) => (
          <motion.div key={release.id} variants={item}>
            <Card
              size="sm"
              className="group overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              {release.cover_art_url ? (
                <img
                  src={release.cover_art_url}
                  alt={`${release.artist} - ${release.title}`}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
                  <Disc3 className="size-8" strokeWidth={1.5} />
                </div>
              )}
              <CardContent className="space-y-0.5 pt-3">
                <p className="truncate text-sm font-medium" title={release.title}>
                  {release.title}
                </p>
                <p className="truncate text-xs text-muted-foreground" title={release.artist}>
                  {release.artist}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
