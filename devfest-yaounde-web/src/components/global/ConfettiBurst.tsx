"use client";

import { useState } from "react";
import { confettiPiece, confettiPieceStyle } from "@/lib/motion";

const COLORS = [
  "bg-blue-halftone",
  "bg-green-halftone",
  "bg-halftone",
  "bg-red-halftone",
];

const PIECE_COUNT = 12;

interface Piece {
  id: number;
  color: string;
  x: number;
  y: number;
  r: number;
}

function generatePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const angle = (i / PIECE_COUNT) * Math.PI * 2;
    const distance = 28 + Math.random() * 24;
    return {
      id: i,
      color: COLORS[i % COLORS.length],
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      r: Math.random() * 180 - 90,
    };
  });
}

/**
 * Halftone confetti burst for the navbar logo easter egg — see
 * .claude/skills/devfest-animation/SKILL.md and /EASTER-EGGS.md.
 *
 * Random placement is generated once via a useState lazy initializer (runs
 * exactly once per mount, not on every render) rather than during render
 * itself or in an effect.
 */
export function ConfettiBurst() {
  const [pieces] = useState<Piece[]>(generatePieces);

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={`${confettiPiece} ${piece.color} absolute h-2 w-2 rounded-full`}
          style={confettiPieceStyle(piece.x, piece.y, piece.r)}
        />
      ))}
    </span>
  );
}
