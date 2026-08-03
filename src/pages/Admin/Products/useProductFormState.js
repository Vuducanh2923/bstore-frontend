import { useMemo, useState } from "react";
import { slugify } from "../../../utils/formatters";
import {
  createDefaultSpecGroups,
  createEmptyProductForm,
  createEmptySpecGroup,
  createEmptySpecRow,
  createEmptyVariant,
  createLocalId,
  ensureVariantRows,
  ensureThumbnailImage,
  findOptionByValue,
} from "../Dashboard/adminDashboardShared";

export default function useProductFormState({
  brands,
  categories,
  editingProductId,
  setProductLocalPreviewUrl,
}) {
  const [productForm, setProductForm] = useState(() => createEmptyProductForm());

  const brandOptions = useMemo(() => {
    const options = [...brands];

    if (productForm.brandId && !findOptionByValue(options, productForm.brandId)) {
      options.push({
        id: productForm.brandId,
        name: productForm.brandName || "Thương hiệu hiện tại",
        slug: "",
      });
    }

    return options.sort((first, second) =>
      first.name.localeCompare(second.name, "vi"),
    );
  }, [brands, productForm.brandId, productForm.brandName]);

  const categoryOptions = useMemo(() => {
    const options = [...categories];

    if (productForm.categoryId && !findOptionByValue(options, productForm.categoryId)) {
      options.push({
        id: productForm.categoryId,
        name: productForm.categoryName || "Danh mục hiện tại",
      });
    }

    return options;
  }, [categories, productForm.categoryId, productForm.categoryName]);

  const handleProductChange = (event) => {
    const { checked, name, type, value } = event.target;
    const nextValue = type === "checkbox" ? checked : value;
    const selectedBrand =
      name === "brandId" ? findOptionByValue(brandOptions, nextValue) : null;
    const selectedCategory =
      name === "categoryId" ? findOptionByValue(categoryOptions, nextValue) : null;

    if (name === "imageUrl") {
      setProductLocalPreviewUrl("");
      setProductForm((current) => {
        const imageUrl = String(nextValue || "").trim();
        const currentImages = current.images || [];
        const thumbnailIndex = currentImages.findIndex((image) => image.isThumbnail);
        let nextImages;

        if (!imageUrl) {
          nextImages = thumbnailIndex >= 0
            ? currentImages.filter((_, index) => index !== thumbnailIndex)
            : currentImages;
        } else if (thumbnailIndex >= 0) {
          nextImages = currentImages.map((image, index) =>
            index === thumbnailIndex ? { ...image, imageUrl, publicId: "" } : image,
          );
        } else {
          nextImages = [{
            imageUrl,
            isThumbnail: true,
            localId: createLocalId("product-image-url"),
            productVariantId: null,
            publicId: "",
          }, ...currentImages.map((image) => ({ ...image, isThumbnail: false }))];
        }

        const normalizedImages = ensureThumbnailImage(nextImages);
        const thumbnail = normalizedImages.find((image) => image.isThumbnail);

        return {
          ...current,
          imagePublicId: thumbnail?.publicId || "",
          images: normalizedImages,
          imageUrl,
        };
      });
      return;
    }

    setProductForm((current) => {
      const nextSlug = name === "name" && !editingProductId
        ? slugify(nextValue)
        : current.slug;
      const shouldRefreshFirstSku = name === "name" && !editingProductId;

      return {
        ...current,
        [name]: nextValue,
        brandName: name === "brandId" ? selectedBrand?.name || "" : current.brandName,
        categoryName:
          name === "categoryId"
            ? selectedCategory?.name || ""
            : current.categoryName,
        imagePublicId: name === "imageUrl" ? "" : current.imagePublicId,
        slug: nextSlug,
        variants: ensureVariantRows(current.variants, nextSlug).map((variant, index) =>
          shouldRefreshFirstSku && index === 0
            ? { ...variant, sku: nextSlug ? nextSlug.toUpperCase() : "" }
            : variant,
        ),
      };
    });
  };

  const handleProductDescriptionChange = (value) => {
    setProductForm((current) => ({
      ...current,
      description: value,
    }));
  };

  const handleProductSpecGroupChange = (groupIndex, value) => {
    setProductForm((current) => ({
      ...current,
      specifications: current.specifications.map((group, index) =>
        index === groupIndex ? { ...group, name: value } : group,
      ),
    }));
  };

  const handleProductSpecChange = (groupIndex, specIndex, field, value) => {
    setProductForm((current) => ({
      ...current,
      specifications: current.specifications.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              items: group.items.map((spec, currentSpecIndex) =>
                currentSpecIndex === specIndex ? { ...spec, [field]: value } : spec,
              ),
            }
          : group,
      ),
    }));
  };

  const handleAddProductSpecGroup = () => {
    setProductForm((current) => ({
      ...current,
      specifications: [
        ...current.specifications,
        createEmptySpecGroup(current.specifications.length),
      ],
    }));
  };

  const handleRemoveProductSpecGroup = (groupIndex) => {
    setProductForm((current) => {
      const specifications = current.specifications.filter(
        (_, index) => index !== groupIndex,
      );

      return {
        ...current,
        specifications: specifications.length ? specifications : createDefaultSpecGroups(),
      };
    });
  };

  const handleAddProductSpec = (groupIndex) => {
    setProductForm((current) => ({
      ...current,
      specifications: current.specifications.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              items: [...group.items, createEmptySpecRow()],
            }
          : group,
      ),
    }));
  };

  const handleRemoveProductSpec = (groupIndex, specIndex) => {
    setProductForm((current) => ({
      ...current,
      specifications: current.specifications.map((group, index) => {
        if (index !== groupIndex) {
          return group;
        }

        const items = group.items.filter((_, itemIndex) => itemIndex !== specIndex);

        return {
          ...group,
          items: items.length ? items : [createEmptySpecRow()],
        };
      }),
    }));
  };

  const handleProductVariantChange = (index, field, value) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    }));
  };

  const handleCopyProductVariant = (index) => {
    setProductForm((current) => {
      const variants = ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      );
      const source = variants[index] || createEmptyVariant(0, current.slug);
      const copiedVariant = {
        ...source,
        collapsed: false,
        id: undefined,
        inventoryId: "",
        localId: createLocalId(`variant-copy-${index + 1}`),
        sku: source.sku ? `${source.sku}-COPY-${variants.length + 1}` : "",
        specifications: source.specifications.map((spec) => ({ ...spec })),
      };

      return {
        ...current,
        variants: [
          ...variants.slice(0, index + 1),
          copiedVariant,
          ...variants.slice(index + 1),
        ],
      };
    });
  };

  const handleToggleProductVariant = (index) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, variantIndex) =>
        variantIndex === index
          ? { ...variant, collapsed: !variant.collapsed }
          : variant,
      ),
    }));
  };

  const handleAddProductVariant = () => {
    setProductForm((current) => ({
      ...current,
      variants: [
        ...ensureVariantRows(current.variants, current.slug || slugify(current.name)),
        createEmptyVariant(
          ensureVariantRows(current.variants).length,
          current.slug || slugify(current.name),
        ),
      ],
    }));
  };

  const handleRemoveProductVariant = (index) => {
    setProductForm((current) => {
      const variants = ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).filter(
        (_, variantIndex) => variantIndex !== index,
      );

      return {
        ...current,
        variants: variants.length
          ? variants
          : [createEmptyVariant(0, current.slug || slugify(current.name))],
      };
    });
  };

  const handleVariantSpecChange = (variantIndex, specIndex, field, value) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, currentVariantIndex) =>
        currentVariantIndex === variantIndex
          ? {
              ...variant,
              specifications: variant.specifications.map((spec, currentSpecIndex) =>
                currentSpecIndex === specIndex ? { ...spec, [field]: value } : spec,
              ),
            }
          : variant,
      ),
    }));
  };

  const handleAddVariantSpec = (variantIndex) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, currentVariantIndex) =>
        currentVariantIndex === variantIndex
          ? {
              ...variant,
              specifications: [...variant.specifications, createEmptySpecRow()],
            }
          : variant,
      ),
    }));
  };

  const handleRemoveVariantSpec = (variantIndex, specIndex) => {
    setProductForm((current) => ({
      ...current,
      variants: ensureVariantRows(
        current.variants,
        current.slug || slugify(current.name),
      ).map((variant, currentVariantIndex) => {
        if (currentVariantIndex !== variantIndex) {
          return variant;
        }

        const specifications = variant.specifications.filter(
          (_, currentSpecIndex) => currentSpecIndex !== specIndex,
        );

        return {
          ...variant,
          specifications: specifications.length
            ? specifications
            : [createEmptySpecRow()],
        };
      }),
    }));
  };


  return {
    brandOptions,
    categoryOptions,
    handleProductChange,
    handleProductDescriptionChange,
    handleProductSpecGroupChange,
    handleProductSpecChange,
    handleAddProductSpecGroup,
    handleRemoveProductSpecGroup,
    handleAddProductSpec,
    handleRemoveProductSpec,
    handleProductVariantChange,
    handleCopyProductVariant,
    handleToggleProductVariant,
    handleAddProductVariant,
    handleRemoveProductVariant,
    handleVariantSpecChange,
    handleAddVariantSpec,
    handleRemoveVariantSpec,
    productForm,
    setProductForm,
  };
}
