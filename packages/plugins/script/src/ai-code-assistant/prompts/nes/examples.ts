/**
 * NES Few-Shot 示例库
 * 6 种 changeType 的详细示例
 */

/**
 * changeType 示例（用于训练模型正确分类）
 */
export const CHANGE_TYPE_EXAMPLES = `
### Example 1: REPLACE_LINE (Logic Error)
<code>
function findMax(a: number, b: number): number {
  return a > b ? b : a;  // ❌ Wrong logic
}
</code>

<prediction>
{
  "targetLine": 2,
  "originalLineContent": "  return a > b ? b : a;",
  "suggestionText": "  return a > b ? a : b;",
  "explanation": "Fix logic error: should return a when a > b",
  "confidence": 0.95,
  "priority": 1,
  "changeType": "REPLACE_LINE"
}
</prediction>

---

### Example 2: REPLACE_WORD (Keyword Typo)
<code>
funct ion greet(name: string): string {
  return \`Hello, \${name}!\`;
}
</code>

<prediction>
{
  "targetLine": 1,
  "originalLineContent": "funct ion greet(name: string): string {",
  "suggestionText": "function greet(name: string): string {",
  "explanation": "Fix keyword typo: 'funct ion' → 'function'",
  "confidence": 0.98,
  "priority": 1,
  "changeType": "REPLACE_WORD"
}
</prediction>

---

### Example 3: REPLACE_WORD (Operator Error)
<code>
function isValid(value: string): boolean {
  if (value !== null || value !== undefined) {
    return true;
  }
  return false;
}
</code>

<prediction>
{
  "targetLine": 2,
  "originalLineContent": "  if (value !== null || value !== undefined) {",
  "suggestionText": "  if (value !== null && value !== undefined) {",
  "explanation": "Fix operator: '||' should be '&&'",
  "confidence": 0.92,
  "priority": 1,
  "changeType": "REPLACE_WORD"
}
</prediction>

---

### Example 4: INSERT (Add Property)
<code>
class Point3D {
  x: number;
  y: number;
  // Missing z property
}
</code>

<prediction>
{
  "targetLine": 3,
  "originalLineContent": "  y: number;",
  "suggestionText": "  z: number;",
  "explanation": "Add z property to match Point3D class name",
  "confidence": 0.90,
  "priority": 1,
  "changeType": "INSERT"
}
</prediction>

---

### Example 5: DELETE (Remove Unused Import)
<code>
import { ref } from 'vue';
import { computed } from 'vue';  // ❌ Not used
import { watch } from 'vue';

const count = ref(0);
</code>

<prediction>
{
  "targetLine": 2,
  "originalLineContent": "import { computed } from 'vue';",
  "suggestionText": "",
  "explanation": "Remove unused import: 'computed' is not used",
  "confidence": 0.88,
  "priority": 2,
  "changeType": "DELETE"
}
</prediction>

---

### Example 6: INLINE_INSERT (Extend Expression)
<code>
class Point3D {
  x: number;
  y: number;
  z: number;
  
  getDistance() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
}
</code>

<prediction>
{
  "targetLine": 7,
  "originalLineContent": "    return Math.sqrt(this.x ** 2 + this.y ** 2);",
  "suggestionText": "    return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);",
  "explanation": "Add z calculation to match Point3D",
  "confidence": 0.93,
  "priority": 1,
  "changeType": "INLINE_INSERT"
}
</prediction>
`

/**
 * 完整的 NES 对话示例
 */
export const NES_FULL_EXAMPLE = `
user:
<edit_history>
[1] 10:30:15 | Line 5:10
   Action: replace
   Old: "createUser"
   New: "createUser123"
   Context: functionName
   Line: function createUser123(name: string) {
</edit_history>
<recent_change>
Renamed function 'createUser' to 'createUser123'
</recent_change>
<code_window>
5: function createUser123(name: string) {
6:   return { name };
7: }
8:
9: const user1 = createUser("Alice");
10: const user2 = createUser("Bob");
11: const user3 = createUser("Charlie");
</code_window>

assistant:
{
  "analysis": {
    "change_type": "renameFunction",
    "summary": "Function 'createUser' renamed to 'createUser123'",
    "impact": "Need to update all 3 function calls to use the new name",
    "pattern": "Function rename - all usages must be updated"
  },
  "predictions": [
    {
      "targetLine": 9,
      "originalLineContent": "const user1 = createUser(\\"Alice\\");",
      "suggestionText": "const user1 = createUser123(\\"Alice\\");",
      "explanation": "Update function call to match renamed function",
      "confidence": 0.95,
      "priority": 1,
      "changeType": "REPLACE_WORD"
    },
    {
      "targetLine": 10,
      "originalLineContent": "const user2 = createUser(\\"Bob\\");",
      "suggestionText": "const user2 = createUser123(\\"Bob\\");",
      "explanation": "Update function call to match renamed function",
      "confidence": 0.95,
      "priority": 1,
      "changeType": "REPLACE_WORD"
    },
    {
      "targetLine": 11,
      "originalLineContent": "const user3 = createUser(\\"Charlie\\");",
      "suggestionText": "const user3 = createUser123(\\"Charlie\\");",
      "explanation": "Update function call to match renamed function",
      "confidence": 0.95,
      "priority": 1,
      "changeType": "REPLACE_WORD"
    }
  ]
}`
