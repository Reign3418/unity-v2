"use client";

import { useState, useMemo } from "react";
import { 
  Shield, Swords, Target, Zap, Crown, Sparkles, Clock, 
  ArrowRight, ChevronRight, Info, Check, Flame, Layers, 
  Award, TrendingUp, HelpCircle, RefreshCw, AlertTriangle
} from "lucide-react";

// =========================================================================
// DATA REPOSITORY: EQUIPMENT PROGRESSION BY CLASS & TIER
// =========================================================================

const EQUIPMENT_DATA = {
  infantry: {
    name: "Infantry",
    icon: Shield,
    color: "amber",
    accentBg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    badgeGlow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    description: "The anvil of every murder ball. High Defense and Health ensure maximum Effective Hit Points (EHP) to trade positively and protect fragile archers.",
    tiers: {
      early: {
        title: "Early Game (KvK 1 Budget Starter)",
        subtitle: "Budget Green / Blue Craft • 63 Days Material Time",
        craftDays: "63 Days",
        description: "Zero legendary materials wasted. Combines the high health of Gatekeeper's Shield and Plate Greaves with the 4-piece Windswept speed bonus.",
        items: [
          {
            slot: "Weapon",
            name: "Gatekeeper's Shield",
            rarity: "blue",
            baseStats: { hp: 5, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 6.5, def: 0, atk: 0, mspd: 0 },
            note: "Priority #1 weapon in KvK 1. Blue health is strictly superior to purple attack."
          },
          {
            slot: "Helm",
            name: "Iron Helm",
            rarity: "green",
            baseStats: { hp: 0, def: 2, atk: 1, mspd: 0 },
            critStats: { hp: 0, def: 2.6, atk: 1.3, mspd: 0 },
            note: "Ultra-cheap placeholder until Witch's Lineage blueprint drops."
          },
          {
            slot: "Chest",
            name: "Windswept Breastplate",
            rarity: "blue",
            baseStats: { hp: 0, def: 3, atk: 0, mspd: 2 },
            critStats: { hp: 0, def: 3.9, atk: 0, mspd: 2.6 },
            note: "Part of the essential 4-piece Windswept set for crucial march speed."
          },
          {
            slot: "Gloves",
            name: "Windswept Bracers",
            rarity: "blue",
            baseStats: { hp: 0, def: 2, atk: 0, mspd: 2 },
            critStats: { hp: 0, def: 2.6, atk: 0, mspd: 2.6 },
            note: "Provides defense and sets up 4-piece movement bonus."
          },
          {
            slot: "Pants",
            name: "Plate Greaves",
            rarity: "blue",
            baseStats: { hp: 3, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 3.9, def: 0, atk: 0, mspd: 0 },
            note: "Provides raw Infantry Health. Keep until Karuak's Humility."
          },
          {
            slot: "Boots",
            name: "Windswept Boots",
            rarity: "blue",
            baseStats: { hp: 0, def: 2, atk: 0, mspd: 2 },
            critStats: { hp: 0, def: 2.6, atk: 0, mspd: 2.6 },
            note: "Completes 4-piece Windswept: +2% All Troop Attack & +4% March Speed."
          },
          {
            slot: "Accessory 1",
            name: "Delane's Amulet",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "5% Dmg Reduction" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "6.5% Dmg Reduction" },
            note: "Reduces all incoming damage on combat proc. Unlocks via Sunset Canyon."
          },
          {
            slot: "Accessory 2",
            name: "Silent Trial",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-10 Target Rage" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-13 Target Rage" },
            note: "Depletes opponent's rage cycle every normal attack proc."
          }
        ],
        setBonus: { atk: 2, def: 0, hp: 0, mspd: 4, name: "4-Piece Windswept Synergy" },
        pairings: [
          {
            primary: "Bjorn Ironside",
            secondary: "Sun Tzu",
            role: "The F2P KvK 1 War Engine",
            talents: "Infantry / Skill",
            skillsMin: "Bjorn 5/5/5/1 • Sun Tzu 5/5/5/5",
            synergy: "Bjorn's active skill strikes first, increasing the target's skill damage taken by 10% for 3 seconds. Sun Tzu immediately follows with his 5-target nuclear AoE into the amplified debuff while generating up to 250 rage."
          },
          {
            primary: "Richard I",
            secondary: "Sun Tzu",
            role: "Immortal Sustain Wall",
            talents: "Defense / Infantry",
            skillsMin: "Richard 5/1/1/1 • Sun Tzu 5/5/5/5",
            synergy: "Richard provides 30% damage reduction and massive heals, keeping Sun Tzu on the battlefield indefinitely to repeatedly spam multi-target firestorms."
          }
        ]
      },
      mid: {
        title: "Mid Game (KvK 2 - KvK 3 Transition)",
        subtitle: "Purple Epics + First Legendary Core • The Hope Cloak Era",
        craftDays: "210 Days",
        description: "The smart transition. Never craft legendary weapons first. Craft Hope Cloak first, pair with Karuak's Humility, and keep refined blue health.",
        items: [
          {
            slot: "Weapon",
            name: "Gatekeeper's Shield (Refined)",
            rarity: "blue",
            baseStats: { hp: 5, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 10.5, def: 0, atk: 0, mspd: 0 },
            note: "Special talent crit gives +10.5% Health. Better than flat purple weapons."
          },
          {
            slot: "Helm",
            name: "Witch's Lineage",
            rarity: "purple",
            baseStats: { hp: 0, def: 8, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 10.5, atk: 0, mspd: 0 },
            note: "Provides +8% (+10.5% crit) Infantry Defense. Core purple staple."
          },
          {
            slot: "Chest",
            name: "Hope Cloak",
            rarity: "gold",
            baseStats: { hp: 0, def: 11, atk: 0, mspd: 3 },
            critStats: { hp: 0, def: 14.3, atk: 0, mspd: 3.9 },
            note: "Priority #1 Legendary in Rise of Kingdoms. Defense + march speed."
          },
          {
            slot: "Gloves",
            name: "Seth's Brutality",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 8, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 10.5, mspd: 0 },
            note: "Epic attack filler until Sacred Grips in Season of Conquest."
          },
          {
            slot: "Pants",
            name: "Karuak's Humility",
            rarity: "purple",
            baseStats: { hp: 8, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 10.5, def: 0, atk: 0, mspd: 0 },
            note: "Best purple item in the game. +10.5% Health on crit for minimal cost."
          },
          {
            slot: "Boots",
            name: "Shio's Return",
            rarity: "purple",
            baseStats: { hp: 0, def: 8, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 10.5, atk: 0, mspd: 0 },
            note: "Provides reliable Defense. Or keep refined Windswept boots for march speed."
          },
          {
            slot: "Accessory 1",
            name: "Delane's Amulet (Refined)",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "5% Dmg Reduction" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "6.5% Dmg Reduction" },
            note: "Refining accessories increases trigger potency."
          },
          {
            slot: "Accessory 2",
            name: "Silent Trial (Refined)",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-10 Target Rage" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-13 Target Rage" },
            note: "Strips enemy active skill cycle in long open-field clashes."
          }
        ],
        setBonus: null,
        pairings: [
          {
            primary: "Alexander the Great",
            secondary: "Sun Tzu / YSG",
            role: "Hyper-Aggressive Field Leader",
            talents: "Infantry / Attack",
            skillsMin: "Alex 5/5/5/1 • YSG 5/5/5/5",
            synergy: "Alex shields nearby allies, boosts march speed, and debuffs the target with +30% increased damage taken, allowing secondary nukers to obliterate the front."
          },
          {
            primary: "Guan Yu",
            secondary: "Alexander the Great",
            role: "KvK 3 King of Burst",
            talents: "Infantry / Skill",
            skillsMin: "Guan 5/1/1/1 (target 5/1/5/5) • Alex 5/5/5/5",
            synergy: "Guan Yu opens with a 3-second AoE silence preventing enemy counter-skills, while Alex's passive shields trigger Guan's massive skill damage buff."
          }
        ]
      },
      endgame: {
        title: "Endgame (Season of Conquest / SoC BiS)",
        subtitle: "Best-in-Slot Legendary • 4-Piece Eternal Empire + Hope Cloak",
        craftDays: "580+ Days",
        description: "The gold standard for competitive Osiris League and SoC KvK. Keeps Hope Cloak for defense/speed while activating the 4-piece set bonus.",
        items: [
          {
            slot: "Weapon",
            name: "Shield of the Eternal Empire",
            rarity: "gold",
            baseStats: { hp: 0, def: 15, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 19.5, atk: 0, mspd: 0 },
            note: "Massive defense scaling. Iconic Tier gives an additional +20% base stat."
          },
          {
            slot: "Helm",
            name: "Helm of the Eternal Empire",
            rarity: "gold",
            baseStats: { hp: 0, def: 15, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 19.5, atk: 0, mspd: 0 },
            note: "Provides +15% (+19.5% crit) Defense and counts toward 4-pc bonus."
          },
          {
            slot: "Chest",
            name: "Hope Cloak (Kept over Set Chest)",
            rarity: "gold",
            baseStats: { hp: 0, def: 11, atk: 0, mspd: 3 },
            critStats: { hp: 0, def: 14.3, atk: 0, mspd: 3.9 },
            note: "BiS non-set chest. Set chest grants Attack; Hope Cloak grants Defense + Speed."
          },
          {
            slot: "Gloves",
            name: "Sacred Grips",
            rarity: "gold",
            baseStats: { hp: 12, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 15.6, def: 0, atk: 0, mspd: 0 },
            note: "High raw Infantry Health. BiS non-set gloves."
          },
          {
            slot: "Pants",
            name: "Eternal Empire Greaves",
            rarity: "gold",
            baseStats: { hp: 12, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 15.6, def: 0, atk: 0, mspd: 0 },
            note: "Provides +12% (+15.6% crit) Health and finishes 3rd set piece."
          },
          {
            slot: "Boots",
            name: "Eternal Empire Stompers",
            rarity: "gold",
            baseStats: { hp: 0, def: 11, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 14.3, atk: 0, mspd: 0 },
            note: "Finishes 4-piece set: Grants +10% Infantry Defense bonus!"
          },
          {
            slot: "Accessory 1",
            name: "Horn of Fury",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+50 Rage On Normal Atk" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+65 Rage On Normal Atk" },
            note: "The single best accessory in RoK. Cuts active skill rotation time in half."
          },
          {
            slot: "Accessory 2",
            name: "Ring of Doom",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+50% Dmg for 2s" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+65% Dmg for 2s" },
            note: "Massive damage amplification proc that multiplies both skill and smash damage."
          }
        ],
        setBonus: { atk: 0, def: 10, hp: 0, mspd: 0, name: "4-Piece Eternal Empire Bonus" },
        pairings: [
          {
            primary: "Gorgo",
            secondary: "Liu Che",
            role: "The Open-Field Slaughterhouse",
            talents: "Infantry / Defense",
            skillsMin: "Gorgo 5/5/1/1 • Liu Che 5/5/5/5",
            synergy: "Liu Che deals unprecedented continuous smash normal damage; Gorgo generates infinite shields and cleanses slowing effects, turning this march into an unstoppable blender."
          },
          {
            primary: "Scipio Africanus Prime",
            secondary: "Liu Che",
            role: "High-Burst AoE Juggernaut",
            talents: "Infantry / Skill",
            skillsMin: "Scipio Prime 5/5/5/1 • Liu Che 5/5/5/5",
            synergy: "Scipio Prime delivers massive 3-target AoE damage, strips enemy health by 30%, and triggers Liu Che's normal attack scaling to wipe enemy marches."
          }
        ]
      }
    }
  },

  cavalry: {
    name: "Cavalry",
    icon: Zap,
    color: "cyan",
    accentBg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
    badgeGlow: "shadow-[0_0_20px_rgba(6,182,212,0.2)]",
    description: "The surgical strike force. Unmatched march speed and devastating burst damage. Cavalry requires Health and Defense to survive open-field focus fire.",
    tiers: {
      early: {
        title: "Early Game (KvK 1 Starter)",
        subtitle: "2-Piece Vanguard + Windswept • 135 Days Craft Time",
        craftDays: "135 Days",
        description: "Matches the user-verified starter setup: Vanguard Halberd + Vanguard Greaves gives +5% Cav Health, boosted by Abyssal Visage and Seth's Brutality.",
        items: [
          {
            slot: "Weapon",
            name: "Vanguard Halberd",
            rarity: "green",
            baseStats: { hp: 0, def: 1, atk: 2, mspd: 0 },
            critStats: { hp: 0, def: 1.3, atk: 2.6, mspd: 0 },
            note: "Key piece to trigger the +5% Cavalry Health 2-piece Vanguard set bonus."
          },
          {
            slot: "Helm",
            name: "Abyssal Visage",
            rarity: "purple",
            baseStats: { hp: 0, def: 8, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 10.5, atk: 0, mspd: 0 },
            note: "High priority epic. Grants +8% (+10.5% crit) Cavalry Defense."
          },
          {
            slot: "Chest",
            name: "Windswept Breastplate",
            rarity: "blue",
            baseStats: { hp: 0, def: 3, atk: 0, mspd: 2 },
            critStats: { hp: 0, def: 3.9, atk: 0, mspd: 2.6 },
            note: "Provides defense and movement speed for hit-and-run maneuverability."
          },
          {
            slot: "Gloves",
            name: "Seth's Brutality",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 8, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 10.5, mspd: 0 },
            note: "Epic attack piece. Keep until Navar's Control in Season of Conquest."
          },
          {
            slot: "Pants",
            name: "Vanguard Greaves",
            rarity: "green",
            baseStats: { hp: 2, def: 1, atk: 0, mspd: 0 },
            critStats: { hp: 2.6, def: 1.3, atk: 0, mspd: 0 },
            note: "Green pants with built-in health. Together with Halberd, gives +5% Health!"
          },
          {
            slot: "Boots",
            name: "Windswept Boots",
            rarity: "blue",
            baseStats: { hp: 0, def: 2, atk: 0, mspd: 2 },
            critStats: { hp: 0, def: 2.6, atk: 0, mspd: 2.6 },
            note: "Finishes 2-pc Windswept (+2% March Speed)."
          },
          {
            slot: "Accessory 1",
            name: "Silent Trial",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-10 Target Rage" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-13 Target Rage" },
            note: "Delays enemy skill releases during fast cavalry engagements."
          },
          {
            slot: "Accessory 2",
            name: "Wind Scar",
            rarity: "blue",
            baseStats: { hp: 0, def: 0, atk: 2, mspd: 3 },
            critStats: { hp: 0, def: 0, atk: 2.6, mspd: 3.9 },
            note: "Increases cavalry movement speed to chase down fleeing marches."
          }
        ],
        setBonus: { atk: 0, def: 0, hp: 5, mspd: 2, name: "2-Piece Vanguard (+5% HP) + 2-Pc Windswept" },
        pairings: [
          {
            primary: "Pelagius",
            secondary: "Baibars",
            role: "The F2P Cav Hit-and-Run Engine",
            talents: "Cavalry / Skill",
            skillsMin: "Pelagius 5/5/5/5 • Baibars 5/5/5/5",
            synergy: "Pelagius generates 100 rage and sustains with healing factor 450; Baibars fires a 5-target AoE that slows targets by 50% for 2s, guaranteeing no enemy can escape."
          },
          {
            primary: "Minamoto no Yoshitsune",
            secondary: "Cao Cao",
            role: "Single-Target Boss Nuker",
            talents: "Cavalry / Skill",
            skillsMin: "Mina 5/1/1/1 (VIP) • Cao Cao 5/1/1/1",
            synergy: "Pure single-target burst. Strips enemy attack by 40% and march speed by 10%, while dropping devastating 1400 + 1400 burst nukes."
          }
        ]
      },
      mid: {
        title: "Mid Game (KvK 2 - KvK 3 Transition)",
        subtitle: "Full Epic Arsenal + Health Optimizations",
        craftDays: "240 Days",
        description: "Replaces greens with Heart of the Saint (Health weapon) and Dark Lord's Blessing. Keeps Vanguard Greaves if critted for the irreplaceable 5% Health bonus.",
        items: [
          {
            slot: "Weapon",
            name: "Heart of the Saint",
            rarity: "purple",
            baseStats: { hp: 8, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 10.5, def: 0, atk: 0, mspd: 0 },
            note: "Crucial epic weapon that grants Cavalry Health instead of useless attack."
          },
          {
            slot: "Helm",
            name: "Abyssal Visage",
            rarity: "purple",
            baseStats: { hp: 0, def: 8, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 10.5, atk: 0, mspd: 0 },
            note: "Refining gives +10.5% Defense. Carries through to Season of Conquest."
          },
          {
            slot: "Chest",
            name: "Dark Lord's Blessing",
            rarity: "purple",
            baseStats: { hp: 0, def: 8, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 10.5, atk: 0, mspd: 0 },
            note: "Provides +8% (+10.5% crit) Cavalry Defense."
          },
          {
            slot: "Gloves",
            name: "Seth's Brutality",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 8, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 10.5, mspd: 0 },
            note: "Reliable purple offensive gloves."
          },
          {
            slot: "Pants",
            name: "Gladiator",
            rarity: "purple",
            baseStats: { hp: 8, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 10.5, def: 0, atk: 0, mspd: 0 },
            note: "Provides +8% (+10.5% crit) Cavalry Health."
          },
          {
            slot: "Boots",
            name: "Cloud Striders",
            rarity: "purple",
            baseStats: { hp: 0, def: 8, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 10.5, atk: 0, mspd: 0 },
            note: "Provides solid defense over blue boots."
          },
          {
            slot: "Accessory 1",
            name: "Delane's Amulet",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "5% Dmg Reduction" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "6.5% Dmg Reduction" },
            note: "Essential defense against swarming enemies."
          },
          {
            slot: "Accessory 2",
            name: "Silent Trial",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-10 Target Rage" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-13 Target Rage" },
            note: "Suppresses opponent's burst cycle."
          }
        ],
        setBonus: null,
        pairings: [
          {
            primary: "Saladin",
            secondary: "Yi Seong-Gye",
            role: "The Indestructible Brawler",
            talents: "Cavalry / Support",
            skillsMin: "Saladin 5/5/5/1 • YSG 5/5/5/5",
            synergy: "Saladin reduces incoming skill damage by 30% and inflicts 50% healing reduction, transforming YSG's circular AoE into a durable, unkillable weapon."
          },
          {
            primary: "Saladin",
            secondary: "William I",
            role: "KvK 3 Support Battery",
            talents: "Cavalry / Support",
            skillsMin: "Saladin 5/5/5/1 • William 5/5/5/1",
            synergy: "William grants +10% attack and +50 rage/sec to surrounding friendly marches, turning your alliance murder ball into an overdrive engine."
          }
        ]
      },
      endgame: {
        title: "Endgame (Season of Conquest / SoC BiS)",
        subtitle: "4-Pc Hellish Wasteland + Ash of the Dawn + Navar's Control",
        craftDays: "600+ Days",
        description: "The mathematical peak. Do NOT craft the set pants or set gloves. Use Ash of the Dawn (+12% Health) and Navar's Control (+12% Defense) to maximize EHP.",
        items: [
          {
            slot: "Weapon",
            name: "Lance of the Hellish Wasteland",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 15, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 19.5, mspd: 0 },
            note: "High attack legendary weapon. Counts toward 4-pc set bonus."
          },
          {
            slot: "Helm",
            name: "Helm of the Hellish Wasteland",
            rarity: "gold",
            baseStats: { hp: 0, def: 15, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 19.5, atk: 0, mspd: 0 },
            note: "Provides +15% (+19.5% crit) Cavalry Defense."
          },
          {
            slot: "Chest",
            name: "Heavy Armor of the Hellish Wasteland",
            rarity: "gold",
            baseStats: { hp: 12, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 15.6, def: 0, atk: 0, mspd: 0 },
            note: "Provides essential raw Cavalry Health."
          },
          {
            slot: "Gloves",
            name: "Navar's Control (Kept over Set Gloves)",
            rarity: "gold",
            baseStats: { hp: 0, def: 12, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 15.6, atk: 0, mspd: 0 },
            note: "BiS non-set gloves. Set gloves give Attack; Navar gives Defense."
          },
          {
            slot: "Pants",
            name: "Ash of the Dawn (Mandatory Non-Set)",
            rarity: "gold",
            baseStats: { hp: 12, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 15.6, def: 0, atk: 0, mspd: 0 },
            note: "Crucial piece in all of RoK! Cav has low natural HP; Ash of the Dawn is mandatory."
          },
          {
            slot: "Boots",
            name: "Boots of the Hellish Wasteland",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 11, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 14.3, mspd: 0 },
            note: "Completes 4-piece Hellish Wasteland: +10% Cavalry Attack bonus!"
          },
          {
            slot: "Accessory 1",
            name: "Horn of Fury",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+50 Rage On Normal Atk" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+65 Rage On Normal Atk" },
            note: "Accelerates Nevsky & Joan active skill loops to overwhelming speeds."
          },
          {
            slot: "Accessory 2",
            name: "Ring of Doom",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+50% Dmg for 2s" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+65% Dmg for 2s" },
            note: "Procs during active skill bursts to execute enemy rallies or marches."
          }
        ],
        setBonus: { atk: 10, def: 0, hp: 0, mspd: 0, name: "4-Piece Hellish Wasteland Bonus" },
        pairings: [
          {
            primary: "Nevsky",
            secondary: "Joan of Arc Prime",
            role: "The Undisputed Cavalry God-Tier",
            talents: "Cavalry / Skill",
            skillsMin: "Nevsky 5/5/5/1 • Joan Prime 5/1/1/5 (target 5/5/5/5)",
            synergy: "Nevsky reduces target defense by 20% and deals up to 2300 direct damage; Joan drops a 3-target AoE nuke, restores 400 rage over 3s, and boosts normal damage by 10%."
          },
          {
            primary: "Huo Qubing",
            secondary: "Joan of Arc Prime / William",
            role: "Hypersonic Burst Assassin",
            talents: "Cavalry / Mobility",
            skillsMin: "Huo 5/5/1/1 • Joan Prime 5/5/5/5",
            synergy: "Huo Qubing breaks free of slows, dashes across battle lines, and releases his primary skill immediately upon engaging combat, catching out-of-position marches."
          }
        ]
      }
    }
  },

  archer: {
    name: "Archer",
    icon: Target,
    color: "emerald",
    accentBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    badgeGlow: "shadow-[0_0_20px_rgba(16,185,129,0.2)]",
    description: "The glass cannon artillery. Tremendous AoE skill damage that melts entire clusters of enemy troops. Requires strict positioning and defense gear to survive.",
    tiers: {
      early: {
        title: "Early Game (KvK 1 Starter)",
        subtitle: "Budget Starter • 43.75 Days Craft Time",
        craftDays: "43.75 Days",
        description: "Matches the user-verified starter setup: Stiletto, Iron Helm, Golden Age, Leather Gloves, Plate Greaves, and Cloth Boots. Low craft cost for maximum defense.",
        items: [
          {
            slot: "Weapon",
            name: "Stiletto / Staff of the Lost",
            rarity: "blue",
            baseStats: { hp: 0, def: 0, atk: 5, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 6.5, mspd: 0 },
            note: "Standard budget blue weapon. Easy to roll for special talent."
          },
          {
            slot: "Helm",
            name: "Iron Helm",
            rarity: "green",
            baseStats: { hp: 0, def: 2, atk: 1, mspd: 0 },
            critStats: { hp: 0, def: 2.6, atk: 1.3, mspd: 0 },
            note: "Provides early defense. Replace when Revival Helm blueprint is obtained."
          },
          {
            slot: "Chest",
            name: "Golden Age",
            rarity: "blue",
            baseStats: { hp: 0, def: 3, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 3.9, atk: 0, mspd: 0 },
            note: "Gives solid Archer Defense to mitigate open-field target focusing."
          },
          {
            slot: "Gloves",
            name: "Leather Gloves",
            rarity: "green",
            baseStats: { hp: 0, def: 0, atk: 2, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 2.6, mspd: 0 },
            note: "Temporary green offensive gloves."
          },
          {
            slot: "Pants",
            name: "Plate Greaves",
            rarity: "blue",
            baseStats: { hp: 3, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 3.9, def: 0, atk: 0, mspd: 0 },
            note: "Provides flat health. Keep until Flame Greaves."
          },
          {
            slot: "Boots",
            name: "Cloth Boots",
            rarity: "green",
            baseStats: { hp: 0, def: 2, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 2.6, atk: 0, mspd: 0 },
            note: "Provides +2% (+2.6% crit) Archer Defense."
          },
          {
            slot: "Accessory 1",
            name: "Delane's Amulet",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "5% Dmg Reduction" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "6.5% Dmg Reduction" },
            note: "Vital for fragile archers to survive unexpected cavalry dives."
          },
          {
            slot: "Accessory 2",
            name: "Silent Trial",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-10 Target Rage" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-13 Target Rage" },
            note: "Rage drain keeps enemy nukers at bay."
          }
        ],
        setBonus: null,
        pairings: [
          {
            primary: "Kusunoki Masashige",
            secondary: "Yi Seong-Gye",
            role: "The Debuff Cleanser & AoE Annihilator",
            talents: "Archer / Skill",
            skillsMin: "Kusunoki 5/5/5/5 • YSG 5/5/5/5",
            synergy: "Kusunoki immediately removes all active debuffs (silence, defense downs, march slows) from your march, freeing YSG to unleash his legendary 360-degree circular nuke."
          },
          {
            primary: "Imhotep",
            secondary: "Yi Seong-Gye",
            role: "The Rage Synergizer",
            talents: "Support / Archer",
            skillsMin: "Imhotep 5/5/5/5 • YSG 5/5/5/5",
            synergy: "Imhotep increases target's damage taken by 35% and strips 50 rage/sec, priming whole enemy squads for catastrophic damage from YSG."
          }
        ]
      },
      mid: {
        title: "Mid Game (KvK 2 - KvK 3 Transition)",
        subtitle: "4-Piece Revival Set (+10% March Speed) + Flame Greaves",
        craftDays: "185 Days",
        description: "The 4-piece Revival Set provides +10% March Speed. Speed is life for archers, allowing them to reposition inside the ball and avoid getting swarm-killed.",
        items: [
          {
            slot: "Weapon",
            name: "Flame Dragon's Bow",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 8, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 10.5, mspd: 0 },
            note: "Strong purple weapon giving +8% (+10.5% crit) Archer Attack."
          },
          {
            slot: "Helm",
            name: "Revival Helm",
            rarity: "purple",
            baseStats: { hp: 0, def: 8, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 10.5, atk: 0, mspd: 0 },
            note: "Part of the 4-piece Revival set."
          },
          {
            slot: "Chest",
            name: "Revival Wings",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 8, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 10.5, mspd: 0 },
            note: "Provides +8% Archer Attack and sets up the 4-pc speed bonus."
          },
          {
            slot: "Gloves",
            name: "Revival Bracers",
            rarity: "purple",
            baseStats: { hp: 0, def: 8, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 10.5, atk: 0, mspd: 0 },
            note: "Provides +8% Archer Defense."
          },
          {
            slot: "Pants",
            name: "Flame Greaves",
            rarity: "purple",
            baseStats: { hp: 8, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 10.5, def: 0, atk: 0, mspd: 0 },
            note: "Essential non-set purple pants giving +8% (+10.5% crit) Archer Health."
          },
          {
            slot: "Boots",
            name: "Revival Boots",
            rarity: "purple",
            baseStats: { hp: 0, def: 8, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 10.5, atk: 0, mspd: 0 },
            note: "Completes 4-piece Revival set: +3% Archer Defense and +10% March Speed!"
          },
          {
            slot: "Accessory 1",
            name: "Delane's Amulet (Refined)",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "5% Dmg Reduction" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "6.5% Dmg Reduction" },
            note: "Essential defensive mitigation."
          },
          {
            slot: "Accessory 2",
            name: "Silent Trial (Refined)",
            rarity: "purple",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-10 Target Rage" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "-13 Target Rage" },
            note: "Suppresses hostile active skills."
          }
        ],
        setBonus: { atk: 0, def: 3, hp: 0, mspd: 10, name: "4-Piece Revival (+10% March Speed!)" },
        pairings: [
          {
            primary: "Edward of Woodstock",
            secondary: "Yi Seong-Gye",
            role: "The Nuclear Artillery",
            talents: "Archer / Skill",
            skillsMin: "Edward 5/5/1/1 • YSG 5/5/5/5",
            synergy: "Edward charges high rage to discharge a colossal 2500 factor single-target strike, immediately buffing YSG's active skill damage by 25%."
          },
          {
            primary: "Ramesses II",
            secondary: "Yi Seong-Gye",
            role: "The Tanky Armor Melter",
            talents: "Archer / Defense",
            skillsMin: "Ramesses 5/5/5/1 • YSG 5/5/5/5",
            synergy: "Ramesses strips enemy defense by 30%, applies 100% healing immunity, and bolsters archer defense by 40%, keeping YSG alive in long slugfests."
          }
        ]
      },
      endgame: {
        title: "Endgame (Season of Conquest / SoC BiS)",
        subtitle: "Full 6-Piece Dragon's Breath • The Ultimate AoE Machine",
        craftDays: "620+ Days",
        description: "The 6-piece Dragon's Breath set provides +10% Archer Defense plus a 3% proc chance for +35% normal attack damage. Delivers unrivaled damage in ball fights.",
        items: [
          {
            slot: "Weapon",
            name: "Bow of the Dragon's Breath",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 15, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 19.5, mspd: 0 },
            note: "Standard field weapon. For pure rallies, Milky Way can be swapped in."
          },
          {
            slot: "Helm",
            name: "Helm of the Dragon's Breath",
            rarity: "gold",
            baseStats: { hp: 0, def: 15, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 19.5, atk: 0, mspd: 0 },
            note: "Provides +15% (+19.5% crit) Archer Defense."
          },
          {
            slot: "Chest",
            name: "Robes of the Dragon's Breath",
            rarity: "gold",
            baseStats: { hp: 12, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 15.6, def: 0, atk: 0, mspd: 0 },
            note: "High raw Archer Health."
          },
          {
            slot: "Gloves",
            name: "Bracers of the Dragon's Breath",
            rarity: "gold",
            baseStats: { hp: 0, def: 12, atk: 0, mspd: 0 },
            critStats: { hp: 0, def: 15.6, atk: 0, mspd: 0 },
            note: "High raw Archer Defense."
          },
          {
            slot: "Pants",
            name: "Legguards of the Dragon's Breath",
            rarity: "gold",
            baseStats: { hp: 12, def: 0, atk: 0, mspd: 0 },
            critStats: { hp: 15.6, def: 0, atk: 0, mspd: 0 },
            note: "Essential health piece."
          },
          {
            slot: "Boots",
            name: "Boots of the Dragon's Breath",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 11, mspd: 0 },
            critStats: { hp: 0, def: 0, atk: 14.3, mspd: 0 },
            note: "Completes 6-piece full set: +10% Defense & +35% normal attack damage proc!"
          },
          {
            slot: "Accessory 1",
            name: "Horn of Fury",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+50 Rage On Normal Atk" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+65 Rage On Normal Atk" },
            note: "Spams Zhuge Liang's storm of circular arrows without pause."
          },
          {
            slot: "Accessory 2",
            name: "Ring of Doom",
            rarity: "gold",
            baseStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+50% Dmg for 2s" },
            critStats: { hp: 0, def: 0, atk: 0, mspd: 0, proc: "+65% Dmg for 2s" },
            note: "Multiplies Zhuge Liang's and Boudica Prime's immense AoE multipliers."
          }
        ],
        setBonus: { atk: 0, def: 10, hp: 0, mspd: 0, name: "6-Piece Dragon's Breath (+35% Normal Dmg Proc)" },
        pairings: [
          {
            primary: "Boudica Prime",
            secondary: "Zhuge Liang",
            role: "The Supreme Open-Field Ball Monarchs",
            talents: "Skill / Archer",
            skillsMin: "Boudica Prime 5/5/5/1 • Zhuge Liang 5/5/1/5 (target 5/5/5/5)",
            synergy: "Boudica strips enemy defense by 35% and boosts skill damage taken by 25%; Zhuge Liang unloads catastrophic circular AoE that does NOT decay when striking multiple enemies."
          },
          {
            primary: "Hermann Prime",
            secondary: "Zhuge Liang",
            role: "The Silence & Poison Shredder",
            talents: "Archer / Skill",
            skillsMin: "Hermann Prime 5/5/1/1 • Zhuge Liang 5/5/5/5",
            synergy: "Hermann Prime silences up to 3 enemy marches for 2 seconds while applying stacking poisons that amplify all incoming damage, disabling enemy skill cascades."
          }
        ]
      }
    }
  }
};

