import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient, type PageRecord } from "../lib/api";
import useDebounce from "../hooks/use-debounce";
import ImageUpload from "../components/ImageUpload";
import {
  FileText,
  ArrowLeft,
  Save,
  Heading1,
  Heading2,
  Heading3,
  List,
  Type,
  Minus,
  Settings,
  X,
  Link,
} from "lucide-react";

interface MenuPosition {
  top: number;
  left: number;
}

interface MenuOption {
  label: string;
  icon: React.ElementType;
  action: string;
  description?: string;
}

const MENU_OPTIONS: MenuOption[] = [
  {
    label: "Novo Fóton",
    icon: FileText,
    action: "subpage",
    description: "Criar página vinculada",
  },
  {
    label: "Título 1",
    icon: Heading1,
    action: "h1",
    description: "Título grande",
  },
  {
    label: "Título 2",
    icon: Heading2,
    action: "h2",
    description: "Título médio",
  },
  {
    label: "Título 3",
    icon: Heading3,
    action: "h3",
    description: "Título pequeno",
  },
  {
    label: "Lista",
    icon: List,
    action: "list",
    description: "Lista com marcadores",
  },
  {
    label: "Linha horizontal",
    icon: Minus,
    action: "hr",
    description: "Divisor",
  },
  {
    label: "Texto",
    icon: Type,
    action: "text",
    description: "Parágrafo normal",
  },
];

