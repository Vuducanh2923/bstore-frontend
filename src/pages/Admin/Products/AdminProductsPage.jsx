import ProductFormModal from "../ProductFormModal";
import { resolveMediaUrl } from "../../../utils/formatters";

export default function AdminProductsPage({
  AdminTabSearch,
  brandOptions,
  canGoNextProductPage,
  canGoPreviousProductPage,
  categoryOptions,
  editingProductId,
  formatCurrency,
  getProductVariantCount,
  handleAddProductSpec,
  handleAddProductSpecGroup,
  handleAddProductVariant,
  handleAddVariantSpec,
  handleAlbumImageFiles,
  handleCopyProductVariant,
  handleDeleteProduct,
  handleEditProduct,
  handleImageFile,
  handleProductChange,
  handleProductDescriptionChange,
  handleProductPageChange,
  handleProductSpecChange,
  handleProductSpecGroupChange,
  handleProductVariantChange,
  handleRemoveProductImage,
  handleRemoveProductSpec,
  handleRemoveProductSpecGroup,
  handleRemoveProductThumbnail,
  handleRemoveProductVariant,
  handleRemoveVariantSpec,
  handleSaveProduct,
  handleSetProductThumbnail,
  handleTabSearchChange,
  handleToggleProductVariant,
  handleVariantSpecChange,
  loading,
  openCreateProductForm,
  productForm,
  productFormErrors,
  productFormOpen,
  productPageEnd,
  productPageStart,
  productPagination,
  productPreviewUrl,
  products,
  productVariantRows,
  resetProductForm,
  salePreview,
  saving,
  tabSearch,
  uploadingImage,
}) {
  return (
    <>
          <div className="admin-page-heading">
            <div>
              <h1>Quản lý sản phẩm</h1>
              <p>Thêm, cập nhật và quản lý sản phẩm từ BStore API.</p>
            </div>
            <button
              className="admin-create-product-button"
              onClick={openCreateProductForm}
              type="button"
            >
              Thêm sản phẩm
            </button>
          </div>
          {productFormOpen ? (
            <ProductFormModal
              brandOptions={brandOptions}
              categories={categoryOptions}
              editingProductId={editingProductId}
              onAddProductSpec={handleAddProductSpec}
              onAddProductSpecGroup={handleAddProductSpecGroup}
              onAddVariant={handleAddProductVariant}
              onAddVariantSpec={handleAddVariantSpec}
              onAlbumImageFiles={handleAlbumImageFiles}
              onChange={handleProductChange}
              onClose={resetProductForm}
              onCopyVariant={handleCopyProductVariant}
              onDescriptionChange={handleProductDescriptionChange}
              onImageFile={handleImageFile}
              onRemoveProductImage={handleRemoveProductImage}
              onRemoveProductSpec={handleRemoveProductSpec}
              onRemoveProductSpecGroup={handleRemoveProductSpecGroup}
              onRemoveThumbnail={handleRemoveProductThumbnail}
              onRemoveVariant={handleRemoveProductVariant}
              onRemoveVariantSpec={handleRemoveVariantSpec}
              onSave={handleSaveProduct}
              onSetThumbnail={handleSetProductThumbnail}
              onSpecChange={handleProductSpecChange}
              onSpecGroupChange={handleProductSpecGroupChange}
              onToggleVariant={handleToggleProductVariant}
              onVariantChange={handleProductVariantChange}
              onVariantSpecChange={handleVariantSpecChange}
              productForm={productForm}
              productFormErrors={productFormErrors}
              productPreviewUrl={productPreviewUrl}
              productVariantRows={productVariantRows}
              salePreview={salePreview}
              saving={saving}
              uploadingImage={uploadingImage}
            />
          ) : null}
          <div className="admin-grid admin-grid--product-table-only">
            <div className="admin-table-wrap">
              <AdminTabSearch
                onChange={(value) => handleTabSearchChange("products", value)}
                placeholder="Tìm sản phẩm..."
                value={tabSearch.products}
              />
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Danh mục</th>
                    <th>Thương hiệu</th>
                    <th>Số lượng biến thể</th>
                    <th>Giá</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id || product.name}>
                      <td>
                        <div className="admin-product-cell">
                          <span>
                            {product.imageUrl ? (
                              <img alt="" src={resolveMediaUrl(product.imageUrl)} />
                            ) : (
                              product.name.slice(0, 1)
                            )}
                          </span>
                          <strong>{product.name}</strong>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td>{product.brand}</td>
                      <td>{getProductVariantCount(product)}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>
                        <button onClick={() => handleEditProduct(product)} type="button">
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          type="button"
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="admin-pagination">
                <span>
                  Hiển thị {productPageStart}-{productPageEnd} /{" "}
                  {productPagination.total} sản phẩm
                </span>
                <div>
                  <button
                    disabled={loading || !canGoPreviousProductPage}
                    onClick={() =>
                      handleProductPageChange(productPagination.currentPage - 1)
                    }
                    type="button"
                  >
                    Trước
                  </button>
                  <strong>
                    Trang {productPagination.currentPage} /{" "}
                    {productPagination.lastPage}
                  </strong>
                  <button
                    disabled={loading || !canGoNextProductPage}
                    onClick={() =>
                      handleProductPageChange(productPagination.currentPage + 1)
                    }
                    type="button"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          </div>

    </>
  );
}