// 5 Golden Crafting Commandments
const CRAFTING_COMMANDMENTS = [
  {
    id: 1,
    title: "The Hope Cloak Law (Infantry Chest Priority)",
    rule: "Never craft the Eternal Empire set chest before Hope Cloak.",
    explanation: "The Eternal Empire set chest gives Infantry Attack, which provides the lowest combat value. Hope Cloak provides +11% Infantry Defense and +3% March Speed. Because infantry marches are notoriously slow, that 3% speed plus raw defense saves your march from getting isolated and swarmed."
  },
  {
    id: 2,
    title: "Special Talent (+30%) Refined Blues Beat Flat Legendaries",
    rule: "A refined Blue item with Special Talent beats an unrefined Legendary at 1/10th the cost.",
    explanation: "Gatekeeper's Shield with special talent provides +10.5% Infantry Health for roughly 30 blue materials. A base legendary weapon requires 120 gold materials (equivalent to 19,200 blue materials!) and provides Attack. Prioritize refining blues and purples to 100% crit before ever touching legendary weapons."
  },
  {
    id: 3,
    title: "Never Craft Legendary Weapons First",
    rule: "Always forge Chest, Pants, and Helm before touching weapons.",
    explanation: "In Rise of Kingdoms combat math, Health and Defense have much higher Effective Hit Point (EHP) multipliers than Attack. Attack only increases slightly how hard you hit, whereas Defense and Health directly cut your hospital severely wounded (dead) rates in half. Always forge Defense/Health armor first."
  },
  {
    id: 4,
    title: "Cavalry Mandate: Ash of the Dawn & Navar's Control",
    rule: "Never forge the 6-piece Hellish Wasteland set for Cavalry.",
    explanation: "The 6-piece Hellish Wasteland bonus is inefficient. Instead, stop at 4 pieces (Helm, Chest, Boots, Weapon) and equip Ash of the Dawn (Pants, +12% Cav Health) and Navar's Control (Gloves, +12% Cav Defense). Cavalry inherently lacks native health; without Ash of the Dawn, your cavalry march will melt in 5 seconds."
  },
  {
    id: 5,
    title: "Accessory Priority: Silent Trial & Horn of Fury",
    rule: "Silent Trial and Delane's Amulet carry you from KvK 1 through KvK 3.",
    explanation: "Do not waste materials trying to craft early accessories. Farm Sunset Canyon daily to get Delane's Amulet and Silent Trial. When entering Season of Conquest, Horn of Fury is the uncontested #1 accessory to craft first, as cutting your rage cycle translates to 25% higher active skill frequency."
  }
];

