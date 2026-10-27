"use client";

import React, { useRef, useEffect, useCallback } from "react";
import type { ArcadeGameState, ArcadeEvent } from "@/features/arcade/types";
import { ArcadeRenderer } from "@/features/arcade/renderer";
import { ARCADE_CONSTANTS } from "@/features/arcade/constants";

interface ArcadeCanvasProps {
  gameState: ArcadeGameState;
  onStep: (deltaMs: number) => void;
  onSelectTarget: (targetId: string) => void;
  onAutoPause: () => void;
  lastEvents: ArcadeEvent[];
}

export function ArcadeCanvas({
  gameState,
  onStep,
  onSelectTarget,
  onAutoPause,
  lastEvents,
}: ArcadeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ArcadeRenderer | null>(null);

  const gameStateRef = useRef<ArcadeGameState>(gameState);
  const onStepRef = useRef(onStep);
  const onAutoPauseRef = useRef(onAutoPause);

  useEffect(() => {
    gameStateRef.current = gameState;
    onStepRef.current = onStep;
    onAutoPauseRef.current = onAutoPause;
  });

  // Initialize renderer only once
  if (rendererRef.current == null) {
    rendererRef.current = new ArcadeRenderer();
  }

  // React to events (e.g. emit particle explosion or laser beam on hit)
  useEffect(() => {
    if (!rendererRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    for (const evt of lastEvents) {
      if (evt.type === "TARGET_HIT" && evt.payload?.targetId) {
        const target = gameStateRef.current.activeTargets.find(
          (t) => t.id === evt.payload?.targetId
        );
        const laneX = [width * 0.22, width * 0.5, width * 0.78];
        const tx = target ? laneX[target.lane] || width / 2 : width / 2;
        const ty = target ? 40 + target.progress * (height - 125) : height / 2;

        rendererRef.current.addLaserBeam(width / 2, height - 35, tx, ty);
        rendererRef.current.addExplosion(tx, ty, "#10b981", 20);
      } else if (evt.type === "TARGET_MISSED") {
        rendererRef.current.addExplosion(width / 2, height - 85, "#f43f5e", 15);
      }
    }
  }, [lastEvents]);

  // Handle visibility change (auto pause if tab hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameStateRef.current.phase === "running") {
        onAutoPauseRef.current();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Main game loop with requestAnimationFrame and fixed timestep
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (currentTime: number) => {
      const frameDelta = currentTime - lastTime;
      lastTime = currentTime;

      // Frame gap protection: if tab was backgrounded or delayed > 250ms, auto pause
      if (frameDelta > ARCADE_CONSTANTS.MAX_FRAME_GAP_MS) {
        if (gameStateRef.current.phase === "running") {
          onAutoPauseRef.current();
        }
        accumulator = 0;
      } else if (gameStateRef.current.phase === "running") {
        accumulator += frameDelta;

        // Advance in fixed steps
        const stepSize = ARCADE_CONSTANTS.FIXED_TIMESTEP_MS;
        while (accumulator >= stepSize) {
          onStepRef.current(stepSize);
          accumulator -= stepSize;
        }
      }

      // Render frame
      if (canvasRef.current && rendererRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          const width = canvas.width / dpr;
          const height = canvas.height / dpr;

          rendererRef.current.updateEffects();
          rendererRef.current.render(ctx, gameStateRef.current, width, height, true);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ResizeObserver for responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    handleResize();

    return () => observer.disconnect();
  }, []);

  // Handle canvas click to select target
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !rendererRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const target = rendererRef.current.getTargetAtCoords(
        gameStateRef.current,
        rect.width,
        rect.height,
        clickX,
        clickY
      );

      if (target) {
        onSelectTarget(target.id);
      }
    },
    [onSelectTarget]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[420px] sm:h-[480px] md:h-[540px] rounded-3xl overflow-hidden shadow-2xl border-2 border-zinc-800 bg-zinc-950"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full block cursor-crosshair touch-none select-none"
      />
    </div>
  );
}
