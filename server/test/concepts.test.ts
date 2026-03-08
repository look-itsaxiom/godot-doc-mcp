import { describe, it, expect } from 'vitest';
import { parseAll } from '../src/parser/xmlParser.js';
import { buildIndex } from '../src/indexer/indexBuilder.js';
import { classifyConcepts } from '../src/concepts/classifier.js';
import { createGodotTools } from '../src/adapters/godotTools.js';

describe('concept tool output limits', () => {
  let tools: Awaited<ReturnType<typeof createGodotTools>>;

  // Build tools once for all tests
  const setup = (async () => {
    const classes = await parseAll('./doc');
    const index = buildIndex(classes);
    const conceptMap = classifyConcepts(classes);
    return createGodotTools(classes, index, undefined, conceptMap);
  })();

  it('caps class list to 25 by default', async () => {
    tools = await setup;
    const result = await tools.getConcept({ name: 'scene_tree' });
    expect(result.classes.length).toBeLessThanOrEqual(25);
    expect(result.totalClasses).toBeGreaterThan(25);
  });

  it('respects custom maxClasses', async () => {
    tools = await setup;
    const result = await tools.getConcept({ name: 'scene_tree', maxClasses: 5 });
    expect(result.classes.length).toBe(5);
  });

  it('returns all classes when maxClasses exceeds total', async () => {
    tools = await setup;
    const result = await tools.getConcept({ name: 'math', maxClasses: 1000 });
    expect(result.classes.length).toBe(result.totalClasses);
  });

  it('includes totalClasses count', async () => {
    tools = await setup;
    const result = await tools.getConcept({ name: 'physics' });
    expect(result.totalClasses).toBeTypeOf('number');
    expect(result.totalClasses).toBeGreaterThan(0);
  });

  it('sorts concept-relevant classes first', async () => {
    tools = await setup;
    const result = await tools.getConcept({ name: 'physics' });
    // First few classes should have "physics" or related keywords in their name
    const firstFive = result.classes.slice(0, 5).map(c => c.name.toLowerCase());
    const hasPhysicsKeyword = firstFive.some(n => n.includes('physics') || n.includes('body') || n.includes('collision'));
    expect(hasPhysicsKeyword).toBe(true);
  });
});
