"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import { CheckCircle2, XCircle, Loader2, Trash2, Star, User, Calendar } from "lucide-react";
import { cn } from "../../../lib/utils";

interface DeletionRequest {
  id: string;
  review_id: string;
  client_id: string;
  executor_id: string;
  order_id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at?: string;
  review?: {
    rating: number;
    comment: string;
    created_at: string;
  };
  client?: {
    name?: string;
    phone?: string;
  };
  executor?: {
    name?: string;
    phone?: string;
  };
}

export default function ReviewDeletionRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const isAuth = localStorage.getItem('admin_auth');
    if (!isAuth) {
      router.replace('/admin/login');
      return;
    }
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: reqs, error } = await supabase
        .from("review_deletion_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with review, client and executor data
      const enriched = await Promise.all(
        (reqs || []).map(async (req) => {
          const [{ data: review }, { data: client }, { data: executor }] = await Promise.all([
            supabase.from("reviews").select("rating, comment, created_at").eq("id", req.review_id).maybeSingle(),
            supabase.from("users").select("name, phone").eq("id", req.client_id).maybeSingle(),
            supabase.from("executors").select("name, phone").eq("id", req.executor_id).maybeSingle(),
          ]);
          return { ...req, review, client, executor };
        })
      );

      setRequests(enriched);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    const adminId = localStorage.getItem("admin_id");
    if (!adminId) {
      alert("Не авторизован");
      return;
    }

    setProcessing(requestId);
    try {
      const { error } = await supabase.rpc("approve_review_deletion", {
        p_request_id: requestId,
        p_admin_id: adminId,
      });

      if (error) throw error;

      // Refresh
      await fetchRequests();
      alert("Отзыв удален");
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const adminId = localStorage.getItem("admin_id");
    if (!adminId) {
      alert("Не авторизован");
      return;
    }

    setProcessing(requestId);
    try {
      const { error } = await supabase.rpc("reject_review_deletion", {
        p_request_id: requestId,
        p_admin_id: adminId,
      });

      if (error) throw error;

      await fetchRequests();
      alert("Запрос отклонен");
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tight">Запросы на удаление отзывов</h1>
          <div className="flex gap-2">
            <button
              onClick={fetchRequests}
              className="px-4 py-2 bg-white/5 rounded-lg text-xs font-black uppercase hover:bg-white/10 transition-colors"
            >
              Обновить
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-white/20" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <Trash2 className="w-12 h-12 mx-auto mb-4" />
            <p className="text-sm font-black uppercase">Нет запросов на удаление</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white/[0.03] border rounded-2xl p-6",
                  req.status === "pending"
                    ? "border-yellow-500/30"
                    : req.status === "approved"
                    ? "border-green-500/30"
                    : "border-red-500/30"
                )}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Review Info */}
                  <div className="flex-1 space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-[10px] font-black uppercase",
                          req.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : req.status === "approved"
                            ? "bg-green-500/20 text-green-500"
                            : "bg-red-500/20 text-red-500"
                        )}
                      >
                        {req.status === "pending"
                          ? "Ожидает"
                          : req.status === "approved"
                          ? "Одобрено"
                          : "Отклонено"}
                      </span>
                      <span className="text-[10px] text-white/30 font-bold">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {new Date(req.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>

                    {/* Review Content */}
                    {req.review && (
                      <div className="bg-white/[0.02] rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={cn(
                                  "w-4 h-4",
                                  s <= req.review!.rating
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-white/10"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-white/40 ml-2">
                            {new Date(req.review.created_at).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed">
                          {req.review.comment || "Без комментария"}
                        </p>
                      </div>
                    )}

                    {/* Users */}
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2 text-white/50">
                        <User className="w-3.5 h-3.5" />
                        <span>Клиент: {req.client?.name || "Неизвестно"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/50">
                        <User className="w-3.5 h-3.5" />
                        <span>Исполнитель: {req.executor?.name || "Неизвестно"}</span>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                      <p className="text-[10px] text-red-400/60 uppercase font-black mb-1">
                        Причина удаления:
                      </p>
                      <p className="text-sm text-white/70">{req.reason}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {req.status === "pending" && (
                    <div className="flex lg:flex-col gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={processing === req.id}
                        className="flex-1 lg:flex-none px-4 py-3 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-black text-xs uppercase rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {processing === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Одобрить
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={processing === req.id}
                        className="flex-1 lg:flex-none px-4 py-3 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-black font-black text-xs uppercase rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        {processing === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Отклонить
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
