import { History, Users } from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/magic/bento-grid";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const colors = ["#E5484D", "#12A594", "#8E4EC6", "#F76B15"];

function MiniChat() {
  const rows = [
    ["L", 0, "Kasama ba ang chapter 7 sa midterm?"],
    ["M", 1, "Sabi ni Sir, 7.1 hanggang 7.3 lang"],
    ["A", 2, "Ilalagay ko sa taas ng notes natin"],
  ] as const;
  return (
    <div className="space-y-2.5 rounded-xl border bg-background p-4">
      {rows.map(([l, c, t]) => (
        <div key={t} className="flex items-center gap-2.5">
          <Avatar className="size-6">
            <AvatarFallback style={{ background: colors[c] }} className="text-[10px]">{l}</AvatarFallback>
          </Avatar>
          <span className="rounded-lg bg-muted px-3 py-1.5 text-sm">{t}</span>
        </div>
      ))}
    </div>
  );
}

function MiniMarkdown() {
  return (
    <div className="space-y-3 rounded-xl border bg-background p-4 text-sm">
      <pre className="font-mono text-[12.5px] leading-relaxed text-muted-foreground">{"## Week 4\nRemember ==the chain rule==\n- [x] Problem set"}</pre>
      <div className="h-px bg-border" />
      <div>
        <div className="font-display text-base font-bold">Week 4</div>
        <div>
          Remember <span className="mark">the chain rule</span>
        </div>
      </div>
    </div>
  );
}

function MiniPresence() {
  return (
    <div className="space-y-3 rounded-xl border bg-background p-4">
      <div className="flex -space-x-2">
        {colors.map((c, i) => (
          <div key={c} className="relative">
            <Avatar className="size-9 ring-2 ring-background">
              <AvatarFallback style={{ background: c }}>{"LMAJ"[i]}</AvatarFallback>
            </Avatar>
            {i < 3 && <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-online ring-2 ring-background" />}
          </div>
        ))}
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="size-4" /> Jomar is editing “Week 4”
      </p>
    </div>
  );
}

function MiniHistory() {
  const rows = [
    ["Today, 9:41 PM", "Ligaya"],
    ["Today, 8:12 PM", "Miguel"],
    ["Yesterday", "Andrea"],
  ];
  return (
    <div className="divide-y rounded-xl border bg-background">
      {rows.map(([t, who], i) => (
        <div key={t} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <History className="size-4 text-muted-foreground" />
          <span className="font-medium">{t}</span>
          <span className="text-muted-foreground">saved by {who}</span>
          <span className="ml-auto rounded-md border px-2 py-0.5 text-xs font-medium">{i === 0 ? "Current" : "Restore"}</span>
        </div>
      ))}
    </div>
  );
}

export function Bento() {
  return (
    <BentoGrid>
      <BentoCard
        className="rounded-[28px] md:col-span-4"
        title="Chat that stays with the notes"
        description="Questions get answered where the notes live. Messages arrive instantly and the history is there when you come back."
        visual={<MiniChat />}
      />
      <BentoCard
        className="rounded-xl md:col-span-2"
        title="Notes in markdown"
        description="Headings, tables, checklists and code. Wrap text in == to highlight it."
        visual={<MiniMarkdown />}
      />
      <BentoCard
        className="rounded-xl md:col-span-2"
        title="See who's here"
        description="Presence shows who's online and which note they're writing, so nobody types over anybody."
        visual={<MiniPresence />}
      />
      <BentoCard
        className="rounded-[28px] md:col-span-4"
        title="Undo a bad edit, any edit"
        description="Every note keeps checkpoints as you work. Restore an earlier version before you need it, not after."
        visual={<MiniHistory />}
      />
    </BentoGrid>
  );
}
