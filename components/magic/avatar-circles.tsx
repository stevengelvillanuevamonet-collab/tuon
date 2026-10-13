import { initials, cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface CirclePerson {
  id: string;
  name: string;
  color: string;
  online?: boolean;
}

/** Magic UI-style avatar circles: overlapping avatars with an overflow count. */
export function AvatarCircles({
  people,
  max = 4,
  total,
  className,
  avatarClassName,
}: {
  people: CirclePerson[];
  max?: number;
  /** Total number of people when `people` is only a slice. */
  total?: number;
  className?: string;
  avatarClassName?: string;
}) {
  const shown = people.slice(0, max);
  const extra = (total ?? people.length) - shown.length;
  return (
    <span className={cn("flex -space-x-2", className)}>
      {shown.map((p) => (
        <span key={p.id} className="relative">
          <Avatar className={cn("size-7 ring-2 ring-background", avatarClassName)}>
            <AvatarFallback style={{ background: p.color }}>{initials(p.name)}</AvatarFallback>
          </Avatar>
          {p.online && <span className="absolute right-0 bottom-0 size-2 rounded-full bg-online ring-2 ring-background" />}
        </span>
      ))}
      {extra > 0 && (
        <span className={cn("relative flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold ring-2 ring-background", avatarClassName)}>+{extra}</span>
      )}
    </span>
  );
}
