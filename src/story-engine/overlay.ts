type RawStory = {
  installedApps?: Array<string | { id: string }>;
  revision?: number;
  variables?: Record<string, unknown>;
  chats?: Array<{ id: string; title: string; messages: Array<{ id: string }> }>;
  content?: Record<string, unknown[]>;
  events?: unknown[];
  tests?: unknown[];
};
type Overlay = {
  installedApps?: Array<string | { id: string }>;
  revision?: number;
  variables?: Record<string, boolean | number | string>;
  chats?: Array<{ id: string; title?: string; remove?: string[]; append?: Array<{ id: string }> }>;
  content?: Record<string, unknown[]>;
  events?: unknown[];
  tests?: unknown[];
};
export function applyStoryOverlay<T extends RawStory>(raw: T, overlay: Overlay): T {
  const chats = (raw.chats || []).map((chat) => {
    const change = overlay.chats?.find((c) => c.id === chat.id);
    if (!change) return chat;
    return {
      ...chat,
      title: change.title || chat.title,
      messages: [...chat.messages.filter((m) => !change.remove?.includes(m.id)), ...(change.append || [])],
    };
  });
  const content: Record<string, unknown[]> = { ...raw.content };
  for (const [app, items] of Object.entries(overlay.content || {}))
    content[app] = [...(content[app] || []), ...items];
  return {
    ...raw,
    installedApps: [...(raw.installedApps || []), ...(overlay.installedApps || [])],
    revision: overlay.revision || raw.revision,
    variables: { ...raw.variables, ...overlay.variables },
    chats,
    content,
    events: [...(raw.events || []), ...(overlay.events || [])],
    tests: [...(raw.tests || []), ...(overlay.tests || [])],
  } as T;
}
