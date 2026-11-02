import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import {
  SetStudyHub,
  type SetStudyHubProps,
} from "@/components/sets/SetStudyHub";
import { DEMO_SETS, DEMO_CARDS } from "@/data/demo/vocabulary.demo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export function generateStaticParams() {
  return DEMO_SETS.map((set) => ({ id: set.id }));
}

async function SetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demo = DEMO_SETS.find((set) => set.id === id);
  let props: SetStudyHubProps;
  if (demo) {
    props = {
      set: {
        id,
        title: demo.title,
        description: demo.description || "",
        cefrLevel: demo.cefrLevel,
        topic: demo.topic,
        isPublic: true,
        isOwner: false,
        isDemo: true,
      },
      cards: demo.cards || DEMO_CARDS,
    };
  } else {
    const supabase = await createSupabaseServerClient();
    const { data: set } = await supabase
      .from("learning_sets")
      .select("id,owner_id,title,description,cefr_level,topic,is_public")
      .eq("id", id)
      .maybeSingle();
    if (!set) notFound();
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase
        .from("vocabulary_cards")
        .select(
          "id,term,meaning_vi,part_of_speech,ipa,example_en,example_vi,accepted_answers,position",
        )
        .eq("set_id", id)
        .order("position")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw new Error("Không thể tải đầy đủ thẻ. Vui lòng thử lại.");
      rows.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    props = {
      set: {
        id,
        title: set.title,
        description: set.description || "",
        cefrLevel: set.cefr_level,
        topic: set.topic,
        isPublic: set.is_public,
        isOwner: user?.id === set.owner_id,
        isDemo: false,
      },
      cards: rows.map((card) => ({
        id: card.id,
        term: card.term,
        meaningVi: card.meaning_vi,
        partOfSpeech: card.part_of_speech,
        ipa: card.ipa,
        exampleEn: card.example_en,
        exampleVi: card.example_vi,
        acceptedAnswers: Array.isArray(card.accepted_answers)
          ? card.accepted_answers.filter(
              (answer): answer is string => typeof answer === "string",
            )
          : [card.term],
      })),
    };
    if (user) {
      const { data: latest } = await supabase
        .from("study_sessions")
        .select("mode,state")
        .eq("set_id", id)
        .eq("user_id", user.id)
        .in("status", ["active", "paused"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const state = latest?.state as {
        clientState?: { currentIndex?: number };
      } | null;
      if (latest)
        props.resume = {
          mode: latest.mode,
          index: Number(state?.clientState?.currentIndex) || 0,
        };
    }
  }
  return (
    <AppShell>
      <SetStudyHub {...props} />
    </AppShell>
  );
}

export default function SetDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p role="status">Đang tải học phần...</p>
        </AppShell>
      }
    >
      <SetDetail {...props} />
    </Suspense>
  );
}
