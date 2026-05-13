const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'Meta'];

export const normalizeShortcut = (value = '') => {
  const aliases = {
    DEL: 'Delete',
    DELETE: 'Delete',
    SUPR: 'Delete',
    ESC: 'Escape',
    ESCAPE: 'Escape',
    ENTER: 'Enter',
    RETURN: 'Enter',
    SPACE: 'Space',
    TAB: 'Tab',
  };
  const modifiersOrder = ['Ctrl', 'Alt', 'Shift', 'Meta'];
  const modifiersMap = {
    CTRL: 'Ctrl',
    CONTROL: 'Ctrl',
    ALT: 'Alt',
    SHIFT: 'Shift',
    META: 'Meta',
    CMD: 'Meta',
    COMMAND: 'Meta',
  };

  const parts = String(value)
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    return '';
  }

  const modifiers = [];
  let mainKey = '';

  parts.forEach((part) => {
    const upper = part.toUpperCase();
    if (modifiersMap[upper]) {
      if (!modifiers.includes(modifiersMap[upper])) {
        modifiers.push(modifiersMap[upper]);
      }
      return;
    }

    mainKey = part.length === 1 ? part.toUpperCase() : aliases[upper] || part;
  });

  return [...modifiersOrder.filter((item) => modifiers.includes(item)), mainKey]
    .filter(Boolean)
    .join('+');
};

export const buildShortcutFromEvent = (event) => {
  const modifiers = [];
  if (event.ctrlKey) {
    modifiers.push('Ctrl');
  }
  if (event.altKey) {
    modifiers.push('Alt');
  }
  if (event.shiftKey) {
    modifiers.push('Shift');
  }
  if (event.metaKey) {
    modifiers.push('Meta');
  }

  if (MODIFIER_KEYS.includes(event.key)) {
    return modifiers.join('+');
  }

  return normalizeShortcut(
    [...modifiers, event.key === ' ' ? 'Space' : event.key].join('+'),
  );
};

export const matchesShortcut = (event, shortcut) =>
  buildShortcutFromEvent(event) === normalizeShortcut(shortcut);

export const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"]'),
  );
};
