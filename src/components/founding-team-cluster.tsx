"use client";

import { BusinessHexMark } from "@/components/business-hex-mark";
import { GrokBotFace } from "@/components/grok-bot-face";

const BOT_SIZE = 62;

export function FoundingTeamCluster() {
  return (
    <div className="founding-team-cluster" aria-hidden="true">
      <div className="founding-team-cluster__hex-wrap">
        <BusinessHexMark
          className="founding-team-cluster__hex"
          shapeClassName="bizos-hex-shape--black"
          aria-hidden
        />
      </div>
      <div className="founding-team-cluster__bot founding-team-cluster__bot--left">
        <GrokBotFace
          seed={0}
          lookBias="right"
          size={BOT_SIZE}
          discClassName="grok-bot-face__disc--accent"
        />
      </div>
      <div className="founding-team-cluster__bot founding-team-cluster__bot--right">
        <GrokBotFace
          seed={1}
          lookBias="left"
          size={BOT_SIZE}
          discClassName="grok-bot-face__disc--slate"
        />
      </div>
      <div className="founding-team-cluster__bot founding-team-cluster__bot--bottom">
        <GrokBotFace
          seed={2}
          lookBias="up"
          size={BOT_SIZE}
          discClassName="grok-bot-face__disc--ink"
        />
      </div>
    </div>
  );
}