// Helper to determine rarity styling
function getRarityStyle(rarity) {
  switch (rarity) {
    case "green":
      return {
        border: "border-emerald-500/40 hover:border-emerald-400",
        bg: "bg-emerald-950/20",
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        name: "text-emerald-300",
        label: "Advanced (Green)"
      };
    case "blue":
      return {
        border: "border-sky-500/40 hover:border-sky-400",
        bg: "bg-sky-950/20",
        badge: "bg-sky-500/10 text-sky-400 border-sky-500/30",
        name: "text-sky-300",
        label: "Rare (Blue)"
      };
    case "purple":
      return {
        border: "border-purple-500/40 hover:border-purple-400",
        bg: "bg-purple-950/20",
        badge: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        name: "text-purple-300",
        label: "Epic (Purple)"
      };
    case "gold":
    default:
      return {
        border: "border-[#D4AF37]/50 hover:border-[#D4AF37]",
        bg: "bg-amber-950/20",
        badge: "bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40",
        name: "text-amber-200",
        label: "Legendary (Gold)"
      };
  }
}

export default function EquipmentGuide() {
  const [activeClass, setActiveClass] = useState("infantry");
  const [activeTier, setActiveTier] = useState("early");
  const [isCritTalented, setIsCritTalented] = useState(true);
  const [activeCommandment, setActiveCommandment] = useState(1);

  const currentClassData = EQUIPMENT_DATA[activeClass];
  const currentTierData = currentClassData.tiers[activeTier];

  // Dynamic stat totals calculation
  const totalStats = useMemo(() => {
    let atk = 0;
    let def = 0;
    let hp = 0;
    let mspd = 0;

    currentTierData.items.forEach((item) => {
      const stats = isCritTalented ? item.critStats : item.baseStats;
      atk += stats.atk || 0;
      def += stats.def || 0;
      hp += stats.hp || 0;
      mspd += stats.mspd || 0;
    });

    if (currentTierData.setBonus) {
      atk += currentTierData.setBonus.atk || 0;
      def += currentTierData.setBonus.def || 0;
      hp += currentTierData.setBonus.hp || 0;
      mspd += currentTierData.setBonus.mspd || 0;
    }

    return {
      atk: atk.toFixed(1),
      def: def.toFixed(1),
      hp: hp.toFixed(1),
      mspd: mspd.toFixed(1)
    };
  }, [currentTierData, isCritTalented]);

  return (
    <section id="equipment-guide" className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
      
      {/* Decorative Glow Ambient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-cyan-500/5 rounded-full blur-[160px] pointer-events-none -z-10"></div>

      {/* Main Header Card */}
      <div className="text-center max-w-4xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 mb-4 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
          <Crown size={14} className="text-[#D4AF37]" />
          Armory & Tactical Forge • 100% Free Public Guide
        </div>
        
        <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-400 uppercase tracking-widest font-cinzel">
          Ideal Equipment & Commander Pairings
        </h2>
        
        <p className="text-sm sm:text-base text-slate-400 mt-3 font-mono leading-relaxed max-w-2xl mx-auto">
          From Day 1 budget sets (63d, 135d, 43.75d craft times) to Season of Conquest Best-in-Slot meta gear. Toggle Special Talents to see exact combat math and synergy pairings.
        </p>
      </div>

      {/* =========================================================================
          CONTROLS: CLASS SELECTOR + TIER SELECTOR + SPECIAL TALENT TOGGLE
          ========================================================================= */}
      <div className="bg-[#0b0e14]/90 border border-[#1e2433] rounded-2xl p-4 sm:p-6 mb-8 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] space-y-6">
        
        {/* Class Selection Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#1e2433] pb-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold">1. Select Unit Class:</span>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
            {/* Infantry */}
            <button
              onClick={() => setActiveClass("infantry")}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border ${
                activeClass === "infantry"
                  ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]"
                  : "bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              <Shield size={16} className={activeClass === "infantry" ? "text-amber-400" : "text-slate-500"} />
              <span>Infantry</span>
            </button>

            {/* Cavalry */}
            <button
              onClick={() => setActiveClass("cavalry")}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border ${
                activeClass === "cavalry"
                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]"
                  : "bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              <Zap size={16} className={activeClass === "cavalry" ? "text-cyan-400" : "text-slate-500"} />
              <span>Cavalry</span>
            </button>

            {/* Archer */}
            <button
              onClick={() => setActiveClass("archer")}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 border ${
                activeClass === "archer"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.02]"
                  : "bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              <Target size={16} className={activeClass === "archer" ? "text-emerald-400" : "text-slate-500"} />
              <span>Archer</span>
            </button>
          </div>
        </div>

        {/* Tier Progression Tabs + Special Talent Switch */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Progression Tiers */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold mr-2 hidden sm:inline">2. Game Era:</span>
            
            <button
              onClick={() => setActiveTier("early")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${
                activeTier === "early"
                  ? "bg-sky-500/20 border-sky-500 text-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                  : "bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white"
              }`}
            >
              <Clock size={13} />
              <span>Early Game (KvK 1 Budget)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                {currentClassData.tiers.early.craftDays}
              </span>
            </button>

            <button
              onClick={() => setActiveTier("mid")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${
                activeTier === "mid"
                  ? "bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                  : "bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles size={13} />
              <span>Mid Game (KvK 2-3 Epic Core)</span>
            </button>

            <button
              onClick={() => setActiveTier("endgame")}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${
                activeTier === "endgame"
                  ? "bg-[#D4AF37]/20 border-[#D4AF37] text-amber-300 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                  : "bg-[#111622] border-[#1e2433] text-slate-400 hover:text-white"
              }`}
            >
              <Crown size={13} />
              <span>Endgame (SoC Best-in-Slot)</span>
            </button>
          </div>

          {/* Interactive Special Talent Refinement Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-[#111622] px-4 py-2 rounded-xl border border-[#1e2433]">
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#D4AF37]" />
                Special Talent (+30% Crit)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Refinement stat multiplier</span>
            </div>

            <button
              onClick={() => setIsCritTalented(!isCritTalented)}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isCritTalented ? "bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]" : "bg-slate-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isCritTalented ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

        </div>

      </div>

      {/* =========================================================================
          STAT SUMMARY DASHBOARD & ERA INFO BANNER
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Left 2 Cols: Tier Overview Banner */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#0e131d] to-[#070a0e] border border-[#1e2433] rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentClassData.accentBg}`}>
                {currentClassData.name} Focus
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-slate-300">
                {currentTierData.title}
              </span>
              {currentTierData.craftDays && (
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center gap-1">
                  <Clock size={12} /> Craft Time: {currentTierData.craftDays}
                </span>
              )}
            </div>
            
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              {currentTierData.subtitle}
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-400 font-mono leading-relaxed">
              {currentTierData.description}
            </p>
          </div>

          {currentTierData.setBonus && (
            <div className="mt-4 pt-4 border-t border-[#1e2433] flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Layers size={14} /> Active Synergy: {currentTierData.setBonus.name}
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                +[ {currentTierData.setBonus.atk ? `Atk ${currentTierData.setBonus.atk}% ` : ''}
                {currentTierData.setBonus.def ? `Def ${currentTierData.setBonus.def}% ` : ''}
                {currentTierData.setBonus.hp ? `HP ${currentTierData.setBonus.hp}% ` : ''}
                {currentTierData.setBonus.mspd ? `Mspd ${currentTierData.setBonus.mspd}%` : ''} ]
              </span>
            </div>
          )}
        </div>

        {/* Right Col: Aggregate Live Stats Matrix */}
        <div className="bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e2433] pb-3 mb-4">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={14} className="text-cyan-400" />
              Total Stat Output
            </span>
            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${isCritTalented ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-400"}`}>
              {isCritTalented ? "Special Talent (+30%)" : "Base Flat Stats"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            
            {/* Health */}
            <div className="bg-[#121723] p-3 rounded-xl border border-rose-500/20">
              <span className="text-[10px] uppercase font-bold text-rose-400 font-mono tracking-wider">Troop Health</span>
              <div className="text-2xl font-black text-rose-300 font-mono mt-0.5">+{totalStats.hp}%</div>
              <span className="text-[9px] text-slate-400">#1 Stat for EHP</span>
            </div>

            {/* Defense */}
            <div className="bg-[#121723] p-3 rounded-xl border border-sky-500/20">
              <span className="text-[10px] uppercase font-bold text-sky-400 font-mono tracking-wider">Troop Defense</span>
              <div className="text-2xl font-black text-sky-300 font-mono mt-0.5">+{totalStats.def}%</div>
              <span className="text-[9px] text-slate-400">Cuts Dead/Wounded</span>
            </div>

            {/* Attack */}
            <div className="bg-[#121723] p-3 rounded-xl border border-amber-500/20">
              <span className="text-[10px] uppercase font-bold text-amber-400 font-mono tracking-wider">Troop Attack</span>
              <div className="text-2xl font-black text-amber-300 font-mono mt-0.5">+{totalStats.atk}%</div>
              <span className="text-[9px] text-slate-400">Lowest EHP Value</span>
            </div>

            {/* March Speed */}
            <div className="bg-[#121723] p-3 rounded-xl border border-emerald-500/20">
              <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono tracking-wider">March Speed</span>
              <div className="text-2xl font-black text-emerald-300 font-mono mt-0.5">+{totalStats.mspd}%</div>
              <span className="text-[9px] text-slate-400">Ball Positioning</span>
            </div>

          </div>

          <div className="mt-4 pt-3 border-t border-[#1e2433] text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>Effective EHP Formula:</span>
            <span className="text-cyan-400 font-bold">Health &gt; Defense &gt;&gt; Attack</span>
          </div>
        </div>

      </div>

      {/* =========================================================================
          THE 8-SLOT ARMORY MATRIX
          ========================================================================= */}
      <div className="mb-14">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Swords size={18} className="text-[#D4AF37]" />
            Active 8-Slot Equipment Configuration
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Click any piece to inspect crafting notes
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentTierData.items.map((item, index) => {
            const style = getRarityStyle(item.rarity);
            const activeStats = isCritTalented ? item.critStats : item.baseStats;

            return (
              <div 
                key={index}
                className={`bg-[#0a0d14] border ${style.border} rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group`}
              >
                {/* Background Rarity Glow */}
                <div className={`absolute top-0 right-0 w-24 h-24 ${style.bg} rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500`}></div>

                <div>
                  {/* Top Bar: Slot + Rarity Badge */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                      {item.slot}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${style.badge}`}>
                      {style.label.split(' ')[0]}
                    </span>
                  </div>

                  {/* Item Name */}
                  <h4 className={`text-sm sm:text-base font-bold ${style.name} mb-3 group-hover:text-white transition-colors`}>
                    {item.name}
                  </h4>

                  {/* Primary Stats Ticker */}
                  <div className="space-y-1.5 mb-3 bg-[#10141f] p-2.5 rounded-xl border border-[#1b2232]">
                    {activeStats.hp > 0 && (
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Inf/Cav/Arc Health:</span>
                        <span className="text-rose-400 font-bold">+{activeStats.hp}%</span>
                      </div>
                    )}
                    {activeStats.def > 0 && (
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Defense:</span>
                        <span className="text-sky-400 font-bold">+{activeStats.def}%</span>
                      </div>
                    )}
                    {activeStats.atk > 0 && (
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Attack:</span>
                        <span className="text-amber-400 font-bold">+{activeStats.atk}%</span>
                      </div>
                    )}
                    {activeStats.mspd > 0 && (
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">March Speed:</span>
                        <span className="text-emerald-400 font-bold">+{activeStats.mspd}%</span>
                      </div>
                    )}
                    {activeStats.proc && (
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Proc:</span>
                        <span className="text-purple-300 font-bold">{activeStats.proc}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tactical Crafting Note */}
                <div className="pt-2 border-t border-[#1b2232] flex items-start gap-1.5 text-[11px] text-slate-400 leading-snug">
                  <Info size={12} className="text-slate-500 shrink-0 mt-0.5" />
                  <span>{item.note}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          COMMANDER PAIRING SYNERGY SPOTLIGHT
          ========================================================================= */}
      <div className="mb-16">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/30 mb-2">
            <Swords size={13} />
            Battlefield Synergy
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wider font-cinzel">
            Recommended Commander Pairings For This Setup
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
            Equipment stats only shine when combined with proper active skill ordering and talent trees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentTierData.pairings.map((pairing, idx) => (
            <div 
              key={idx}
              className="bg-[#0b0e14] border border-[#1e2433] rounded-2xl p-6 hover:border-cyan-500/40 transition-all duration-300 relative overflow-hidden flex flex-col justify-between group shadow-xl"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/15 transition-all"></div>

              <div>
                {/* Pairing Title / Role Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-[#141a27] border border-[#222a3e] text-cyan-400">
                    {pairing.role}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Talent Tree: <strong className="text-white">{pairing.talents}</strong>
                  </span>
                </div>

                {/* Commanders Duo Visual */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  
                  {/* Primary Commander */}
                  <div className="bg-[#10141f] border border-[#1d2435] rounded-xl p-3 flex flex-col items-center text-center">
                    <span className="text-[9px] font-mono uppercase text-amber-400 font-bold tracking-widest mb-1">
                      [ Primary • Sets Talents ]
                    </span>
                    <h5 className="font-extrabold text-white text-sm sm:text-base">{pairing.primary}</h5>
                  </div>

                  {/* Secondary Commander */}
                  <div className="bg-[#10141f] border border-[#1d2435] rounded-xl p-3 flex flex-col items-center text-center">
                    <span className="text-[9px] font-mono uppercase text-sky-400 font-bold tracking-widest mb-1">
                      [ Secondary • Adds Skills ]
                    </span>
                    <h5 className="font-extrabold text-white text-sm sm:text-base">{pairing.secondary}</h5>
                  </div>

                </div>

                {/* Skill Minimums */}
                <div className="mb-4 bg-[#141a27] px-3.5 py-2 rounded-lg border border-[#222a3e] flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Skill Target:</span>
                  <span className="text-emerald-400 font-bold">{pairing.skillsMin}</span>
                </div>

                {/* Combat Synergy Breakdown */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
                  {pairing.synergy}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#1e2433] flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Pairing Archetype</span>
                <span className="text-cyan-400 font-bold">100% Validated in Ark & KvK</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          THE 5 GOLDEN CRAFTING COMMANDMENTS
          ========================================================================= */}
      <div className="bg-[#0b0e14] border border-[#1e2433] rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-3">
            <Award size={14} className="text-amber-400" />
            Mathematical Rules of Blacksmithing
          </div>
          <h3 className="text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-wider font-cinzel">
            The 5 Golden Crafting Commandments
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-2">
            Avoid wasting thousands of materials. These five cardinal rules separate casual spenders from tournament-grade governors.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-8">
          {CRAFTING_COMMANDMENTS.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => setActiveCommandment(cmd.id)}
              className={`p-4 rounded-xl text-left transition-all border flex flex-col justify-between ${
                activeCommandment === cmd.id
                  ? "bg-amber-500/15 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-white"
                  : "bg-[#10141f] border-[#1d2435] text-slate-400 hover:text-white hover:border-slate-600"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-amber-400">#0{cmd.id}</span>
                {activeCommandment === cmd.id && (
                  <Check size={14} className="text-amber-400" />
                )}
              </div>
              <h5 className="text-xs font-bold tracking-wide line-clamp-2">{cmd.title}</h5>
            </button>
          ))}
        </div>

        {/* Active Commandment Detailed Breakdown Card */}
        {(() => {
          const selected = CRAFTING_COMMANDMENTS.find((c) => c.id === activeCommandment);
          return (
            <div className="bg-[#10141f] border border-amber-500/30 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1e2433] pb-4 mb-4">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-widest">
                    Rule #{selected.id} Mandate
                  </span>
                  <h4 className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                    {selected.title}
                  </h4>
                </div>
                <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                  {selected.rule}
                </div>
              </div>

              <p className="text-xs sm:text-base text-slate-300 font-mono leading-relaxed">
                {selected.explanation}
              </p>
            </div>
          );
        })()}

      </div>

    </section>
  );
}
