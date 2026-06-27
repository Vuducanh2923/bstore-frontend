import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import "@ckeditor/ckeditor5-build-classic/build/translations/vi";

import { uploadService } from "../../services/bstoreService";
import { resolveMediaUrl } from "../../utils/formatters";

function getUploadImagePath(payload = {}) {
  const nestedPayload =
    payload.data || payload.image || payload.file || payload.result || {};
  const value = [
    payload.image_url,
    payload.imageUrl,
    payload.path,
    payload.relative_path,
    payload.url,
    payload.full_image_url,
    payload.fullImageUrl,
    nestedPayload.image_url,
    nestedPayload.imageUrl,
    nestedPayload.path,
    nestedPayload.relative_path,
    nestedPayload.url,
    nestedPayload.full_image_url,
    nestedPayload.fullImageUrl,
  ].find((item) => typeof item === "string" && item.trim());

  return String(value || "").trim();
}

class ProductDescriptionUploadAdapter {
  constructor(loader) {
    this.loader = loader;
  }

  upload() {
    return this.loader.file.then(async (file) => {
      const payload = await uploadService.uploadImage(file);
      const imagePath = getUploadImagePath(payload);

      if (!imagePath) {
        throw new Error("Không nhận được URL ảnh sau khi upload.");
      }

      return {
        default: resolveMediaUrl(imagePath),
      };
    });
  }

  abort() {}
}

function registerUploadAdapter(editor) {
  if (!editor?.plugins?.get) {
    return;
  }

  let fileRepository;

  try {
    fileRepository = editor.plugins.get("FileRepository");
  } catch {
    fileRepository = null;
  }

  if (!fileRepository) {
    return;
  }

  fileRepository.createUploadAdapter = (loader) =>
    new ProductDescriptionUploadAdapter(loader);
}

const productDescriptionEditorConfig = {
  image: {
    toolbar: [
      "imageTextAlternative",
      "toggleImageCaption",
      "|",
      "imageStyle:inline",
      "imageStyle:block",
      "imageStyle:side",
    ],
  },
  language: "vi",
  licenseKey: "GPL",
  link: {
    addTargetToExternalLinks: true,
    defaultProtocol: "https://",
  },
  placeholder: "Nhập mô tả chi tiết sản phẩm...",
  toolbar: [
    "undo",
    "redo",
    "|",
    "heading",
    "|",
    "bold",
    "italic",
    "|",
    "bulletedList",
    "numberedList",
    "|",
    "link",
    "uploadImage",
    "blockQuote",
  ],
};

export default function ProductDescriptionEditor({ onChange, value }) {
  return (
    <div className="product-ckeditor">
      <CKEditor
        config={productDescriptionEditorConfig}
        data={value || ""}
        editor={ClassicEditor}
        onChange={(_, editor) => {
          if (editor?.getData) {
            onChange(editor.getData());
          }
        }}
        onReady={registerUploadAdapter}
      />
    </div>
  );
}
