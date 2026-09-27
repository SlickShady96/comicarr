import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Check, Loader2 } from "lucide-react";
import { useAddComic, useAddManga } from "@/hooks/useSearch";
import { useToast } from "@/components/ui/toast";
import type { ComicAddedDetail, SearchResult, ContentType } from "@/types";

interface SearchAddButtonProps {
  comic: SearchResult;
  contentType: ContentType;
  /** Extra classes for layout, e.g. a full-width button on a grid card. */
  className?: string;
}

export default function SearchAddButton({
  comic,
  contentType,
  className = "",
}: SearchAddButtonProps) {
  const [isAdded, setIsAdded] = useState(comic.in_library ?? false);
  const [isProcessing, setIsProcessing] = useState(false);
  const addComicMutation = useAddComic();
  const addMangaMutation = useAddManga();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const comicIdRef = useRef<string | null>(null);

  const isManga = contentType === "manga";
  const itemLabel = isManga ? "Manga" : "Comic";

  useEffect(() => {
    if (!isProcessing || !comicIdRef.current) return;
    let cancelled = false;

    const handleAddById = (event: CustomEvent<string>) => {
      if (cancelled) return;
      try {
        const data: ComicAddedDetail = JSON.parse(event.detail);
        if (data.comicid === comicIdRef.current) {
          if (data.status === "success") {
            navigate(`/library/${comicIdRef.current}`);
            setIsProcessing(false);
            comicIdRef.current = null;
          } else if (data.status === "failure") {
            addToast({
              type: "error",
              title: "Failed to Add Series",
              description:
                data.message || "An error occurred while adding the series.",
            });
            setIsProcessing(false);
            setIsAdded(false);
            comicIdRef.current = null;
          }
        }
      } catch (error) {
        console.error("Error parsing comic-added event:", error);
      }
    };

    window.addEventListener("comic-added", handleAddById as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener("comic-added", handleAddById as EventListener);
    };
  }, [isProcessing, navigate, addToast]);

  const handleAdd = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      comicIdRef.current = comic.comicid ?? comic.id ?? null;
      setIsProcessing(true);
      const response = (
        isManga
          ? await addMangaMutation.mutateAsync(comic.comicid ?? comic.id)
          : await addComicMutation.mutateAsync(comic.comicid ?? comic.id)
      ) as {
        comicid?: string;
      };
      if (response?.comicid) {
        comicIdRef.current = response.comicid;
      }
      setIsAdded(true);
      addToast({
        type: "success",
        title: `Adding ${itemLabel}...`,
        description: `${comic.name} is being added to your library. Please wait...`,
        duration: 5000,
      });
    } catch (err) {
      setIsProcessing(false);
      setIsAdded(false);
      comicIdRef.current = null;
      addToast({
        type: "error",
        title: `Failed to Add ${itemLabel}`,
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const base = `inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-[5px] border font-mono text-[11px] transition-colors ${className}`;

  if (isAdded) {
    return (
      <button
        type="button"
        disabled
        className={base}
        style={{
          borderColor: "var(--border)",
          color: "var(--status-active)",
        }}
      >
        <Check className="w-3 h-3" />
        added
      </button>
    );
  }

  if (isProcessing) {
    return (
      <button
        type="button"
        disabled
        className={base}
        style={{
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        adding…
      </button>
    );
  }

  const isPending = isManga
    ? addMangaMutation.isPending
    : addComicMutation.isPending;

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={isPending}
      aria-label={`Add ${comic.name}`}
      className={`${base} hover:bg-[color-mix(in_oklab,var(--primary)_14%,transparent)]`}
      style={{
        borderColor: "var(--primary)",
        color: "var(--primary)",
      }}
    >
      <Plus className="w-3 h-3" />
      {isPending ? "adding…" : "add"}
    </button>
  );
}
