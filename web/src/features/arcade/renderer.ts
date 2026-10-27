import type { ArcadeGameState, ArcadeTarget } from "./types";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface LaserBeam {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  alpha: number;
}

export class ArcadeRenderer {
  private particles: Particle[] = [];
  private laserBeams: LaserBeam[] = [];

  public addExplosion(x: number, y: number, color = "#10b981", count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color,
        size: Math.random() * 3 + 2,
        life: 0,
        maxLife: Math.random() * 20 + 20,
      });
    }
  }

  public addLaserBeam(startX: number, startY: number, endX: number, endY: number) {
    this.laserBeams.push({
      startX,
      startY,
      endX,
      endY,
      alpha: 1.0,
    });
  }

  public updateEffects() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update laser beams
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const beam = this.laserBeams[i];
      beam.alpha -= 0.1;
      if (beam.alpha <= 0) {
        this.laserBeams.splice(i, 1);
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    state: ArcadeGameState,
    width: number,
    height: number,
    isDarkMode = true
  ) {
    // 1. Clear background
    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    if (isDarkMode) {
      bgGrad.addColorStop(0, "#09090b");
      bgGrad.addColorStop(1, "#18181b");
    } else {
      bgGrad.addColorStop(0, "#f8fafc");
      bgGrad.addColorStop(1, "#e2e8f0");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Lane guides
    const laneX = [width * 0.22, width * 0.5, width * 0.78];
    ctx.strokeStyle = isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    for (const lx of laneX) {
      ctx.beginPath();
      ctx.moveTo(lx, 20);
      ctx.lineTo(lx, height - 70);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3. Danger threshold line at bottom
    const dangerY = height - 85;
    ctx.strokeStyle = "rgba(244, 63, 94, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, dangerY);
    ctx.lineTo(width - 10, dangerY);
    ctx.stroke();

    // 4. Spaceship / Cannon at bottom
    const cannonX = width / 2;
    const cannonY = height - 35;
    ctx.fillStyle = isDarkMode ? "#14b8a6" : "#0d9488";
    ctx.beginPath();
    ctx.arc(cannonX, cannonY, 18, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isDarkMode ? "#f59e0b" : "#d97706";
    ctx.beginPath();
    ctx.arc(cannonX, cannonY - 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // 5. Draw Laser Beams
    for (const beam of this.laserBeams) {
      ctx.strokeStyle = `rgba(20, 184, 166, ${beam.alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(beam.startX, beam.startY);
      ctx.lineTo(beam.endX, beam.endY);
      ctx.stroke();
    }

    // 6. Draw Active Targets
    for (const target of state.activeTargets) {
      if (target.resolved) continue;

      const lx = laneX[target.lane] || width / 2;
      const playableHeight = dangerY - 40;
      const ty = 40 + target.progress * playableHeight;
      const isLocked = state.lockedTargetId === target.id;

      this.drawTargetPod(ctx, target, lx, ty, isLocked, state, isDarkMode);
    }

    // 7. Draw Particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  private drawTargetPod(
    ctx: CanvasRenderingContext2D,
    target: ArcadeTarget,
    x: number,
    y: number,
    isLocked: boolean,
    state: ArcadeGameState,
    isDarkMode: boolean
  ) {
    const podWidth = Math.min(180, Math.max(120, target.canonicalAnswer.length * 14 + 30));
    const podHeight = 54;
    const left = x - podWidth / 2;
    const top = y - podHeight / 2;

    // Glowing border if locked
    if (isLocked) {
      ctx.shadowColor = "#14b8a6";
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    // Background pod
    ctx.fillStyle = isDarkMode
      ? isLocked
        ? "rgba(15, 118, 110, 0.9)"
        : "rgba(39, 39, 42, 0.92)"
      : isLocked
      ? "rgba(204, 251, 241, 0.95)"
      : "rgba(255, 255, 255, 0.95)";

    ctx.strokeStyle = isLocked
      ? "#14b8a6"
      : isDarkMode
      ? "rgba(255, 255, 255, 0.15)"
      : "rgba(0, 0, 0, 0.15)";
    ctx.lineWidth = isLocked ? 2.5 : 1.5;

    this.roundRect(ctx, left, top, podWidth, podHeight, 14);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Content inside pod
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (state.mode === "typing") {
      // Typing mode: display the English term
      const term = target.canonicalAnswer;
      const typedLen = isLocked ? Math.min(term.length, state.typedBuffer.length) : 0;
      const typedPart = term.slice(0, typedLen);
      const remainingPart = term.slice(typedLen);

      ctx.font = "bold 16px Inter, system-ui, sans-serif";

      if (isLocked && typedLen > 0) {
        // Measure text widths for dual-color rendering
        const totalW = ctx.measureText(term).width;
        const typedW = ctx.measureText(typedPart).width;
        const startX = x - totalW / 2;

        ctx.textAlign = "left";
        // Typed part (bright emerald)
        ctx.fillStyle = "#10b981";
        ctx.fillText(typedPart, startX, y - 6);

        // Remaining part
        ctx.fillStyle = isDarkMode ? "#ffffff" : "#0f172a";
        ctx.fillText(remainingPart, startX + typedW, y - 6);
      } else {
        ctx.fillStyle = isDarkMode ? "#ffffff" : "#0f172a";
        ctx.fillText(term, x, y - 6);
      }

      // Vietnamese meaning hint below
      ctx.font = "10px Inter, system-ui, sans-serif";
      ctx.fillStyle = isDarkMode ? "#a1a1aa" : "#64748b";
      ctx.fillText(target.meaning, x, y + 14);
    } else {
      // Recall mode: display Vietnamese meaning prominently
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillStyle = isDarkMode ? "#ffffff" : "#0f172a";
      ctx.fillText(target.meaning, x, y - 8);

      // Letter placeholders or hint
      ctx.font = "bold 12px monospace";
      if (target.hintText) {
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(target.hintText, x, y + 12);
      } else if (isLocked && state.typedBuffer.length > 0) {
        ctx.fillStyle = "#10b981";
        ctx.fillText(state.typedBuffer, x, y + 12);
      } else {
        const slots = "_ ".repeat(target.canonicalAnswer.length).trim();
        ctx.fillStyle = isDarkMode ? "#71717a" : "#94a3b8";
        ctx.fillText(slots, x, y + 12);
      }
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Hit detection for mouse/touch clicks on targets.
   */
  public getTargetAtCoords(
    state: ArcadeGameState,
    width: number,
    height: number,
    clickX: number,
    clickY: number
  ): ArcadeTarget | null {
    const laneX = [width * 0.22, width * 0.5, width * 0.78];
    const dangerY = height - 85;
    const playableHeight = dangerY - 40;

    for (let i = state.activeTargets.length - 1; i >= 0; i--) {
      const target = state.activeTargets[i];
      if (target.resolved) continue;

      const lx = laneX[target.lane] || width / 2;
      const ty = 40 + target.progress * playableHeight;
      const podWidth = Math.min(180, Math.max(120, target.canonicalAnswer.length * 14 + 30));
      const podHeight = 54;

      if (
        clickX >= lx - podWidth / 2 &&
        clickX <= lx + podWidth / 2 &&
        clickY >= ty - podHeight / 2 &&
        clickY <= ty + podHeight / 2
      ) {
        return target;
      }
    }

    return null;
  }
}
