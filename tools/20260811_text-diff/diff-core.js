(function attachTextDiffCore(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.TextDiffCore = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const normalizeNewlines = value => String(value ?? '').replace(/\r\n?/g, '\n');

  const splitLines = value => {
    const normalized = normalizeNewlines(value);
    return normalized === '' ? [] : normalized.split('\n');
  };

  const normalizeLine = (line, options = {}) => {
    let normalized = line;

    if (options.ignoreWhitespace) {
      normalized = normalized.replace(/\s+/gu, ' ').trim();
    }

    if (options.ignoreCase) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  };

  const diffSequence = (left, right, equals = (a, b) => a === b) => {
    const leftLength = left.length;
    const rightLength = right.length;
    const max = leftLength + rightLength;
    const offset = max + 1;
    const size = (max * 2) + 3;
    let frontier = new Int32Array(size);
    frontier.fill(-1);
    frontier[offset + 1] = 0;

    const trace = [];
    let endDepth = 0;
    let complete = false;

    for (let depth = 0; depth <= max; depth += 1) {
      trace.push(frontier.slice());

      for (let diagonal = -depth; diagonal <= depth; diagonal += 2) {
        const index = offset + diagonal;
        let leftIndex;

        if (
          diagonal === -depth
          || (diagonal !== depth && frontier[index - 1] < frontier[index + 1])
        ) {
          leftIndex = frontier[index + 1];
        } else {
          leftIndex = frontier[index - 1] + 1;
        }

        let rightIndex = leftIndex - diagonal;

        while (
          leftIndex < leftLength
          && rightIndex < rightLength
          && equals(left[leftIndex], right[rightIndex])
        ) {
          leftIndex += 1;
          rightIndex += 1;
        }

        frontier[index] = leftIndex;

        if (leftIndex >= leftLength && rightIndex >= rightLength) {
          endDepth = depth;
          complete = true;
          break;
        }
      }

      if (complete) break;
    }

    let leftIndex = leftLength;
    let rightIndex = rightLength;
    const operations = [];

    for (let depth = endDepth; depth >= 0; depth -= 1) {
      const previous = trace[depth];
      const diagonal = leftIndex - rightIndex;
      const index = offset + diagonal;
      const previousDiagonal = (
        diagonal === -depth
        || (diagonal !== depth && previous[index - 1] < previous[index + 1])
      ) ? diagonal + 1 : diagonal - 1;
      const previousLeft = previous[offset + previousDiagonal];
      const previousRight = previousLeft - previousDiagonal;

      while (leftIndex > previousLeft && rightIndex > previousRight) {
        operations.push({
          type: 'equal',
          left: left[leftIndex - 1],
          right: right[rightIndex - 1],
        });
        leftIndex -= 1;
        rightIndex -= 1;
      }

      if (depth === 0) break;

      if (leftIndex === previousLeft) {
        rightIndex -= 1;
        operations.push({ type: 'insert', right: right[rightIndex] });
      } else {
        leftIndex -= 1;
        operations.push({ type: 'delete', left: left[leftIndex] });
      }
    }

    return operations.reverse();
  };

  const appendSegment = (segments, type, text) => {
    if (text === '') return;
    const last = segments.at(-1);

    if (last?.type === type) {
      last.text += text;
    } else {
      segments.push({ type, text });
    }
  };

  const createCharacterSegments = (left, right) => {
    const leftCharacters = Array.from(left);
    const rightCharacters = Array.from(right);

    if (leftCharacters.length + rightCharacters.length > 4000) {
      return {
        left: left === '' ? [] : [{ type: 'deleted', text: left }],
        right: right === '' ? [] : [{ type: 'added', text: right }],
      };
    }

    const operations = diffSequence(leftCharacters, rightCharacters);
    const leftSegments = [];
    const rightSegments = [];

    operations.forEach(operation => {
      if (operation.type === 'equal') {
        appendSegment(leftSegments, 'equal', operation.left);
        appendSegment(rightSegments, 'equal', operation.right);
      } else if (operation.type === 'delete') {
        appendSegment(leftSegments, 'deleted', operation.left);
      } else {
        appendSegment(rightSegments, 'added', operation.right);
      }
    });

    return { left: leftSegments, right: rightSegments };
  };

  const assignLineNumbers = operations => {
    let leftLine = 0;
    let rightLine = 0;

    return operations.map(operation => {
      const numbered = { ...operation, leftLine: null, rightLine: null };

      if (operation.type !== 'insert') {
        leftLine += 1;
        numbered.leftLine = leftLine;
      }

      if (operation.type !== 'delete') {
        rightLine += 1;
        numbered.rightLine = rightLine;
      }

      return numbered;
    });
  };

  const alignOperations = operations => {
    const rows = [];
    let deleted = [];
    let inserted = [];

    const flushChanges = () => {
      const rowCount = Math.max(deleted.length, inserted.length);

      for (let index = 0; index < rowCount; index += 1) {
        const left = deleted[index];
        const right = inserted[index];

        if (left && right) {
          const segments = createCharacterSegments(left.left, right.right);
          rows.push({
            status: 'changed',
            leftLine: left.leftLine,
            rightLine: right.rightLine,
            leftText: left.left,
            rightText: right.right,
            leftSegments: segments.left,
            rightSegments: segments.right,
          });
        } else if (left) {
          rows.push({
            status: 'deleted',
            leftLine: left.leftLine,
            rightLine: null,
            leftText: left.left,
            rightText: '',
            leftSegments: left.left === '' ? [] : [{ type: 'deleted', text: left.left }],
            rightSegments: [],
          });
        } else if (right) {
          rows.push({
            status: 'added',
            leftLine: null,
            rightLine: right.rightLine,
            leftText: '',
            rightText: right.right,
            leftSegments: [],
            rightSegments: right.right === '' ? [] : [{ type: 'added', text: right.right }],
          });
        }
      }

      deleted = [];
      inserted = [];
    };

    operations.forEach(operation => {
      if (operation.type === 'equal') {
        flushChanges();
        rows.push({
          status: 'equal',
          leftLine: operation.leftLine,
          rightLine: operation.rightLine,
          leftText: operation.left,
          rightText: operation.right,
          leftSegments: operation.left === '' ? [] : [{ type: 'equal', text: operation.left }],
          rightSegments: operation.right === '' ? [] : [{ type: 'equal', text: operation.right }],
        });
      } else if (operation.type === 'delete') {
        deleted.push(operation);
      } else {
        inserted.push(operation);
      }
    });

    flushChanges();
    return rows;
  };

  const createUnifiedDiff = rows => {
    if (rows.length === 0) return '';
    const output = ['--- 原始文本', '+++ 对比文本'];

    rows.forEach(row => {
      if (row.status === 'equal') {
        output.push(`  ${row.leftText}`);
      } else if (row.status === 'deleted') {
        output.push(`- ${row.leftText}`);
      } else if (row.status === 'added') {
        output.push(`+ ${row.rightText}`);
      } else {
        output.push(`- ${row.leftText}`, `+ ${row.rightText}`);
      }
    });

    return output.join('\n');
  };

  const compareTexts = (leftText, rightText, options = {}) => {
    const leftLines = splitLines(leftText);
    const rightLines = splitLines(rightText);
    const indexedLeft = leftLines.map(text => ({
      text,
      comparable: normalizeLine(text, options),
    }));
    const indexedRight = rightLines.map(text => ({
      text,
      comparable: normalizeLine(text, options),
    }));
    const operations = assignLineNumbers(diffSequence(
      indexedLeft,
      indexedRight,
      (left, right) => left.comparable === right.comparable,
    ).map(operation => ({
      type: operation.type,
      left: operation.left?.text,
      right: operation.right?.text,
    })));
    const rows = alignOperations(operations);
    const stats = rows.reduce((counts, row) => {
      counts[row.status] += 1;
      return counts;
    }, { equal: 0, changed: 0, added: 0, deleted: 0 });

    return {
      rows,
      stats,
      leftLineCount: leftLines.length,
      rightLineCount: rightLines.length,
      hasDifferences: stats.changed + stats.added + stats.deleted > 0,
      unifiedDiff: createUnifiedDiff(rows),
    };
  };

  return {
    compareTexts,
    createCharacterSegments,
    normalizeLine,
    normalizeNewlines,
    splitLines,
  };
});