export default function Studio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<PageRecord | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);

  const [tags, setTags] = useState<{ name: string; color?: string }[]>([]);
  const [newTag, setNewTag] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [aiDesc, setAiDesc] = useState("");
  const [showAiDescModal, setShowAiDescModal] = useState(false);
  const [day, setDay] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);

  const debouncedTitle = useDebounce(title, 1000);
  const debouncedContent = useDebounce(content, 1000);
  const debouncedImageUrl = useDebounce(imageUrl, 1000);
  const debouncedThumbnailUrl = useDebounce(thumbnailUrl, 1000);
  const debouncedAiDesc = useDebounce(aiDesc, 1000);
  const debouncedDay = useDebounce(day, 1000);
  const debouncedMonth = useDebounce(month, 1000);
  const debouncedYear = useDebounce(year, 1000);
  const debouncedHour = useDebounce(hour, 1000);
  const debouncedMinute = useDebounce(minute, 1000);

  // Load page data
  useEffect(() => {
    if (id && id !== "new") {
      setIsLoading(true);
      apiClient
        .getPageById(parseInt(id))
        .then(async (data) => {
          setPage(data);
          setTitle(data.title);
          setTags(data.tags.map((t) => ({ name: t.name, color: t.color })));
          setImageUrl(data.image || "");
          setThumbnailUrl(data.thumbnail || "");
          setAiDesc(data.aiDesc || "");
          setDay(data.day);
          setMonth(data.month);
          setYear(data.year);
          setHour(data.hour);
          setMinute(data.minute);

          // Parse content and fetch referenced page titles
          let processedContent = data.content || "";
          const pageReferences = data.content?.match(
            />\s*\[\[page:(\d+):(.+?)\]\]/g
          );

          if (pageReferences) {
            for (const ref of pageReferences) {
              const match = ref.match(/>\s*\[\[page:(\d+):(.+?)\]\]/);
              if (match) {
                const pageId = match[1];
                try {
                  const referencedPage = await apiClient.getPageById(
                    parseInt(pageId)
                  );
                  // Update the content with the current title
                  processedContent = processedContent.replace(
                    ref,
                    `> [[page:${pageId}:${referencedPage.title}]]`
                  );
                } catch (error) {
                  console.error(`Failed to fetch page ${pageId}:`, error);
                }
              }
            }
          }

          setContent(processedContent);
        })
        .catch((error) => {
          console.error("Failed to load page:", error);
        })
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  // Handle key down for menu navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMenu && e.key === "Escape") {
      setShowMenu(false);
      e.preventDefault();
    }
  };

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Check for "/" trigger at cursor position
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.slice(0, cursorPosition);

    if (textBeforeCursor.endsWith("/")) {
      // Calculate menu position based on textarea cursor
      const editorRect = editorRef.current?.getBoundingClientRect();

      if (editorRect) {
        setMenuPosition({
          top: 100, // Fixed position for textarea
          left: 50,
        });
        setShowMenu(true);
      }
    } else if (showMenu) {
      setShowMenu(false);
    }
  };

  // Auto-save when title or content changes
  useEffect(() => {
    if (!debouncedTitle.trim()) return;

    const shouldSave =
      (id === "new" && (debouncedTitle || debouncedContent)) ||
      (id !== "new" &&
        page &&
        (debouncedTitle !== page.title ||
          debouncedContent !== page.content ||
          debouncedImageUrl !== (page.image || "") ||
          debouncedThumbnailUrl !== (page.thumbnail || "") ||
          debouncedAiDesc !== (page.aiDesc || "") ||
          debouncedDay !== page.day ||
          debouncedMonth !== page.month ||
          debouncedYear !== page.year ||
          debouncedHour !== page.hour ||
          debouncedMinute !== page.minute ||
          JSON.stringify(tags) !==
            JSON.stringify(
              page.tags.map((t) => ({ name: t.name, color: t.color }))
            )));

    if (shouldSave) {
      handleAutoSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedTitle,
    debouncedContent,
    debouncedImageUrl,
    debouncedThumbnailUrl,
    debouncedAiDesc,
    debouncedDay,
    debouncedMonth,
    debouncedYear,
    debouncedHour,
    debouncedMinute,
    tags,
  ]);

  const handleAutoSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      if (id === "new") {
        const newPage = await apiClient.createPage({
          title,
          content: content || null,
          image: imageUrl || null,
          thumbnail: thumbnailUrl || null,
          aiDesc: aiDesc || null,
          day,
          month,
          year,
          hour,
          minute,
          tags,
          createdDate: new Date().toISOString(),
        });
        setPage(newPage);
        setLastSaved(new Date());
        navigate(`/studio/${newPage.id}`, { replace: true });
      } else if (page) {
        await apiClient.updatePage(page.id, {
          title,
          content: content || null,
          image: imageUrl || null,
          thumbnail: thumbnailUrl || null,
          aiDesc: aiDesc || null,
          day,
          month,
          year,
          hour,
          minute,
          tags,
        });
        // Don't update page state to avoid re-render
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Failed to save page:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Insert markdown element based on action
  const handleMenuAction = async (action: string) => {
    setShowMenu(false);

    switch (action) {
      case "subpage":
        await insertSubPageRef();
        break;
      case "h1":
        insertTextAtCursor("# ");
        break;
      case "h2":
        insertTextAtCursor("## ");
        break;
      case "h3":
        insertTextAtCursor("### ");
        break;
      case "list":
        insertTextAtCursor("- ");
        break;
      case "hr":
        insertTextAtCursor("---\n");
        break;
      case "text":
        // Just remove the slash
        if (contentEditableRef.current) {
          const textarea =
            contentEditableRef.current as unknown as HTMLTextAreaElement;
          const start = textarea.selectionStart;
          const beforeCursor = content.slice(0, start);
          const slashIndex = beforeCursor.lastIndexOf("/");
          if (slashIndex !== -1) {
            const newContent =
              content.slice(0, slashIndex) + content.slice(start);
            setContent(newContent);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = slashIndex;
              textarea.focus();
            }, 0);
          }
        }
        break;
    }
  };

  // Insert text at cursor position in textarea
  const insertTextAtCursor = (text: string) => {
    if (!contentEditableRef.current) return;

    const textarea =
      contentEditableRef.current as unknown as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = content;

    // Find and remove the "/" before cursor
    const beforeCursor = currentContent.slice(0, start);
    const slashIndex = beforeCursor.lastIndexOf("/");

    const newContent =
      slashIndex !== -1
        ? currentContent.slice(0, slashIndex) + text + currentContent.slice(end)
        : currentContent.slice(0, start) + text + currentContent.slice(end);

    setContent(newContent);

    // Set cursor position after inserted text
    setTimeout(() => {
      const newPosition =
        slashIndex !== -1 ? slashIndex + text.length : start + text.length;
      textarea.selectionStart = textarea.selectionEnd = newPosition;
      textarea.focus();
    }, 0);
  };

  // Insert subpage reference
  const insertSubPageRef = async () => {
    try {
      const newSubPage = await apiClient.createPage({
        title: "Novo Fóton",
        content: "",
        createdDate: new Date().toISOString(),
        parentId: page?.id,
      });

      const linkText = `\n> [[page:${newSubPage.id}:${newSubPage.title}]]\n`;
      insertTextAtCursor(linkText);
    } catch (error) {
      console.error("Failed to create subpage:", error);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.some((t) => t.name === newTag.trim())) {
      setTags([...tags, { name: newTag.trim(), color: "#gray" }]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagName: string) => {
    setTags(tags.filter((t) => t.name !== tagName));
  };

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center p-6 md:p-10">
      <div className="w-full h-full flex items-center justify-center neu-card rounded-[40px] p-2">
        <div className="neu-card-reversed w-full h-full rounded-[30px] p-8 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="w-full neu-card p-4 rounded-[20px] mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate("/")}
                className="neu-button p-2 rounded-lg hover:scale-105 transition-transform"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Page"
                className="flex-1 text-2xl font-bold bg-transparent border-none outline-none"
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isSaving && (
                  <>
                    <Save className="w-4 h-4 animate-pulse" />
                    <span>Saving...</span>
                  </>
                )}
                {!isSaving && lastSaved && (
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                )}
                <button
                  onClick={() => setShowMetadata(!showMetadata)}
                  className={`p-2 rounded-lg transition-colors ${
                    showMetadata
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  title="Metadata"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showMetadata && (
              <div className="mb-4 p-4 neu-card-reversed rounded-xl space-y-4 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ImageUpload
                    value={imageUrl}
                    onChange={setImageUrl}
                    label="Main Image"
                    folder="images"
                  />
                  <ImageUpload
                    value={thumbnailUrl}
                    onChange={setThumbnailUrl}
                    label="Thumbnail"
                    folder="thumbnails"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date & Time</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <input
                      type="number"
                      value={day ?? ""}
                      onChange={(e) =>
                        setDay(e.target.value ? parseInt(e.target.value) : null)
                      }
                      placeholder="Day"
                      min="1"
                      max="31"
                      className="p-4 rounded-lg neu-card bg-transparent outline-none text-sm"
                    />
                    <input
                      type="number"
                      value={month ?? ""}
                      onChange={(e) =>
                        setMonth(
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="Month"
                      min="1"
                      max="12"
                      className="p-2 rounded-lg neu-card bg-transparent outline-none text-sm"
                    />
                    <input
                      type="number"
                      value={year ?? ""}
                      onChange={(e) =>
                        setYear(
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="Year"
                      className="p-2 rounded-lg neu-card bg-transparent outline-none text-sm"
                    />
                    <input
                      type="number"
                      value={hour ?? ""}
                      onChange={(e) =>
                        setHour(
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="Hour"
                      min="0"
                      max="23"
                      className="p-2 rounded-lg neu-card bg-transparent outline-none text-sm"
                    />
                    <input
                      type="number"
                      value={minute ?? ""}
                      onChange={(e) =>
                        setMinute(
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      placeholder="Minute"
                      min="0"
                      max="59"
                      className="p-2 rounded-lg neu-card bg-transparent outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Link className="w-4 h-4" /> Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <span
                        key={tag.name}
                        className="px-2 py-1 rounded-full neu-card text-sm flex items-center gap-1"
                        style={{ color: tag.color }}
                      >
                        {tag.name}
                        <button
                          onClick={() => handleRemoveTag(tag.name)}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                      placeholder="Add a tag..."
                      className="flex-1 p-4 rounded-lg neu-card bg-transparent outline-none text-sm"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-4 py-2 rounded-lg neu-button text-sm font-medium hover:scale-105 transition-transform"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Resumo de IA</label>
                  <button
                    onClick={() => setShowAiDescModal(true)}
                    className="w-full px-4 py-3 rounded-lg neu-button text-sm font-medium hover:scale-105 transition-transform flex items-center justify-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 16v4" />
                      <path d="M16 14v6" />
                      <path d="M8 14v6" />
                      <path d="M4 8h16" />
                      <path d="M4 12h16" />
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                    </svg>
                    {aiDesc ? "Editar" : "Adicionar"} Resumo de IA
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Created:{" "}
                {page?.createdDate
                  ? new Date(page.createdDate).toLocaleDateString()
                  : "Today"}
              </span>
              {page?.tags && page.tags.length > 0 && (
                <div className="flex gap-2">
                  {page.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-2 py-1 rounded-full neu-card text-xs"
                      style={{ color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Plain Text Editor */}
          <div className="flex-1 overflow-hidden">
            <div
              ref={editorRef}
              className="w-full h-full neu-card-reversed p-8 rounded-[20px] overflow-y-auto relative"
            >
              <textarea
                ref={contentEditableRef as any}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                className="outline-none min-h-full w-full text-foreground leading-relaxed bg-transparent border-none resize-none font-mono"
                placeholder="Type / for commands..."
              />

              {/* Slash Command Menu */}
              {showMenu && (
                <div
                  className="absolute neu-card rounded-lg shadow-lg p-2 z-50 min-w-[240px] max-h-[400px] overflow-y-auto"
                  style={{
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                  }}
                >
                  {MENU_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.action}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-3"
                        onClick={() => handleMenuAction(option.action)}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {option.label}
                          </div>
                          {option.description && (
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Description Modal */}
      {showAiDescModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowAiDescModal(false)}
        >
          <div
            className="neu-card rounded-[24px] p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Resumo de IA</h3>
              <button
                onClick={() => setShowAiDescModal(false)}
                className="neu-button rounded-full p-2 hover:scale-105 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={aiDesc}
              onChange={(e) => setAiDesc(e.target.value)}
              placeholder="Adicione um resumo gerado por IA ou descrição da página..."
              className="w-full h-64 p-4 rounded-lg neu-card-reversed bg-transparent outline-none text-sm resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAiDescModal(false)}
                className="px-4 py-2 rounded-lg neu-button text-sm font-medium hover:scale-105 transition-transform"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
