"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useReviewsStats() {
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get average rating and count from executor_rating view
        const { data, error } = await supabase
          .from("executor_rating")
          .select("rating, reviews_count");

        if (error) throw error;

        if (data && data.length > 0) {
          // Calculate overall average from all executors
          const totalReviews = data.reduce((sum, ex) => sum + (ex.reviews_count || 0), 0);
          const weightedRatingSum = data.reduce((sum, ex) => sum + (ex.rating || 0) * (ex.reviews_count || 0), 0);
          const averageRating = totalReviews > 0 ? weightedRatingSum / totalReviews : 0;
          
          setStats({
            averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            totalReviews,
          });
        }
      } catch (err) {
        console.error("Error fetching reviews stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { ...stats, loading };
}
