/**
 * Layout dedicato embed: no sidebar/topbar, output minimo.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", padding: "12px", fontSize: "13px" }}>{children}</div>;
}
