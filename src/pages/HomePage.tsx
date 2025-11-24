import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, type PageRecord } from "@/lib/api";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import PageCard from "@/components/pageCard";
import { useIsMobile } from "@/hooks/use-mobile";

const PAGE_FILTER_TABS = [
  { id: "library", label: "Biblioteca", filter: (_page: PageRecord) => true },
  {
    id: "collections",
    label: "Coleções",
    filter: (page: PageRecord) => page.parentId === null,
  },
  {
    id: "gallery",
    label: "Galeria",
    filter: (page: PageRecord) => Boolean(page.image),
  },
] as const;

type TabId = (typeof PAGE_FILTER_TABS)[number]["id"];

export function HomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>(PAGE_FILTER_TABS[0].id);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPage, setSelectedPage] = useState<PageRecord | null>(null);
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await apiClient.logout();
    navigate("/login", { replace: true });
  };

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiClient.getPages({ limit: 50 });
      setPages(response.pages);
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

  const formatDate = (value?: string | null) => {
    if (!value) return "Sem data";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const filteredPages = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const currentTab =
      PAGE_FILTER_TABS.find((tab) => tab.id === activeTab) ||
      PAGE_FILTER_TABS[0];

    return pages.filter((page) => {
      const matchesTab = currentTab.filter(page);
      if (!matchesTab) return false;

      if (!query) return true;
      const haystack = `${page.title} ${page.aiDesc ?? ""} ${
        page.content ?? ""
      }`.toLowerCase();
      return haystack.includes(query);
    });
  }, [pages, searchTerm, activeTab]);

  useEffect(() => {
    if (!filteredPages.length) {
      setSelectedPage(null);
      return;
    }

    setSelectedPage((prev) => {
      if (prev && filteredPages.some((page) => page.id === prev.id)) {
        return prev;
      }

      return isMobile ? null : filteredPages[0];
    });
  }, [filteredPages, isMobile]);

  const handleSelectPage = useCallback((page: PageRecord) => {
    setSelectedPage(page);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedPage(null);
  }, []);

  const selectedPageImage =
    selectedPage?.image || selectedPage?.thumbnail || null;

  const renderReaderContent = () => {
    if (!selectedPage) {
      return null;
    }

    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden md:overflow-auto">
        {/* {showBackButton ? (
          <button
            type="button"
            className="neu-button absolute left-4 top-4 rounded-[20px] px-4 py-2 text-xs font-semibold"
            onClick={handleClearSelection}
          >
            Voltar
          </button>
        ) : null} */}
        <div className={cn("flex flex-col")}>
          <header className="mb-4 space-y-1 pr-8">
            <p className="text-xs text-muted-foreground">
              {formatDate(selectedPage.createdDate)}
            </p>
            <h2 className="text-2xl font-semibold leading-tight text-foreground">
              {selectedPage.title}
            </h2>
          </header>
          {selectedPageImage ? (
            <img
              src={selectedPageImage}
              alt={`Imagem da página ${selectedPage.title}`}
              className="h-64 w-full rounded-[24px] object-cover"
            />
          ) : null}
          <button
            type="button"
            className="neu-button absolute right-0 top-0 rounded-[20px] h-8 w-8 text-lg font-semibold m-2"
            onClick={handleClearSelection}
          >
            &times;
          </button>
          <div className=" flex-1 overflow-y-auto rounded-[24px] bg-background/80 p-4">
            {selectedPage.content ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {selectedPage.content}
              </p>
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
        createdLabel={formatDate(page.createdDate)}
        isSelected={selectedPage?.id === page.id}
        onSelect={handleSelectPage}
      />
    ));
  };

  if (isMobile && selectedPage) {
    return (
      <main className="flex flex-1 bg-background items-center justify-center p-4">
        <div
          className={cn(
            "relative w-full h-full flex flex-col rounded-[30px] p-4",
            "neu-card-reversed"
          )}
        >
          {renderReaderContent()}
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] flex-1 bg-background items-center justify-center p-4 md:p-8">
      <div
        className={cn(
          "relative w-full flex h-full flex flex-row rounded-[40px] gap-6",
          "neu-card-reversed"
        )}
      >
        <div className={cn(" flex-1 flex-col")}>
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
            {/* <button
              type="button"
              className="neu-button hidden md:flex rounded-[30px] bg-transparent px-4 py-3 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
              onClick={handleCreatePage}
              disabled={isCreating}
            >
              {isCreating ? "Criando..." : "Nova página"}
            </button> */}
            <button
              type="button"
              className="neu-button rounded-[30px] bg-transparent px-4 py-4 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut color="black" size={20} />
            </button>
          </div>
          <div className="flex flex-row justify-start mt-8 gap-4 px-6">
            {PAGE_FILTER_TABS.map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={cn(
                  " py-2 px-4 rounded-[20px] text-sm font-medium transition hover:cursor-pointer",
                  activeTab === tab.id
                    ? "neu-card"
                    : "neu-card-reversed text-gray-400"
                )}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-8 mb-4 overflow-y-auto w-full space-y-4 p-6">
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
            {renderReaderContent()}
          </div>
        ) : null}
      </div>
    </main>
  );
}
