import type { GodotClassDoc } from "../types.js";

interface ConceptRule {
  /** Ancestor class names that trigger this concept */
  ancestors: string[];
  /** Glob-style name patterns (case-insensitive). Use * as wildcard. */
  namePatterns: RegExp[];
  /** Keywords to search in brief + description (lowercase) */
  descriptionKeywords: string[];
}

const CONCEPT_RULES: Record<string, ConceptRule> = {
  scene_tree: {
    ancestors: ["Node"],
    namePatterns: [],
    descriptionKeywords: ["node", "scene", "tree", "child", "parent"],
  },
  physics: {
    ancestors: [
      "PhysicsBody2D",
      "PhysicsBody3D",
      "CollisionObject2D",
      "CollisionObject3D",
      "Joint2D",
      "Joint3D",
      "CollisionShape2D",
      "CollisionShape3D",
    ],
    namePatterns: [
      /^Physics/i,
      /Body/i,
      /Joint/i,
      /Collision/i,
      /Shape2D/i,
      /Shape3D/i,
    ],
    descriptionKeywords: ["physics", "force", "collision", "velocity", "gravity"],
  },
  rendering: {
    ancestors: ["VisualInstance3D", "Light2D", "Light3D", "CanvasItem"],
    namePatterns: [
      /Light/i,
      /Material/i,
      /Shader/i,
      /Texture/i,
      /Mesh/i,
      /^Camera/i,
      /Sprite/i,
      /^Visual/i,
    ],
    descriptionKeywords: ["render", "draw", "material", "light", "texture", "shader", "mesh", "visual"],
  },
  audio: {
    ancestors: ["AudioStreamPlayer", "AudioStreamPlayer2D", "AudioStreamPlayer3D"],
    namePatterns: [/^Audio/i, /Sound/i],
    descriptionKeywords: ["audio", "sound", "music", "playback", "bus"],
  },
  animation: {
    ancestors: ["AnimationMixer"],
    namePatterns: [/^Animation/i, /Tween/i, /^Skeleton/i],
    descriptionKeywords: ["animation", "keyframe", "skeleton", "blend", "tween"],
  },
  ui: {
    ancestors: ["Control"],
    namePatterns: [
      /Button/i,
      /Label/i,
      /Container/i,
      /Panel/i,
      /Dialog/i,
      /Menu/i,
      /Slider/i,
      /Bar/i,
    ],
    descriptionKeywords: ["control", "button", "widget", "gui", "interface", "theme"],
  },
  input: {
    ancestors: [],
    namePatterns: [/^Input/i, /Event/i],
    descriptionKeywords: ["input", "key", "mouse", "touch", "gamepad", "action", "gesture"],
  },
  networking: {
    ancestors: [],
    namePatterns: [/^Multiplayer/i, /Peer/i, /^HTTP/i, /^WebSocket/i],
    descriptionKeywords: ["network", "multiplayer", "peer", "rpc", "server", "client"],
  },
  resources: {
    ancestors: ["Resource"],
    namePatterns: [/Resource/i, /Loader/i, /Saver/i],
    descriptionKeywords: ["resource", "load", "save", "import", "asset"],
  },
  math: {
    ancestors: [],
    namePatterns: [
      /^Vector/i,
      /^Transform/i,
      /^Basis$/i,
      /^Quaternion$/i,
      /^AABB$/i,
      /^Rect/i,
      /^Plane$/i,
      /^Color$/i,
    ],
    descriptionKeywords: ["vector", "matrix", "transform", "math", "geometry", "interpolat"],
  },
};

export function classifyConcepts(classes: GodotClassDoc[]): Map<string, string[]> {
  const byName = new Map<string, GodotClassDoc>(classes.map((c) => [c.name, c]));

  function getAncestors(name: string): string[] {
    const chain: string[] = [];
    let cur = byName.get(name);
    while (cur?.inherits) {
      chain.push(cur.inherits);
      cur = byName.get(cur.inherits);
    }
    return chain;
  }

  // Cache ancestor chains
  const ancestorCache = new Map<string, string[]>();
  for (const c of classes) {
    ancestorCache.set(c.name, getAncestors(c.name));
  }

  // For the "resources" concept, we need to know which classes inherit from Node
  // so we can exclude them (resources = inherits Resource but NOT Node)
  const nodeDescendants = new Set<string>();
  for (const c of classes) {
    const ancestors = ancestorCache.get(c.name) || [];
    if (ancestors.includes("Node") || c.name === "Node") {
      nodeDescendants.add(c.name);
    }
  }

  const result = new Map<string, string[]>();

  for (const c of classes) {
    const ancestors = ancestorCache.get(c.name) || [];
    const tags = new Set<string>();
    const textLower = `${c.brief || ""} ${c.description || ""}`.toLowerCase();

    for (const [concept, rule] of Object.entries(CONCEPT_RULES)) {
      let matched = false;

      // Check inheritance
      if (rule.ancestors.length > 0) {
        for (const anc of rule.ancestors) {
          if (c.name === anc || ancestors.includes(anc)) {
            // For resources: exclude Node descendants
            if (concept === "resources" && nodeDescendants.has(c.name)) {
              continue;
            }
            matched = true;
            break;
          }
        }
      }

      // Check name patterns
      if (!matched) {
        for (const pat of rule.namePatterns) {
          if (pat.test(c.name)) {
            matched = true;
            break;
          }
        }
      }

      // Check description keywords
      if (!matched && textLower.length > 1) {
        for (const kw of rule.descriptionKeywords) {
          if (textLower.includes(kw)) {
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        tags.add(concept);
      }
    }

    if (tags.size === 0) {
      tags.add("general");
    }

    result.set(c.name, Array.from(tags));
  }

  return result;
}
