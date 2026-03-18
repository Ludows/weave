/**
 * Cloak system — Hide elements until Weave has initialized
 *
 * Add a `[weave-cloak]` attribute to any element that should be hidden
 * before Weave processes it (avoids flash of un-initialized content).
 *
 * Required CSS (add once in your stylesheet):
 *   [weave-cloak] { display: none !important; }
 *
 * Weave removes the attribute automatically on every instance root after
 * onInit. You can also call initCloak() manually inside an onInit hook.
 *
 * @example
 * HTML:
 *   <div id="app" weave-cloak>...</div>
 *
 * CSS:
 *   [weave-cloak] { display: none !important; }
 *
 * JS (automatic — no extra code needed):
 *   weave('#app', ({ onInit }) => { ... });
 */

/**
 * Remove the `weave-cloak` attribute from the root element and all its
 * descendants that carry it.
 */
export function initCloak(root: Element): void {
  root.removeAttribute('weave-cloak');
  root.querySelectorAll('[weave-cloak]').forEach(el => {
    el.removeAttribute('weave-cloak');
  });
}
