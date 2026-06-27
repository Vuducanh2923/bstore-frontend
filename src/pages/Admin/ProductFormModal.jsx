import { lazy, Suspense } from "react";

import {
  formatCurrency,
  formatSalePercent,
  resolveMediaUrl,
} from "../../utils/formatters";

const ProductDescriptionEditor = lazy(() =>
  import("./ProductDescriptionEditor"),
);

function findOptionName(options, value, fallback = "") {
  if (!value) {
    return fallback;
  }

  return (
    options.find((option) => String(option.id) === String(value))?.name ||
    fallback ||
    ""
  );
}

function getVariantTitle(variant, index) {
  const parts = [variant.color, variant.ram, variant.storage].filter(Boolean);
  return parts.length ? parts.join(" - ") : `Biến thể ${index + 1}`;
}

function getImageSrc(value) {
  return value ? resolveMediaUrl(value) : "";
}

export default function ProductFormModal({
  brandOptions,
  categories,
  editingProductId,
  onAddProductSpec,
  onAddProductSpecGroup,
  onAddVariant,
  onAddVariantSpec,
  onAlbumImageFiles,
  onChange,
  onClose,
  onCopyVariant,
  onDescriptionChange,
  onImageFile,
  onRemoveProductImage,
  onRemoveProductSpec,
  onRemoveProductSpecGroup,
  onRemoveThumbnail,
  onRemoveVariant,
  onRemoveVariantSpec,
  onSave,
  onSeoChange,
  onSetThumbnail,
  onSpecChange,
  onSpecGroupChange,
  onToggleVariant,
  onVariantChange,
  onVariantSpecChange,
  productForm,
  productFormErrors,
  productPreviewUrl,
  productVariantRows,
  salePreview,
  saving,
  uploadingImage,
}) {
  const title = editingProductId ? "Sửa sản phẩm" : "Thêm sản phẩm";
  const previewUrl = productPreviewUrl ? getImageSrc(productPreviewUrl) : "";
  const selectedCategoryName = findOptionName(
    categories,
    productForm.categoryId,
    productForm.categoryName,
  );
  const selectedBrandName = findOptionName(
    brandOptions,
    productForm.brandId,
    productForm.brandName,
  );
  const seoTitle = productForm.seo?.metaTitle || productForm.name;
  const seoDescription =
    productForm.seo?.metaDescription || productForm.shortDescription;

  return (
    <div className="product-form-backdrop" role="presentation">
      <form
        aria-labelledby="product-form-title"
        aria-modal="true"
        className="admin-form product-form-modal"
        onSubmit={onSave}
        role="dialog"
      >
        <header className="product-form-modal-heading">
          <div className="product-form-title-wrap">
            <span className="product-form-icon" aria-hidden="true">
              +
            </span>
            <div>
              <small>{editingProductId ? "Cập nhật" : "Tạo mới"}</small>
              <h2 id="product-form-title">{title}</h2>
            </div>
          </div>
          <button aria-label="Đóng form sản phẩm" onClick={onClose} type="button">
            x
          </button>
        </header>

        <div className="product-form-scroll">
          <main className="product-form-main">
            <section className="product-form-panel">
              <div className="product-panel-title">
                <span aria-hidden="true">1</span>
                <h3>Thông tin chung</h3>
              </div>

              <div className="product-field-grid">
                <label className="product-field product-field--wide">
                  <span>
                    Tên sản phẩm <b>*</b>
                  </span>
                  <input
                    maxLength="255"
                    name="name"
                    onChange={onChange}
                    required
                    value={productForm.name}
                  />
                  <small>{productForm.name.length}/255</small>
                </label>

                <label className="product-field">
                  <span>Slug</span>
                  <input
                    name="slug"
                    onChange={onChange}
                    value={productForm.slug}
                  />
                </label>

                <label className="product-field">
                  <span>
                    Danh mục <b>*</b>
                  </span>
                  <select
                    name="categoryId"
                    onChange={onChange}
                    required
                    value={productForm.categoryId}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="product-field">
                  <span>
                    Thương hiệu <b>*</b>
                  </span>
                  <select
                    name="brandId"
                    onChange={onChange}
                    required
                    value={productForm.brandId}
                  >
                    <option value="">Chọn thương hiệu</option>
                    {brandOptions.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="product-field">
                  <span>Trạng thái</span>
                  <select
                    name="status"
                    onChange={onChange}
                    value={productForm.status}
                  >
                    <option value="active">Đang bán</option>
                    <option value="inactive">Tạm ngừng</option>
                  </select>
                </label>

                <label className="product-switch-field">
                  <input
                    checked={productForm.featured}
                    name="featured"
                    onChange={onChange}
                    type="checkbox"
                  />
                  <span>Sản phẩm nổi bật</span>
                </label>

                <label className="product-field product-field--full">
                  <span>Mô tả ngắn</span>
                  <textarea
                    maxLength="255"
                    name="shortDescription"
                    onChange={onChange}
                    rows="2"
                    value={productForm.shortDescription}
                  />
                  <small>{productForm.shortDescription.length}/255</small>
                </label>

                <div className="product-field product-field--full">
                  <span>Mô tả chi tiết</span>
                  <Suspense
                    fallback={
                      <div className="product-ckeditor product-ckeditor-loading">
                        Đang tải trình soạn thảo...
                      </div>
                    }
                  >
                    <ProductDescriptionEditor
                      onChange={onDescriptionChange}
                      value={productForm.description}
                    />
                  </Suspense>
                </div>
              </div>
            </section>

            <section className="product-form-panel">
              <div className="admin-section-title">
                <div className="product-panel-title">
                  <span aria-hidden="true">2</span>
                  <h3>Biến thể sản phẩm</h3>
                </div>
                <button onClick={onAddVariant} type="button">
                  + Thêm biến thể
                </button>
              </div>

              <div className="product-variant-list">
                {productVariantRows.map((variant, variantIndex) => {
                  const errors = productFormErrors?.variants?.[variantIndex] || {};

                  return (
                    <article
                      className={`product-variant-editor${variant.collapsed ? " collapsed" : ""}`}
                      key={variant.localId || variant.id || variantIndex}
                    >
                      <div className="product-variant-heading">
                        <div>
                          <strong>Biến thể {variantIndex + 1}</strong>
                          <span>{getVariantTitle(variant, variantIndex)}</span>
                        </div>
                        <div className="product-variant-actions">
                          <button
                            aria-label="Sao chép biến thể"
                            onClick={() => onCopyVariant(variantIndex)}
                            type="button"
                          >
                            Copy
                          </button>
                          <button
                            aria-label="Thu gọn biến thể"
                            onClick={() => onToggleVariant(variantIndex)}
                            type="button"
                          >
                            {variant.collapsed ? "Mở" : "Thu gọn"}
                          </button>
                          <button
                            disabled={productVariantRows.length === 1}
                            onClick={() => onRemoveVariant(variantIndex)}
                            type="button"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      {!variant.collapsed ? (
                        <>
                          <div className="admin-inline-fields product-variant-fields">
                            <label>
                              Màu sắc
                              <input
                                onChange={(event) =>
                                  onVariantChange(
                                    variantIndex,
                                    "color",
                                    event.target.value,
                                  )
                                }
                                value={variant.color}
                              />
                            </label>
                            <label>
                              RAM
                              <input
                                onChange={(event) =>
                                  onVariantChange(
                                    variantIndex,
                                    "ram",
                                    event.target.value,
                                  )
                                }
                                value={variant.ram}
                              />
                            </label>
                            <label>
                              Bộ nhớ
                              <input
                                onChange={(event) =>
                                  onVariantChange(
                                    variantIndex,
                                    "storage",
                                    event.target.value,
                                  )
                                }
                                value={variant.storage}
                              />
                            </label>
                            <label>
                              SKU <b>*</b>
                              <input
                                onChange={(event) =>
                                  onVariantChange(
                                    variantIndex,
                                    "sku",
                                    event.target.value,
                                  )
                                }
                                value={variant.sku}
                              />
                              {errors.sku ? <em>{errors.sku}</em> : null}
                            </label>
                            <label>
                              Barcode
                              <input
                                onChange={(event) =>
                                  onVariantChange(
                                    variantIndex,
                                    "barcode",
                                    event.target.value,
                                  )
                                }
                                value={variant.barcode}
                              />
                            </label>
                            <label>
                              Giá bán <b>*</b>
                              <input
                                min="0"
                                onChange={(event) =>
                                  onVariantChange(
                                    variantIndex,
                                    "price",
                                    event.target.value,
                                  )
                                }
                                type="number"
                                value={variant.price}
                              />
                              {errors.price ? <em>{errors.price}</em> : null}
                            </label>
                            <label>
                              Giá khuyến mãi
                              <input
                                min="0"
                                onChange={(event) =>
                                  onVariantChange(
                                    variantIndex,
                                    "salePrice",
                                    event.target.value,
                                  )
                                }
                                type="number"
                                value={variant.salePrice}
                              />
                              {errors.salePrice ? <em>{errors.salePrice}</em> : null}
                            </label>
                            <label>
                              Tồn kho
                              <input
                                min="0"
                                onChange={(event) =>
                                  onVariantChange(
                                    variantIndex,
                                    "stock",
                                    event.target.value,
                                  )
                                }
                                type="number"
                                value={variant.stock}
                              />
                              {errors.stock ? <em>{errors.stock}</em> : null}
                            </label>
                            <label>
                              Trạng thái
                              <select
                                onChange={(event) =>
                                  onVariantChange(
                                    variantIndex,
                                    "status",
                                    event.target.value,
                                  )
                                }
                                value={variant.status}
                              >
                                <option value="active">Còn hàng</option>
                                <option value="inactive">Ngừng bán</option>
                              </select>
                            </label>
                          </div>

                          <div className="variant-spec-block">
                            <div className="admin-section-title">
                              <div>
                                <h3>Thông số riêng</h3>
                              </div>
                              <button
                                onClick={() => onAddVariantSpec(variantIndex)}
                                type="button"
                              >
                                + Thêm thông số
                              </button>
                            </div>
                            <div className="spec-row-list">
                              {variant.specifications.map((spec, specIndex) => (
                                <div
                                  className="spec-edit-row"
                                  key={`${variant.localId}-spec-${specIndex}`}
                                >
                                  <input
                                    aria-label="Tên thông số biến thể"
                                    onChange={(event) =>
                                      onVariantSpecChange(
                                        variantIndex,
                                        specIndex,
                                        "key",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Chip, camera, pin..."
                                    value={spec.key}
                                  />
                                  <input
                                    aria-label="Giá trị thông số biến thể"
                                    onChange={(event) =>
                                      onVariantSpecChange(
                                        variantIndex,
                                        specIndex,
                                        "value",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="A18 Pro, 48MP..."
                                    value={spec.value}
                                  />
                                  <button
                                    aria-label="Xóa thông số biến thể"
                                    onClick={() =>
                                      onRemoveVariantSpec(variantIndex, specIndex)
                                    }
                                    type="button"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <button
                className="product-add-variant-button"
                onClick={onAddVariant}
                type="button"
              >
                + Thêm biến thể sản phẩm
              </button>
            </section>

            <section className="product-form-panel">
              <div className="admin-section-title">
                <div className="product-panel-title">
                  <span aria-hidden="true">3</span>
                  <h3>Thông số kỹ thuật</h3>
                </div>
                <button onClick={onAddProductSpecGroup} type="button">
                  + Thêm nhóm
                </button>
              </div>

              <div className="product-spec-group-list">
                {productForm.specifications.map((group, groupIndex) => (
                  <article className="product-spec-group" key={group.id || groupIndex}>
                    <div className="product-spec-group-heading">
                      <input
                        aria-label="Tên nhóm thông số"
                        onChange={(event) =>
                          onSpecGroupChange(groupIndex, event.target.value)
                        }
                        placeholder="Hiệu năng, Pin, Màn hình..."
                        value={group.name}
                      />
                      <button
                        onClick={() => onRemoveProductSpecGroup(groupIndex)}
                        type="button"
                      >
                        Xóa nhóm
                      </button>
                    </div>
                    <div className="spec-row-list">
                      {group.items.map((spec, specIndex) => (
                        <div
                          className="spec-edit-row"
                          key={`${group.id || groupIndex}-${specIndex}`}
                        >
                          <input
                            aria-label="Tên thông số"
                            onChange={(event) =>
                              onSpecChange(
                                groupIndex,
                                specIndex,
                                "key",
                                event.target.value,
                              )
                            }
                            placeholder="CPU, GPU, RAM..."
                            value={spec.key}
                          />
                          <input
                            aria-label="Giá trị thông số"
                            onChange={(event) =>
                              onSpecChange(
                                groupIndex,
                                specIndex,
                                "value",
                                event.target.value,
                              )
                            }
                            placeholder="Apple A17 Pro..."
                            value={spec.value}
                          />
                          <button
                            onClick={() =>
                              onRemoveProductSpec(groupIndex, specIndex)
                            }
                            type="button"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      className="product-text-action"
                      onClick={() => onAddProductSpec(groupIndex)}
                      type="button"
                    >
                      + Thêm thông số
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="product-form-panel">
              <div className="product-panel-title">
                <span aria-hidden="true">4</span>
                <h3>SEO</h3>
              </div>

              <div className="seo-preview-card">
                <strong>{seoTitle || "Tiêu đề SEO"}</strong>
                <span>
                  https://bstore.vn/products/{productForm.slug || "san-pham"}
                </span>
                <p>{seoDescription || "Mô tả hiển thị trên công cụ tìm kiếm."}</p>
              </div>

              <div className="product-field-grid">
                <label className="product-field product-field--full">
                  <span>Meta title</span>
                  <input
                    maxLength="70"
                    onChange={(event) => onSeoChange("metaTitle", event.target.value)}
                    value={productForm.seo?.metaTitle || ""}
                  />
                  <small>{(productForm.seo?.metaTitle || "").length}/70</small>
                </label>
                <label className="product-field product-field--full">
                  <span>Meta description</span>
                  <textarea
                    maxLength="160"
                    onChange={(event) =>
                      onSeoChange("metaDescription", event.target.value)
                    }
                    rows="3"
                    value={productForm.seo?.metaDescription || ""}
                  />
                  <small>
                    {(productForm.seo?.metaDescription || "").length}/160
                  </small>
                </label>
                <label className="product-field product-field--full">
                  <span>Meta keywords</span>
                  <input
                    onChange={(event) =>
                      onSeoChange("metaKeywords", event.target.value)
                    }
                    placeholder="iphone, apple, dien thoai"
                    value={productForm.seo?.metaKeywords || ""}
                  />
                </label>
              </div>
            </section>
          </main>

          <aside className="product-form-side">
            <section className="product-form-panel product-image-panel">
              <h3>Ảnh đại diện</h3>
              <div className="product-image-preview">
                {previewUrl ? (
                  <img alt="Xem trước ảnh sản phẩm" src={previewUrl} />
                ) : (
                  <span>Chưa có ảnh</span>
                )}
              </div>

              <div className="product-image-actions">
                <label className="product-upload-button">
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingImage}
                    onChange={onImageFile}
                    type="file"
                  />
                  {uploadingImage ? "Đang tải ảnh..." : "Upload"}
                </label>
                <button onClick={onRemoveThumbnail} type="button">
                  Xóa
                </button>
              </div>
              <p>Định dạng JPG, PNG, WEBP. Tối đa 5MB.</p>
            </section>

            <section className="product-form-panel product-album-panel">
              <div className="admin-section-title">
                <h3>Album ảnh</h3>
                <label className="product-icon-upload">
                  +
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingImage}
                    multiple
                    onChange={onAlbumImageFiles}
                    type="file"
                  />
                </label>
              </div>
              <div className="product-album-grid">
                {productForm.images.map((image) => (
                  <div
                    className={`product-album-item${image.isThumbnail ? " active" : ""}`}
                    key={image.localId}
                  >
                    <img alt="" src={getImageSrc(image.imageUrl)} />
                    <button
                      aria-label="Xóa ảnh"
                      onClick={() => onRemoveProductImage(image.localId)}
                      type="button"
                    >
                      x
                    </button>
                    {!image.isThumbnail ? (
                      <button
                        className="product-album-thumb-action"
                        onClick={() => onSetThumbnail(image.localId)}
                        type="button"
                      >
                        Đại diện
                      </button>
                    ) : (
                      <span>Đại diện</span>
                    )}
                  </div>
                ))}
                <label className="product-album-add">
                  +
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingImage}
                    multiple
                    onChange={onAlbumImageFiles}
                    type="file"
                  />
                </label>
              </div>
            </section>

            <section className="product-form-panel product-quick-info">
              <h3>Thông tin nhanh</h3>
              <dl>
                <div>
                  <dt>Chế độ</dt>
                  <dd>{editingProductId ? "Đang sửa" : "Thêm mới"}</dd>
                </div>
                <div>
                  <dt>Slug</dt>
                  <dd>{productForm.slug || "Tự tạo theo tên"}</dd>
                </div>
                <div>
                  <dt>Danh mục</dt>
                  <dd>{selectedCategoryName || "Chưa chọn"}</dd>
                </div>
                <div>
                  <dt>Thương hiệu</dt>
                  <dd>{selectedBrandName || "Chưa chọn"}</dd>
                </div>
                <div>
                  <dt>Biến thể</dt>
                  <dd>{productVariantRows.length}</dd>
                </div>
                {salePreview ? (
                  <>
                    <div>
                      <dt>Giá bán</dt>
                      <dd>{formatCurrency(salePreview.originalPrice)}</dd>
                    </div>
                    <div>
                      <dt>Giảm giá</dt>
                      <dd>{formatSalePercent(salePreview.salePercent)}%</dd>
                    </div>
                  </>
                ) : null}
              </dl>
            </section>
          </aside>
        </div>

        <footer className="product-form-footer">
          <span>Dữ liệu sẽ được lưu qua API mà không reload trang.</span>
          <div>
            <button className="secondary-button" onClick={onClose} type="button">
              Hủy
            </button>
            <button
              className="secondary-button"
              disabled={saving || uploadingImage}
              onClick={(event) => onSave(event, { continueEditing: true })}
              type="button"
            >
              Lưu & tiếp tục chỉnh sửa
            </button>
            <button
              className="primary-button"
              disabled={saving || uploadingImage}
              type="submit"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
