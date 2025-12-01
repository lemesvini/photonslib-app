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

// Render markdown content as HTML for contentEditable
const renderContentAsHTML = (text: string) => {
  if (!text) return "";

  const lines = text.split("\n");
  return lines
    .map((line) => {
      const subPageMatch = line.match(/^>\s*\[\[page:(\d+):(.+?)\]\]/);

      if (subPageMatch) {
        const pageId = subPageMatch[1];
        const pageTitle = subPageMatch[2];
        return `<div class="flex items-center gap-2 p-3 my-2 neu-card rounded-lg cursor-pointer hover:neu-pressed transition-all" data-page-id="${pageId}" data-page-title="${pageTitle}" contenteditable="false">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="font-medium">${pageTitle}</span>
        </div>`;
      }

      // Headings
      if (line.startsWith("# ")) {
        const text = line.slice(2);
        return `<h1 class="text-3xl font-bold my-4" data-md="# ">${text}</h1>`;
      }
      if (line.startsWith("## ")) {
        const text = line.slice(3);
        return `<h2 class="text-2xl font-bold my-3" data-md="## ">${text}</h2>`;
      }
      if (line.startsWith("### ")) {
        const text = line.slice(4);
        return `<h3 class="text-xl font-semibold my-2" data-md="### ">${text}</h3>`;
      }

      // Horizontal rule
      if (line.trim() === "---") {
        return `<div class="border-t border-border my-4" data-md="---" contenteditable="false">&nbsp;</div>`;
      }

      // List items
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const text = line.slice(2);
        return `<div class="flex items-start gap-2 my-1" data-md="- "><span class="text-muted-foreground mt-0.5" contenteditable="false">•</span><span class="flex-1">${text}</span></div>`;
      }

      return line || "<br>";
    })
    .join("");
};

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

  // Update contentEditable innerHTML when content changes
  useEffect(() => {
    if (contentEditableRef.current && content) {
      contentEditableRef.current.innerHTML = renderContentAsHTML(content);
      // Add click handlers to subpage elements after a small delay to ensure DOM is ready
      setTimeout(() => {
        attachSubpageClickHandlers();
      }, 0);
    }
  }, [content]);

  // Attach click handlers to subpage elements
  const attachSubpageClickHandlers = () => {
    if (!contentEditableRef.current) return;

    const subpageElements =
      contentEditableRef.current.querySelectorAll("[data-page-id]");
    subpageElements.forEach((element) => {
      const pageId = element.getAttribute("data-page-id");
      if (pageId) {
        element.addEventListener("click", () => navigate(`/studio/${pageId}`));
      }
    });
  };

  // Handle keyboard input in contentEditable
  const handleInput = () => {
    if (!contentEditableRef.current) return;

    updateContentFromEditor();

    // Check for "/" trigger
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBeforeCursor =
        range.startContainer.textContent?.slice(0, range.startOffset) || "";

      if (textBeforeCursor.endsWith("/")) {
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current?.getBoundingClientRect();

        if (editorRect) {
          setMenuPosition({
            top: rect.bottom - editorRect.top + 5,
            left: rect.left - editorRect.left,
          });
          setShowMenu(true);
        }
      } else if (showMenu) {
        setShowMenu(false);
      }
    }
  };

  // Handle key down for menu navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (showMenu && e.key === "Escape") {
      setShowMenu(false);
      e.preventDefault();
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

  // Update content state from contentEditable
  const updateContentFromEditor = () => {
    if (!contentEditableRef.current) return;

    const lines: string[] = [];

    const walkNodes = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        if (element.hasAttribute("data-page-id")) {
          const pageId = element.getAttribute("data-page-id");
          const pageTitle = element.getAttribute("data-page-title");
          lines.push(`> [[page:${pageId}:${pageTitle}]]`);
          return;
        }

        // Check for markdown data attribute
        const mdPrefix = element.getAttribute("data-md");
        if (mdPrefix) {
          const text = element.textContent?.trim() || "";
          if (text) {
            lines.push(`${mdPrefix}${text}`);
          } else if (mdPrefix === "---") {
            lines.push("---");
          }
          return;
        }

        if (element.tagName === "BR") {
          lines.push("");
          return;
        }

        // Recursively process children
        element.childNodes.forEach(walkNodes);
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text.trim() || text.includes("\n")) {
          lines.push(text);
        }
      }
    };

    contentEditableRef.current.childNodes.forEach(walkNodes);

    // Clean up empty lines at start/end and join
    const cleanedContent = lines.join("\n").trim();
    setContent(cleanedContent);
  };

  // Insert markdown element based on action
  const handleMenuAction = async (action: string) => {
    setShowMenu(false);

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Remove the "/" character
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = range.startContainer as Text;
      const text = textNode.textContent || "";
      const slashIndex = text.lastIndexOf("/", range.startOffset);
      if (slashIndex !== -1) {
        textNode.textContent =
          text.slice(0, slashIndex) + text.slice(range.startOffset);
        range.setStart(textNode, slashIndex);
        range.collapse(true);
      }
    }

    switch (action) {
      case "subpage":
        await insertSubPageRef();
        break;
      case "h1":
        applyHeadingStyle(1);
        break;
      case "h2":
        applyHeadingStyle(2);
        break;
      case "h3":
        applyHeadingStyle(3);
        break;
      case "list":
        applyListStyle();
        break;
      case "hr":
        insertHorizontalRule();
        break;
      case "text":
        // Just remove the slash, normal text
        break;
    }

    updateContentFromEditor();
  };

  // Apply heading style to current line
  const applyHeadingStyle = (level: number) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Get the current line/block element
    let currentNode = selection.getRangeAt(0).startContainer;
    if (currentNode.nodeType === Node.TEXT_NODE) {
      currentNode = currentNode.parentNode as Node;
    }

    // Get or create a text node at cursor
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    // Create heading element
    const heading = document.createElement(`h${level}`);
    heading.className =
      level === 1
        ? "text-3xl font-bold my-4"
        : level === 2
        ? "text-2xl font-bold my-3"
        : "text-xl font-semibold my-2";
    heading.setAttribute("data-md", `${"#".repeat(level)} `);

    // Move current text to heading
    if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
      heading.textContent = textNode.textContent;
      textNode.parentNode?.replaceChild(heading, textNode);
    } else {
      heading.textContent = "";
      range.insertNode(heading);
    }

    // Place cursor inside heading
    const newRange = document.createRange();
    newRange.selectNodeContents(heading);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  };

  // Apply list style to current line
  const applyListStyle = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    // Create list item
    const listItem = document.createElement("div");
    listItem.className = "flex items-start gap-2 my-1";
    listItem.setAttribute("data-md", "- ");

    const bullet = document.createElement("span");
    bullet.textContent = "•";
    bullet.className = "text-muted-foreground mt-0.5";
    bullet.contentEditable = "false";

    const content = document.createElement("span");
    content.className = "flex-1";

    if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
      content.textContent = textNode.textContent;
      textNode.parentNode?.replaceChild(listItem, textNode);
    } else {
      content.textContent = "";
      range.insertNode(listItem);
    }

    listItem.appendChild(bullet);
    listItem.appendChild(content);

    // Place cursor in content
    const newRange = document.createRange();
    newRange.selectNodeContents(content);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
  };

  // Insert horizontal rule
  const insertHorizontalRule = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    const hr = document.createElement("div");
    hr.className = "border-t border-border my-4";
    hr.setAttribute("data-md", "---");
    hr.contentEditable = "false";
    hr.innerHTML = "&nbsp;";

    range.insertNode(hr);

    // Add line break after
    const br = document.createElement("br");
    hr.after(br);

    // Move cursor after
    range.setStartAfter(br);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
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

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Remove the "/" character
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const textNode = range.startContainer as Text;
          const text = textNode.textContent || "";
          const slashIndex = text.lastIndexOf("/", range.startOffset);
          if (slashIndex !== -1) {
            textNode.textContent =
              text.slice(0, slashIndex) + text.slice(range.startOffset);
            range.setStart(textNode, slashIndex);
            range.collapse(true);
          }
        }

        // Create and insert the subpage element
        const subPageElement = document.createElement("div");
        subPageElement.className =
          "flex items-center gap-2 p-3 my-2 neu-card rounded-lg cursor-pointer hover:neu-pressed transition-all";
        subPageElement.setAttribute("data-page-id", newSubPage.id.toString());
        subPageElement.setAttribute("data-page-title", newSubPage.title);
        subPageElement.contentEditable = "false";

        subPageElement.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span class="font-medium">${newSubPage.title}</span>
        `;

        subPageElement.onclick = () => navigate(`/studio/${newSubPage.id}`);

        range.insertNode(subPageElement);

        // Add a line break after
        const br = document.createElement("br");
        subPageElement.after(br);

        // Move cursor after the inserted element
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        // Update content immediately
        updateContentFromEditor();
      }
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

          {/* Notion-style Editor */}
          <div className="flex-1 overflow-hidden">
            <div
              ref={editorRef}
              className="w-full h-full neu-card-reversed p-8 rounded-[20px] overflow-y-auto relative"
            >
              <div
                ref={contentEditableRef}
                contentEditable
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                className="outline-none min-h-full text-foreground leading-relaxed"
                suppressContentEditableWarning
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
    </div>
  );
}
