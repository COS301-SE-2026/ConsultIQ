import { FileUploader } from "react-drag-drop-files";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface ImageDropzoneProps {
    onFileSelect: (file: File) => void;
    allowedFileTypes?: string[];
    maxSize?: number;
  
}

export function ImageDropzone({ onFileSelect, allowedFileTypes = ["PNG", "JPG", "JPEG", "WEBP"], maxSize = 5 }: ImageDropzoneProps) {

    const handleFileUpload = (file: File | File[]) => {
        const singleFile = Array.isArray(file) ? file[0] : file;
        if (singleFile) {
            onFileSelect(singleFile);
        }

    };

    const handleTypeError = () => {
        toast.error("Only PNG, JPEG and WEBP images allowedFileTypes.")
    };

    const handlePhotoSIzeError = () => {
        toast.error("Image size must be less than 5 MB.");
    };

    return (
        <FileUploader
            name="profilePhoto"
            handleChange={handleFileUpload}
            types={allowedFileTypes}
            maxSize={maxSize}
            multiple={false}
            onTypeError={handleTypeError}
            onSizeError={handlePhotoSIzeError}
        >
            <div
                className="border-2 border-dashed rounded-xl h-[160px] flex flex-col items-center justify-center gap-4 cursor-pointer transition hover:bg-gray-50"
                style={{
                    borderColor: "var(--color-border)",
                }}

            >
                <Upload className="w-12 h-12 text-gray-500" />
                <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                    Click to upload or drag and drop
                </p>
            </div>
        </FileUploader>
    );

}