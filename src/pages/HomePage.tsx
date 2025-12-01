import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, type PageRecord } from "@/lib/api";
import {
  ArrowLeft,
  LogOut,
  Plus,
  Edit,
  Trash2,
  FileText,
  Maximize2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageCard from "@/components/pageCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import ConfirmDialog from "@/components/confirm-dialog";

const PAGE_FILTER_TABS = [
  {
    id: "collections",
    label: "Coleções",
    filter: (page: PageRecord) =>
      page.tags.some((tag) => tag.name === "collection"),
  },
  { id: "library", label: "Biblioteca", filter: (_page: PageRecord) => true },
  {
    id: "gallery",
    label: "Galeria",
    filter: (page: PageRecord) => Boolean(page.image),
  },
] as const;

type TabId = (typeof PAGE_FILTER_TABS)[number]["id"];

export function HomePage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState<TabId>(PAGE_FILTER_TABS[0].id);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPage, setSelectedPage] = useState<PageRecord | null>(null);
  const [secondaryPage, setSecondaryPage] = useState<PageRecord | null>(null);
  const [pagePendingDeletion, setPagePendingDeletion] =
    useState<PageRecord | null>(null);
  const [isDeletingPage, setIsDeletingPage] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Switch to biblioteca tab when user searches
  useEffect(() => {
    if (searchTerm.trim()) {
      setActiveTab("library");
    }
  }, [searchTerm]);

  const handleLogout = async () => {
    await apiClient.logout();
    navigate("/login", { replace: true });
  };

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiClient.getPages({ limit: 500 });
      setPages(response.pages);
      setSecondaryPage((prev) => {
        if (!prev) {
          return null;
        }

        const existingSecondary = response.pages.find(
          (page) => page.id === prev.id
        );
        return existingSecondary ?? null;
      });
      setSelectedPage((prev) => {
        if (!response.pages.length) {
          return null;
        }

        if (prev) {
          const existing = response.pages.find((page) => page.id === prev.id);
          if (existing) {
            return existing;
          }
        }

        if (isMobile) {
          return null;
        }

        return response.pages[0];
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as páginas."
      );
    } finally {
      setIsLoading(false);
    }
  }, [isMobile]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const formatCustomDateTime = (page: PageRecord) => {
    const parts: string[] = [];

    // Format date part (day/month/year)
    if (page.day !== null || page.month !== null || page.year !== null) {
      const dateParts: string[] = [];
      if (page.day !== null) dateParts.push(String(page.day).padStart(2, "0"));
      if (page.month !== null)
        dateParts.push(String(page.month).padStart(2, "0"));
      if (page.year !== null) dateParts.push(String(page.year));
      if (dateParts.length > 0) {
        parts.push(dateParts.join("/"));
      }
    }

    // Format time part (hour:minute)
    if (page.hour !== null || page.minute !== null) {
      const timeParts: string[] = [];
      if (page.hour !== null)
        timeParts.push(String(page.hour).padStart(2, "0"));
      if (page.minute !== null)
        timeParts.push(String(page.minute).padStart(2, "0"));
      if (timeParts.length > 0) {
        parts.push(timeParts.join(":"));
      }
    }

    // If we have custom date/time parts, return them
    if (parts.length > 0) {
      return parts.join(" ");
    }

    // Fall back to createdDate if available
    if (page.createdDate) {
      return new Date(page.createdDate).toLocaleDateString("pt-BR");
    }

    // Final fallback to createdAt
    if (page.createdAt) {
      return new Date(page.createdAt).toLocaleDateString("pt-BR");
    }

    return "Sem data";
  };

  const filteredPages = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const currentTab =
      PAGE_FILTER_TABS.find((tab) => tab.id === activeTab) ||
      PAGE_FILTER_TABS[0];

    const filtered = pages.filter((page) => {
      const matchesTab = currentTab.filter(page);
      if (!matchesTab) return false;

      if (!query) return true;
      const haystack = `${page.title} ${page.aiDesc ?? ""} ${
        page.content ?? ""
      }`.toLowerCase();
      return haystack.includes(query);
    });

    // Sort all pages by date
    const sorted = filtered.sort((a, b) => {
      // Compare year (descending)
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;
      if (yearA !== yearB) return yearB - yearA;

      // Compare month (descending)
      const monthA = a.month ?? 0;
      const monthB = b.month ?? 0;
      if (monthA !== monthB) return monthB - monthA;

      // Compare day (descending)
      const dayA = a.day ?? 0;
      const dayB = b.day ?? 0;
      if (dayA !== dayB) return dayB - dayA;

      // Compare hour (descending)
      const hourA = a.hour ?? 0;
      const hourB = b.hour ?? 0;
      if (hourA !== hourB) return hourB - hourA;

      // Compare minute (descending)
      const minuteA = a.minute ?? 0;
      const minuteB = b.minute ?? 0;
      return minuteB - minuteA;
    });

    // For collections tab, move "callout" pages to the top
    if (activeTab === "collections") {
      return sorted.sort((a, b) => {
        const aHasCallout = a.tags.some((tag) => tag.name === "callout");
        const bHasCallout = b.tags.some((tag) => tag.name === "callout");

        if (aHasCallout && !bHasCallout) return -1;
        if (!aHasCallout && bHasCallout) return 1;
        return 0;
      });
    }

    return sorted;
  }, [pages, searchTerm, activeTab]);

  useEffect(() => {
    if (!filteredPages.length) {
      setSelectedPage(null);
      setSecondaryPage(null);
      return;
    }

    setSelectedPage((prev) => {
      if (prev && filteredPages.some((page) => page.id === prev.id)) {
        return prev;
      }

      if (isMobile) {
        return null;
      }

      // If in collections tab, prioritize page with "callout" tag
      if (activeTab === "collections") {
        const calloutPage = filteredPages.find((page) =>
          page.tags.some((tag) => tag.name === "callout")
        );
        return calloutPage || filteredPages[0];
      }

      return filteredPages[0];
    });

    setSecondaryPage((prev) => {
      if (!prev) {
        return null;
      }

      return filteredPages.some((page) => page.id === prev.id) ? prev : null;
    });
  }, [filteredPages, isMobile, activeTab]);

  const handleSelectPage = useCallback((page: PageRecord) => {
    setSelectedPage(page);
    setSecondaryPage(null);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedPage(null);
    setSecondaryPage(null);
  }, []);

  const handleEditPage = useCallback(
    (page: PageRecord) => {
      navigate(`/studio/${page.id}`);
    },
    [navigate]
  );

  const handleCreatePage = useCallback(() => {
    navigate("/studio/new");
  }, [navigate]);

  const handleRequestDeletePage = useCallback((page: PageRecord) => {
    setPagePendingDeletion(page);
  }, []);

  const handleCancelDelete = useCallback(() => {
    if (isDeletingPage) {
      return;
    }
    setPagePendingDeletion(null);
  }, [isDeletingPage]);

  const handleDeletePage = useCallback(async () => {
    if (!pagePendingDeletion) {
      return;
    }

    setIsDeletingPage(true);
    const pageId = pagePendingDeletion.id;

    try {
      await apiClient.deletePage(pageId);
      setSelectedPage((prev) => (prev?.id === pageId ? null : prev));
      setSecondaryPage((prev) => (prev?.id === pageId ? null : prev));
      await fetchPages();
      setPagePendingDeletion(null);
    } catch (error) {
      console.error("Failed to delete page:", error);
      alert("Erro ao deletar página. Tente novamente.");
    } finally {
      setIsDeletingPage(false);
    }
  }, [fetchPages, pagePendingDeletion]);

  const handleOpenPrimarySubpage = useCallback(
    (pageId: number) => {
      const targetPage = pages.find((page) => page.id === pageId);
      if (!targetPage) {
        return;
      }

      if (isMobile) {
        setSecondaryPage(null);
        setSelectedPage(targetPage);
        return;
      }

      setSecondaryPage(targetPage);
    },
    [pages, isMobile]
  );

  const handleOpenSecondarySubpage = useCallback(
    (pageId: number) => {
      const targetPage = pages.find((page) => page.id === pageId);
      if (!targetPage) {
        return;
      }

      if (isMobile) {
        setSecondaryPage(null);
        setSelectedPage(targetPage);
        return;
      }

      if (secondaryPage) {
        setSelectedPage(secondaryPage);
      }
      setSecondaryPage(targetPage);
    },
    [pages, isMobile, secondaryPage]
  );

  const handleBackToListing = useCallback(() => {
    setSecondaryPage(null);
  }, []);

  const handleCloseSecondary = useCallback(() => {
    setSecondaryPage(null);
  }, []);

  // Render markdown content
  const renderMarkdownContent = (
    content: string,
    onSubpageClick: (pageId: number) => void = handleOpenPrimarySubpage
  ) => {
    const lines = content.split("\n");

    return lines.map((line, index) => {
      // Check for subpage reference
      const subPageMatch = line.match(/^>\s*\[\[page:(\d+):(.+?)\]\]/);
      if (subPageMatch) {
        const pageId = Number(subPageMatch[1]);
        const pageTitle = subPageMatch[2];
        return (
          <div
            key={index}
            className="flex items-center gap-2 p-3 my-2 neu-card rounded-lg cursor-pointer hover:neu-pressed transition-all"
            onClick={() => onSubpageClick(pageId)}
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{pageTitle}</span>
          </div>
        );
      }

      // Horizontal rule
      if (line.trim() === "---") {
        return <div key={index} className="border-t border-border my-4" />;
      }

      // Headers
      if (line.startsWith("# ")) {
        return (
          <h1 key={index} className="text-2xl font-bold mt-6 mb-3">
            {line.slice(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={index} className="text-xl font-bold mt-5 mb-2">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={index} className="text-lg font-semibold mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      }

      // Lists
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={index} className="ml-4 mb-1">
            {line.slice(2)}
          </li>
        );
      }

      // Bold text **text**
      const boldRegex = /\*\*(.+?)\*\*/g;
      const italicRegex = /\*(.+?)\*/g;

      const hasBold = boldRegex.test(line);
      const hasItalic = italicRegex.test(line);

      if (hasBold || hasItalic) {
        const parts = [];
        let lastIndex = 0;
        let match;

        const combinedRegex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
        while ((match = combinedRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(line.slice(lastIndex, match.index));
          }

          if (match[0].startsWith("**")) {
            parts.push(<strong key={match.index}>{match[2]}</strong>);
          } else {
            parts.push(<em key={match.index}>{match[3]}</em>);
          }

          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < line.length) {
          parts.push(line.slice(lastIndex));
        }

        return (
          <p key={index} className="mb-2">
            {parts}
          </p>
        );
      }

      // Empty lines
      if (line.trim() === "") {
        return <br key={index} />;
      }

      // Regular paragraphs
      return (
        <p key={index} className="mb-2">
          {line}
        </p>
      );
    });
  };

  const renderReaderContent = (
    page: PageRecord | null,
    options: {
      onClose?: () => void;
      onSubpageClick?: (pageId: number) => void;
    } = {}
  ) => {
    if (!page) {
      return null;
    }

    const pageImage = page.image || page.thumbnail || null;
    const handleClose = options.onClose;
    const handleSubpageClick =
      options.onSubpageClick ?? handleOpenPrimarySubpage;

    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden md:overflow-auto">
        <div className={cn("flex flex-col")}>
          <header className="mb-4 space-y-1 pr-8">
            <p className="text-xs text-muted-foreground">
              {formatCustomDateTime(page)}
            </p>
            <h2 className="text-2xl font-semibold leading-tight text-foreground">
              {page.title}
            </h2>
          </header>
          {pageImage && (
            <div
              className="mb-4 relative group cursor-pointer overflow-hidden rounded-[24px]"
              onClick={() => setFullscreenImage(pageImage)}
            >
              <img
                src={pageImage}
                alt={`Imagem da página ${page.title}`}
                className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  console.error("Failed to load image:", pageImage);
                  e.currentTarget.style.display = "none";
                }}
                onLoad={() =>
                  console.log("Image loaded successfully:", pageImage)
                }
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Maximize2 className="w-12 h-12 text-white" />
              </div>
            </div>
          )}
          <div className="absolute right-0 top-0 flex gap-2 m-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  className="hidden md:flex neu-button rounded-[20px] h-8 w-8 text-lg font-semibold flex items-center justify-center"
                  onClick={() => handleEditPage(page)}
                  title="Editar página"
                >
                  <Edit size={16} />
                </button>
                <button
                  type="button"
                  className="hidden md:flex neu-button rounded-[20px] h-8 w-8 text-lg font-semibold flex items-center justify-center text-destructive"
                  onClick={() => handleRequestDeletePage(page)}
                  disabled={isDeletingPage}
                  title="Deletar página"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
            {handleClose ? (
              <button
                type="button"
                className="neu-button rounded-[20px] h-8 w-8 text-lg font-semibold"
                onClick={handleClose}
              >
                &times;
              </button>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto rounded-[24px] bg-background/80 p-4">
            {page.content ? (
              <div className="text-sm leading-relaxed text-foreground">
                {renderMarkdownContent(page.content, handleSubpageClick)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem conteúdo disponível.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchTerm.trim()) {
      fetchPages();
    }
  };

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSecondaryPage(null);
  };

  const pageListContent = () => {
    if (isLoading) {
      return (
        <div className="py-16 text-center text-muted-foreground">
          Carregando páginas...
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-16 text-center">
          <p className="mb-4 text-sm text-destructive">{error}</p>
          <button
            type="button"
            className="neu-button rounded-[24px] px-4 py-2 text-sm font-semibold"
            onClick={fetchPages}
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (!filteredPages.length) {
      return (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Nenhuma página encontrada para este filtro.
        </div>
      );
    }

    return filteredPages.map((page) => (
      <PageCard
        key={page.id}
        page={page}
        createdLabel={formatCustomDateTime(page)}
        isSelected={selectedPage?.id === page.id}
        onSelect={handleSelectPage}
      />
    ));
  };

  const showReaderOnly = !isMobile && Boolean(selectedPage && secondaryPage);
  const pendingDeletionTitle = pagePendingDeletion?.title ?? "selecionada";

  const deleteDialog = (
    <ConfirmDialog
      open={Boolean(pagePendingDeletion)}
      title="Excluir página"
      description={
        <p>
          Tem certeza que deseja deletar a página{" "}
          <span className="font-semibold">{pendingDeletionTitle}</span>? Esta
          ação não pode ser desfeita.
        </p>
      }
      confirmLabel="Excluir página"
      cancelLabel="Cancelar"
      loading={isDeletingPage}
      loadingLabel="Excluindo..."
      onConfirm={handleDeletePage}
      onCancel={handleCancelDelete}
    />
  );

  if (isMobile && selectedPage) {
    return (
      <>
        {deleteDialog}
        <main className="flex flex-1 bg-background items-center justify-center p-4">
          <div
            className={cn(
              "relative w-full h-full flex flex-col rounded-[30px] p-4",
              "neu-card-reversed"
            )}
          >
            {renderReaderContent(selectedPage, {
              onClose: handleClearSelection,
              onSubpageClick: handleOpenPrimarySubpage,
            })}
          </div>
        </main>

        {/* Fullscreen Image Viewer - Mobile */}
        {fullscreenImage && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <button
              className="absolute top-4 right-4 neu-button rounded-full p-3 text-white hover:bg-white/10 transition-colors z-10"
              onClick={() => setFullscreenImage(null)}
              title="Fechar"
            >
              <X size={24} />
            </button>
            <img
              src={fullscreenImage}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {deleteDialog}
      <main className="flex h-[100dvh] flex-1 bg-background items-center justify-center p-4 md:p-8">
        <div
          className={cn(
            "relative w-full h-full flex rounded-[40px] gap-6",
            "neu-card-reversed",
            showReaderOnly ? "flex-col" : "flex-row"
          )}
        >
          {showReaderOnly ? (
            <div className="flex flex-1 flex-col gap-6 px-6 py-6">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="neu-button rounded-[30px] px-4 py-3 text-sm font-semibold flex items-center gap-2 hover:cursor-pointer"
                  onClick={handleBackToListing}
                >
                  <ArrowLeft size={16} />
                  <span>Voltar</span>
                </button>
                <img
                  src="/bflogo.png"
                  alt="Biblioteca de Fótons Logo"
                  className="h-8"
                />
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      className="neu-button hidden md:flex rounded-[30px] bg-transparent px-4 py-3 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
                      onClick={handleCreatePage}
                    >
                      <Plus size={20} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="neu-button rounded-[30px] bg-transparent px-4 py-4 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut color="black" size={20} />
                  </button>
                </div>
              </div>
              <div className="flex flex-1 flex-col md:flex-row gap-6 neu-card-reversed p-4 rounded-[30px]">
                <div className=" rounded-[30px] p-6 flex-1 overflow-hidden">
                  {renderReaderContent(selectedPage, {
                    onClose: handleClearSelection,
                    onSubpageClick: handleOpenPrimarySubpage,
                  })}
                </div>
                <div className="neu-card-reversed rounded-[20px] p-6 flex-1 overflow-hidden">
                  {renderReaderContent(secondaryPage, {
                    onClose: handleCloseSecondary,
                    onSubpageClick: handleOpenSecondarySubpage,
                  })}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={cn("flex-1 flex flex-col overflow-hidden")}>
                <div className="flex flex-row w-full gap-4 items-center justify-between md:justify-start p-6">
                  <img
                    src="/bflogo.png"
                    alt="Biblioteca de Fótons Logo"
                    className="h-8"
                  />
                  <form
                    onSubmit={handleSearchSubmit}
                    className={cn(
                      "neu-card",
                      "rounded-[30px] py-2 px-4 flex-1 hidden md:flex items-center gap-3"
                    )}
                  >
                    <input
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground py-2"
                      type="search"
                      placeholder="Buscar fótons..."
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </form>
                  {isAdmin && (
                    <button
                      type="button"
                      className="neu-button hidden md:flex rounded-[30px] bg-transparent px-4 py-3 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
                      onClick={handleCreatePage}
                    >
                      <Plus size={20} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="neu-button rounded-[30px] bg-transparent px-4 py-4 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut color="black" size={20} />
                  </button>
                </div>
                <div className="md:hidden p-4 neu-card">
                  <input
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground py-2"
                    type="search"
                    placeholder="Buscar fótons..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <div className="flex flex-row justify-center md:justify-start mt-8 gap-4 px-6">
                  {PAGE_FILTER_TABS.map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      className={cn(
                        " py-2 px-4 rounded-[20px] text-sm font-medium transition hover:cursor-pointer",
                        activeTab === tab.id
                          ? "neu-card-reversed "
                          : "neu-card text-gray-400"
                      )}
                      onClick={() => handleTabChange(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="mt-8 mb-4 overflow-y-auto flex-1 w-full space-y-4 p-6 scrollbar-hide">
                  {pageListContent()}
                </div>
              </div>
              {selectedPage ? (
                <div
                  className={cn(
                    "neu-card-reversed",
                    "rounded-[30px] p-6 flex-1 hidden md:flex my-6 mr-6 overflow-hidden"
                  )}
                >
                  {renderReaderContent(selectedPage, {
                    onClose: handleClearSelection,
                    onSubpageClick: handleOpenPrimarySubpage,
                  })}
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute top-4 right-4 neu-button rounded-full p-3 text-white hover:bg-white/10 transition-colors z-10"
            onClick={() => setFullscreenImage(null)}
            title="Fechar"
          >
            <X size={24} />
          </button>
          <img
            src={fullscreenImage}
            alt="Fullscreen view"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
