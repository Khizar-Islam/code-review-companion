"use client";

import { motion } from "framer-motion";
import { ReviewHistoryCard } from "./ReviewHistoryCard";
import type { Review } from "@/lib/types";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export function ReviewList({ reviews }: { reviews: Review[] }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-4">
      {reviews.map((review) => (
        <motion.div key={review.id} variants={item}>
          <ReviewHistoryCard review={review} />
        </motion.div>
      ))}
    </motion.div>
  );
}
