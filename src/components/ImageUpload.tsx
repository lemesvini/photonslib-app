import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { uploadImageToS3 } from "../lib/s3";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label = "Upload Image",
  folder = "images",
  className = "",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousPreviewRef = useRef<string | null>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("Image size must be less than 5MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    // Create local preview
    const localPreview = URL.createObjectURL(file);

    // Clean up previous local preview if it exists
    if (
      previousPreviewRef.current &&
      previousPreviewRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(previousPreviewRef.current);
    }

    previousPreviewRef.current = localPreview;
    setPreviewUrl(localPreview);

    try {
      // Upload to S3
      const url = await uploadImageToS3(file, folder);

      // Update parent component with the URL
      onChange(url);

      // Update preview to S3 URL and clean up local preview
      setPreviewUrl(url);
      URL.revokeObjectURL(localPreview);
      previousPreviewRef.current = url;
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image. Please try again.");
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      previousPreviewRef.current = null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    // Clean up blob URL if it exists
    if (
      previousPreviewRef.current &&
      previousPreviewRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(previousPreviewRef.current);
    }
    previousPreviewRef.current = null;
    setPreviewUrl(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium flex items-center gap-2">
        <ImageIcon className="w-4 h-4" /> {label}
      </label>

      <div className="relative">
        {previewUrl ? (
          <div className="relative neu-card rounded-lg overflow-hidden group">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={handleClick}
                disabled={isUploading}
                className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors"
                title="Change image"
              >
                <Upload className="w-5 h-5 text-black" />
              </button>
              <button
                onClick={handleRemove}
                disabled={isUploading}
                className="p-2 bg-red-500/90 rounded-lg hover:bg-red-500 transition-colors"
                title="Remove image"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleClick}
            disabled={isUploading}
            className="w-full h-48 neu-card rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-2 group"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Uploading...
                </span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  Click to upload image
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG, GIF up to 5MB
                </span>
              </>
            )}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <X className="w-4 h-4" />
          {error}
        </p>
      )}

      {previewUrl && (
        <p className="text-xs text-muted-foreground break-all">{previewUrl}</p>
      )}
    </div>
  );
}
