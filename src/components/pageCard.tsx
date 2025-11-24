import type { PageRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ImagePlus } from "lucide-react";

type PageCardProps = {
  page: PageRecord;
  createdLabel: string;
  isSelected?: boolean;
  onSelect?: (page: PageRecord) => void;
};

export default function PageCard({
  page,
  createdLabel,
  isSelected = false,
  onSelect,
}: PageCardProps) {
  const coverImage = page.thumbnail || page.image;
  const handleSelect = () => {
    if (onSelect) onSelect(page);
  };

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-[24px] p-4 transition hover:cursor-pointer focus-visible:outline-none",
        isSelected ? "neu-card-reversed" : "neu-card"
      )}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
    >
      <div className="flex items-center justify-between h-12 gap-4">
        <div>
          <h3 className="text-lg font-semibold leading-tight">{page.title}</h3>
          <p className="text-xs text-muted-foreground">{createdLabel}</p>
        </div>
        {coverImage && (
          <ImagePlus className="h-8 w-8 object-cover text-muted-foreground/50 mr-4 " />
        )}
      </div>
    </article>
  );
}
