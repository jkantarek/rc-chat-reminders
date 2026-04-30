// Custom ESLint rule: JSDoc may only contain @example doctest blocks.
//
// Rationale: all documentation must be executable and verified by vite-plugin-doctest.
// - Prose descriptions are banned
// - Non-@example tags (@param, @returns, @description, etc.) are banned
// - @example blocks must use the `@import.meta.vitest` code-fence marker so they
//   are actually run as doctests, not treated as inert prose examples

const TAG_RE = /^@(\w+)/;
const DOCTEST_FENCE_RE = /@import\.meta\.vitest/;

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'JSDoc comments may only contain @example doctest blocks ' +
        '(```ts @import.meta.vitest). No prose or other tags permitted.',
    },
    schema: [],
    messages: {
      prose:
        'JSDoc prose description is not allowed. Document via @example doctest blocks instead.',
      forbiddenTag: 'JSDoc tag "@{{tag}}" is not allowed. Only @example doctests are permitted.',
      notADoctest:
        '@example block must contain a ```ts @import.meta.vitest fence to be a runnable doctest.',
    },
  },

  create(context) {
    function checkJsdoc(comment) {
      if (comment.type !== 'Block' || !comment.value.startsWith('*')) return;

      const lines = comment.value.split('\n').map((l) => l.replace(/^\s*\*\s?/, ''));

      let inExample = false;
      let exampleHasDoctest = false;
      let reportedProse = false;

      function closeExample() {
        if (inExample && !exampleHasDoctest) {
          context.report({ loc: comment.loc, messageId: 'notADoctest' });
        }
        inExample = false;
        exampleHasDoctest = false;
      }

      for (const line of lines) {
        const trimmed = line.trim();
        const tagMatch = TAG_RE.exec(trimmed);

        if (tagMatch) {
          const tag = tagMatch[1];
          closeExample();
          if (tag === 'example') {
            inExample = true;
          } else {
            context.report({
              loc: comment.loc,
              messageId: 'forbiddenTag',
              data: { tag },
            });
          }
        } else if (inExample) {
          if (DOCTEST_FENCE_RE.test(line)) {
            exampleHasDoctest = true;
          }
        } else if (trimmed && !reportedProse) {
          reportedProse = true;
          context.report({ loc: comment.loc, messageId: 'prose' });
        }
      }

      closeExample();
    }

    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          checkJsdoc(comment);
        }
      },
    };
  },
};
