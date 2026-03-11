/**
 * Context menu module.
 *
 * Provides a lightweight, extensible right-click context menu that integrates
 * with the Hypernode design system tokens and radius presets.
 *
 * Usage:
 *   const menu = createContextMenu();
 *   menu.show({ clientX, clientY, items: [ … ] });
 *   menu.hide();
 *   menu.destroy();
 *
 * Each item in `items` may be:
 *   { label, icon?, shortcut?, action, disabled? }   – action item
 *   { separator: true }                              – visual divider
 */

/**
 * @typedef {Object} ContextMenuItem
 * @property {string}   label       – visible menu label
 * @property {string}   [icon]      – Bootstrap Icons class (e.g. "bi-plus-square")
 * @property {string}   [shortcut]  – shortcut hint text
 * @property {Function} action      – callback invoked on click
 * @property {boolean}  [disabled]  – grey-out and skip click
 */

/**
 * @typedef {Object} ContextMenuSeparator
 * @property {true} separator
 */

/**
 * @typedef {Object} ShowOptions
 * @property {number}  clientX  – viewport X from the pointer event
 * @property {number}  clientY  – viewport Y from the pointer event
 * @property {Array<ContextMenuItem | ContextMenuSeparator>} items
 */

export function createContextMenu() {
  let containerEl = null;
  let backdropEl = null;
  let listEl = null;
  let focusedIndex = -1;
  let currentItems = [];
  let isVisible = false;

  // ── DOM construction ────────────────────────────────────────────────
  function ensureDOM() {
    if (containerEl) return;

    backdropEl = document.createElement("div");
    backdropEl.className = "context-menu__backdrop";
    backdropEl.addEventListener("pointerdown", hide);

    containerEl = document.createElement("div");
    containerEl.className = "context-menu";
    containerEl.setAttribute("role", "menu");
    containerEl.setAttribute("aria-label", "Context menu");
    containerEl.hidden = true;

    listEl = document.createElement("ul");
    listEl.className = "context-menu__list";
    containerEl.appendChild(listEl);

    document.body.appendChild(backdropEl);
    document.body.appendChild(containerEl);
  }

  // ── Rendering ───────────────────────────────────────────────────────
  function renderItems(items) {
    listEl.innerHTML = "";
    currentItems = items;
    focusedIndex = -1;

    items.forEach((item, index) => {
      if (item.separator) {
        const sep = document.createElement("li");
        sep.className = "context-menu__separator";
        sep.setAttribute("role", "separator");
        listEl.appendChild(sep);
        return;
      }

      const li = document.createElement("li");
      li.className = "context-menu__item";
      li.setAttribute("role", "menuitem");
      li.setAttribute("tabindex", "-1");
      li.dataset.index = String(index);

      if (item.disabled) {
        li.classList.add("context-menu__item--disabled");
        li.setAttribute("aria-disabled", "true");
      }

      // Icon
      if (item.icon) {
        const iconEl = document.createElement("i");
        iconEl.className = `bi ${item.icon} context-menu__icon`;
        iconEl.setAttribute("aria-hidden", "true");
        li.appendChild(iconEl);
      }

      // Label
      const labelEl = document.createElement("span");
      labelEl.className = "context-menu__label";
      labelEl.textContent = item.label;
      li.appendChild(labelEl);

      // Shortcut hint
      if (item.shortcut) {
        const shortcutEl = document.createElement("span");
        shortcutEl.className = "context-menu__shortcut";
        shortcutEl.textContent = item.shortcut;
        li.appendChild(shortcutEl);
      }

      li.addEventListener("click", (event) => {
        event.stopPropagation();
        if (item.disabled) return;
        hide();
        item.action();
      });

      listEl.appendChild(li);
    });
  }

  // ── Positioning ─────────────────────────────────────────────────────
  function positionMenu(clientX, clientY) {
    containerEl.style.left = "0px";
    containerEl.style.top = "0px";
    containerEl.hidden = false;

    const rect = containerEl.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const pad = 6;

    let x = clientX;
    let y = clientY;

    if (x + rect.width + pad > viewW) {
      x = Math.max(pad, clientX - rect.width);
    }
    if (y + rect.height + pad > viewH) {
      y = Math.max(pad, clientY - rect.height);
    }

    containerEl.style.left = `${x}px`;
    containerEl.style.top = `${y}px`;
  }

  // ── Keyboard navigation ─────────────────────────────────────────────
  function getActionableIndices() {
    return currentItems
      .map((item, i) => (!item.separator && !item.disabled ? i : -1))
      .filter((i) => i !== -1);
  }

  function setFocused(index) {
    const items = listEl.querySelectorAll(".context-menu__item");
    items.forEach((el) => el.classList.remove("context-menu__item--focused"));
    focusedIndex = index;
    const target = listEl.querySelector(`[data-index="${index}"]`);
    if (target) {
      target.classList.add("context-menu__item--focused");
      target.focus({ preventScroll: true });
    }
  }

  function onKeyDown(event) {
    if (!isVisible) return;
    const actionable = getActionableIndices();
    if (!actionable.length) return;

    if (event.key === "ArrowDown" || event.key === "Tab") {
      event.preventDefault();
      const curPos = actionable.indexOf(focusedIndex);
      const next = curPos < actionable.length - 1 ? curPos + 1 : 0;
      setFocused(actionable[next]);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const curPos = actionable.indexOf(focusedIndex);
      const prev = curPos > 0 ? curPos - 1 : actionable.length - 1;
      setFocused(actionable[prev]);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (focusedIndex >= 0 && currentItems[focusedIndex]?.action) {
        hide();
        currentItems[focusedIndex].action();
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      hide();
    }
  }

  function onScroll() {
    if (isVisible) hide();
  }

  // ── Public API ──────────────────────────────────────────────────────

  /** Show the context menu at the given client position with the given items. */
  function show({ clientX, clientY, items }) {
    ensureDOM();
    renderItems(items);
    positionMenu(clientX, clientY);

    backdropEl.hidden = false;
    isVisible = true;

    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("wheel", onScroll, { passive: true, capture: true });

    // Focus first actionable item
    const actionable = getActionableIndices();
    if (actionable.length) {
      window.requestAnimationFrame(() => setFocused(actionable[0]));
    }
  }

  /** Hide and clean up the menu. */
  function hide() {
    if (!isVisible) return;
    isVisible = false;

    if (containerEl) containerEl.hidden = true;
    if (backdropEl) backdropEl.hidden = true;

    document.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("wheel", onScroll, { passive: true, capture: true });
  }

  /** Remove all DOM and listeners permanently. */
  function destroy() {
    hide();
    containerEl?.remove();
    backdropEl?.remove();
    containerEl = null;
    backdropEl = null;
    listEl = null;
  }

  /** Whether the menu is currently visible. */
  function visible() {
    return isVisible;
  }

  return { show, hide, destroy, visible };
}
