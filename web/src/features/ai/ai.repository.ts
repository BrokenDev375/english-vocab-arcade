import "server-only";
import { getServerEnv } from "@/lib/env.server";

import { computeAiCacheKey, CURRENT_PROMPT_VERSION, CURRENT_SCHEMA_VERSION } from "./cache-key";
export { computeAiCacheKey, CURRENT_PROMPT_VERSION, CURRENT_SCHEMA_VERSION } from "./cache-key";
import { getSupabaseAdminClient } from "@/lib/supabase/admin.server";
import {
  generateAiBatchContent,
  type TargetCardInfo,
  type AiProvider,
} from "./service.server";
import type { AiMode } from "./schemas";

export interface GetOrCreateAiBatchParams {
  userId: string;
  setId: string;
  mode: AiMode;
  cards: TargetCardInfo[];
  contentRevision: number;
  targetLevel?: "A1" | "A2" | "B1";
  nonce?: number;
  injectedProvider?: AiProvider;
  dailyLimit?: number;
  minuteLimit?: number;
}

export interface AiBatchResult {
  status: "ready" | "pending" | "quota_exceeded" | "rate_limited" | "failed";
  batchId?: string;
  output?: unknown;
  cached?: boolean;
  retryAfterSeconds?: number;
  code?: string;
  error?: string;
}

/**
 * Core cache & quota coordinator.
 * Reserves lease via atomic reserve_ai_batch_v1 RPC, generates if lease acquired, and finalizes.
 */
export async function getOrCreateAiBatch(
  params: GetOrCreateAiBatchParams
): Promise<AiBatchResult> {
  const {
    userId,
    setId,
    mode,
    cards,
    contentRevision,
    targetLevel = "A2",
    nonce = 0,
    injectedProvider,
  } = params;

  const env = getServerEnv();
  const dailyLimit = params.dailyLimit ?? env.AI_DAILY_BATCHES_PER_USER;
  const minuteLimit = params.minuteLimit ?? env.AI_OPERATIONS_PER_MINUTE_PER_USER;
  if (!env.AI_ENABLED && !injectedProvider) return { status: "failed", code: "AI_DISABLED", error: "Tính năng AI đang tắt." };
  const adminClient = getSupabaseAdminClient();
  const cacheKey = computeAiCacheKey({
    userId,
    setId,
    contentRevision,
    mode,
    cards,
    targetLevel,
    nonce,
  });

  const cardIds = cards.map((c) => c.id);
  const leaseToken = crypto.randomUUID();

  // 1. Call atomic reserve RPC
  const { data: reserveData, error: reserveError } = await adminClient.rpc(
    "reserve_ai_batch_v1",
    {
      p_user_id: userId,
      p_set_id: setId,
      p_mode: mode,
      p_card_ids: cardIds,
      p_content_revision: contentRevision,
      p_cache_key: cacheKey,
      p_prompt_version: CURRENT_PROMPT_VERSION,
      p_schema_version: CURRENT_SCHEMA_VERSION,
      p_lease_token: leaseToken,
      p_daily_limit: dailyLimit,
      p_minute_limit: minuteLimit,
    }
  );

  if (reserveError) {
    return {
      status: "failed",
      code: "RPC_ERROR",
      error: reserveError.message,
    };
  }

  interface ReserveRpcResponse {
    status: "ready" | "pending" | "lease_acquired" | "quota_exceeded" | "rate_limited";
    batch_id: string;
    output?: unknown;
    lease_token?: string;
    retry_after?: string;
    code?: string;
    error?: string;
  }

  const rpcRes = reserveData as unknown as ReserveRpcResponse;

  // Case A: Cache hit — already ready
  if (rpcRes.status === "ready") {
    return {
      status: "ready",
      batchId: rpcRes.batch_id,
      output: rpcRes.output,
      cached: true,
    };
  }

  // Case B: Pending with unexpired active lease — tell caller to wait
  if (rpcRes.status === "pending") {
    return {
      status: "pending",
      batchId: rpcRes.batch_id,
      retryAfterSeconds: 2,
    };
  }

  // Case C: Quota exceeded
  if (rpcRes.status === "quota_exceeded") {
    return {
      status: "quota_exceeded",
      code: rpcRes.code || "DAILY_QUOTA_EXCEEDED",
      error: rpcRes.error || "Hạn mức tạo bài tập AI trong ngày đã hết",
    };
  }

  // Case D: Rate limited
  if (rpcRes.status === "rate_limited") {
    return {
      status: "rate_limited",
      code: rpcRes.code || "RATE_LIMITED",
      error: rpcRes.error || "Quá nhiều yêu cầu trong phút này. Vui lòng chờ.",
    };
  }

  // Case E: Lease acquired — this invocation must generate content
  const batchId = rpcRes.batch_id;

  try {
    const genResult = await generateAiBatchContent(mode, cards, {
      targetLevel,
      injectedProvider,
      timeoutBudgetMs: 20000,
      reserveProviderCall: injectedProvider ? undefined : async () => {
        const { data, error } = await adminClient.rpc("reserve_ai_provider_call_v1", {
          p_user_id: userId, p_global_daily_limit: env.AI_GLOBAL_DAILY_CALL_LIMIT,
          p_global_minute_limit: env.AI_GLOBAL_MINUTE_CALL_LIMIT, p_user_daily_limit: env.AI_USER_DAILY_CALL_LIMIT,
        });
        if (error || !(data as { success?: boolean })?.success) throw new Error("Provider budget exhausted");
      },
    });

    if (genResult.success) {
      // Finalize batch as ready
      const { data: finalizeData, error: finalizeError } = await adminClient.rpc("finalize_ai_batch_v1", {
        p_batch_id: batchId,
        p_lease_token: leaseToken,
        p_status: "ready",
        p_output: genResult.data as import("@/types/database.generated").Json,
        p_model_id: genResult.modelId || "gemini-2.5-flash",
      });

      const finalizeRes = finalizeData as { success?: boolean; code?: string; error?: string } | null;

      if (finalizeError || !finalizeRes || !finalizeRes.success) {
        return {
          status: "failed",
          batchId,
          code: finalizeRes?.code || "FINALIZE_FAILED",
          error: finalizeError?.message || finalizeRes?.error || "Không thể lưu kết quả AI vào bộ đệm",
        };
      }

      return {
        status: "ready",
        batchId,
        output: genResult.data,
        cached: false,
      };
    } else {
      // Finalize batch as failed
      await adminClient.rpc("finalize_ai_batch_v1", {
        p_batch_id: batchId,
        p_lease_token: leaseToken,
        p_status: "failed",
        p_error_code: genResult.errorCode || "GEN_FAILED",
      });

      return {
        status: "failed",
        batchId,
        code: genResult.errorCode,
        error: genResult.error,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await adminClient.rpc("finalize_ai_batch_v1", {
      p_batch_id: batchId,
      p_lease_token: leaseToken,
      p_status: "failed",
      p_error_code: "UNCAUGHT_ERROR",
    });

    return {
      status: "failed",
      batchId,
      code: "UNCAUGHT_ERROR",
      error: errorMsg,
    };
  }
}

/**
 * Reads an AI batch by ID, scoped to user.
 */
export async function getAiBatchById(userId: string, batchId: string) {
  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient
    .from("ai_batches")
    .select("id, user_id, set_id, mode, status, output, model_id, error_code, retry_after, updated_at")
    .eq("id", batchId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
