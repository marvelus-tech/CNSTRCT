"use client";

import { BusinessHexMark } from "@/components/business-hex-mark";
import { GrokBotFace } from "@/components/grok-bot-face";

/** Proportional to cluster stage; was 86 when container was 21.5rem. */
const BOT_SIZE = 70;

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
          discClassName="grok-bot-face__disc--orange"
        />
      </div>
      <div className="founding-team-cluster__bot founding-team-cluster__bot--right">
        <GrokBotFace
          seed={1}
          lookBias="left"
          size={BOT_SIZE}
          discClassName="grok-bot-face__disc--blue"
        />
      </div>
      <div className="founding-team-cluster__bot founding-team-cluster__bot--bottom">
        <GrokBotFace
          seed={2}
          lookBias="up"
          size={BOT_SIZE}
          discClassName="grok-bot-face__disc--green"
        />
      </div>
    </div>
  );
}