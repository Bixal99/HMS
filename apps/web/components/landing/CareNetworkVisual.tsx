"use client";

import { useEffect, useRef } from "react";
import { animateCareNetwork } from "@/lib/landing-motion";
import { cn } from "@/lib/utils";

type CareNetworkVisualProps = {
  className?: string;
  doctorCount?: number;
  departmentCount?: number;
};

const NODES = [
  { id: "booking", label: "Booking", cx: 92, cy: 78, mobile: true },
  { id: "clinic", label: "Clinic", cx: 248, cy: 54, mobile: true },
  { id: "lab", label: "Lab", cx: 392, cy: 98, mobile: true },
  { id: "pharmacy", label: "Pharmacy", cx: 318, cy: 214, mobile: false },
  { id: "wards", label: "Wards", cx: 148, cy: 228, mobile: false },
] as const;

/**
 * Original kinetic care-network SVG — ECG spine + orbiting care nodes.
 * Desktop shows full graph; mobile simplifies to ECG + key labels.
 */
export function CareNetworkVisual({
  className,
  doctorCount = 0,
  departmentCount = 0,
}: CareNetworkVisualProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    return animateCareNetwork(rootRef.current);
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn("mkt-care-network", className)}
      aria-hidden
      data-cursor="pointer"
    >
      <div className="mkt-care-network__frame">
        <p className="mkt-care-network__live">
          <span className="mkt-care-network__pulse" />
          Live care graph
        </p>
        <svg
          className="mkt-care-network__svg"
          viewBox="0 0 480 280"
          fill="none"
          role="presentation"
        >
          <defs>
            <linearGradient id="mkt-ecg-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1463ff" stopOpacity="0.2" />
              <stop offset="42%" stopColor="#1463ff" />
              <stop offset="72%" stopColor="#12c7d8" />
              <stop offset="100%" stopColor="#12c7d8" stopOpacity="0.25" />
            </linearGradient>
            <radialGradient id="mkt-node-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1463ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1463ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Soft orbital rings — desktop only via CSS */}
          <g className="mkt-care-network__orbits">
            <ellipse
              cx="240"
              cy="145"
              rx="168"
              ry="96"
              stroke="rgb(7 28 51 / 0.1)"
              strokeDasharray="4 8"
            />
            <ellipse
              cx="240"
              cy="145"
              rx="118"
              ry="68"
              stroke="rgb(20 99 255 / 0.14)"
              strokeDasharray="2 6"
            />
          </g>

          {/* Connection spines */}
          <g className="mkt-care-network__links" stroke="rgb(20 99 255 / 0.22)" strokeWidth="1.25">
            <path d="M92 78 L248 54 L392 98" />
            <path d="M248 54 L318 214 L148 228 L92 78" />
            <path d="M392 98 L318 214" />
          </g>

          {/* ECG path through the network */}
          <path
            data-care-ecg
            className="mkt-care-network__ecg"
            d="M28 150 H86 L104 118 L126 196 L152 88 L178 168 L198 150 H268 L286 128 L304 172 L324 150 H452"
            stroke="url(#mkt-ecg-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {NODES.map((node) => (
            <g
              key={node.id}
              data-care-node
              className={
                node.mobile
                  ? "mkt-care-network__node"
                  : "mkt-care-network__node mkt-care-network__node--desktop"
              }
              transform={`translate(${node.cx} ${node.cy})`}
            >
              <circle r="22" fill="url(#mkt-node-glow)" opacity="0.85" />
              <circle
                r="9"
                fill="#fbfcfd"
                stroke="#1463ff"
                strokeWidth="1.75"
              />
              <circle r="3.5" fill="#1463ff" />
              <text
                y="28"
                textAnchor="middle"
                className="mkt-care-network__label"
              >
                {node.label}
              </text>
            </g>
          ))}
        </svg>

        <div className="mkt-care-network__stats">
          <div>
            <p className="mkt-care-network__stat-value">{doctorCount || "—"}</p>
            <p className="mkt-care-network__stat-label">Clinicians online</p>
          </div>
          <div>
            <p className="mkt-care-network__stat-value">
              {departmentCount || "—"}
            </p>
            <p className="mkt-care-network__stat-label">Specialties linked</p>
          </div>
          <div className="mkt-care-network__stat-status">
            <p className="mkt-care-network__stat-value">Sync</p>
            <p className="mkt-care-network__stat-label">One patient record</p>
          </div>
        </div>
      </div>
    </div>
  );
}
