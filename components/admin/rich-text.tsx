"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Heading3, List, ListOrdered, Link2, RemoveFormatting, Code2, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/cn";

// A small, dependable rich text editor for descriptions and pages. The server cleans
// whatever comes out of it (lib/sanitize.ts), so pasted junk from other sites is safe.
export default function RichText({ value, onChange, placeholder = "Write here…", minHeight = 220 }: { value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [raw, setRaw] = useState(false);
  const last = useRef(value);

  useEffect(() => {
    if (ref.current && value !== last.current) {
      ref.current.innerHTML = value;
      last.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (ref.current && !raw) ref.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);

  const emit = () => {
    const html = ref.current?.innerHTML ?? "";
    last.current = html;
    onChange(html);
  };
  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const tools = [
    { icon: Bold, label: "Bold", run: () => exec("bold") },
    { icon: Italic, label: "Italic", run: () => exec("italic") },
    { icon: Heading3, label: "Heading", run: () => exec("formatBlock", "h3") },
    { icon: List, label: "Bullet list", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", run: () => exec("insertOrderedList") },
    {
      icon: Link2,
      label: "Link",
      run: () => {
        const url = prompt("Link address (https://… or /page)");
        if (url) exec("createLink", url);
      },
    },
    {
      icon: RemoveFormatting,
      label: "Clear formatting",
      run: () => {
        exec("removeFormat");
        exec("formatBlock", "p");
      },
    },
    { icon: Undo2, label: "Undo", run: () => exec("undo") },
    { icon: Redo2, label: "Redo", run: () => exec("redo") },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-line-strong bg-secondary focus-within:border-ring">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/60 p-1">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.label}
            aria-label={t.label}
            disabled={raw}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.run}
            className="grid size-7 place-items-center rounded-md text-soft hover:bg-foreground/[0.07] hover:text-foreground disabled:opacity-40"
          >
            <t.icon className="size-3.5" aria-hidden />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setRaw(!raw)}
          className={cn("caption-style ml-auto flex h-7 items-center gap-1 rounded-md px-2 text-soft hover:bg-foreground/[0.07]", raw && "bg-foreground/[0.07] text-foreground")}
        >
          <Code2 className="size-3.5" aria-hidden /> HTML
        </button>
      </div>
      {raw ? (
        <textarea
          value={value}
          onChange={(e) => {
            last.current = e.target.value;
            onChange(e.target.value);
          }}
          className="block w-full resize-y bg-transparent p-3 font-mono text-[12.5px] leading-relaxed outline-none"
          style={{ minHeight }}
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-placeholder={placeholder}
          onInput={emit}
          onBlur={emit}
          onPaste={(e) => {
            // paste as clean text with line breaks, so styled junk from other sites doesn't come along
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertHTML", false, text.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`).join(""));
            emit();
          }}
          className="editor-surface overflow-y-auto p-3"
          style={{ minHeight, maxHeight: 560 }}
        />
      )}
    </div>
  );
}
