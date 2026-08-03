export default function AdminBannersPage({
  AdminTabSearch,
  StatusPill,
  bannerForm,
  bannerImageFile,
  bannerPreviewUrl,
  editingBannerId,
  filteredBanners,
  handleBannerChange,
  handleBannerImageFile,
  handleDeleteBanner,
  handleEditBanner,
  handleSaveBanner,
  handleTabSearchChange,
  resetBannerForm,
  saving,
  tabSearch,
}) {
  return (
    <>
          <div className="admin-page-heading">
            <div>
              <h1>Banner Management</h1>
              <p>Upload banner images directly or paste an image URL for the home slider.</p>
            </div>
            <button
              className="admin-primary-action"
              onClick={resetBannerForm}
              type="button"
            >Thêm Banner
            </button>
          </div>
          <div className="admin-grid admin-grid--wide-form">
            <form className="admin-form form-stack" onSubmit={handleSaveBanner}>
              <h2>{editingBannerId ? "Sửa banner" : "Thêm banner"}</h2>
              <div className="admin-form-section">
                <div className="admin-section-title">
                  <div>
                    <h3>Nội dung banner</h3>
                    <p>Tiêu đề, mô tả và nút kêu gọi hành động.</p>
                  </div>
                </div>
                <label>
                  Tiêu đề
                  <input
                    name="title"
                    onChange={handleBannerChange}
                    required
                    value={bannerForm.title}
                  />
                </label>
                <label>
                  Dòng phụ
                  <input
                    name="subtitle"
                    onChange={handleBannerChange}
                    value={bannerForm.subtitle}
                  />
                </label>
                <label>
                  Mô tả
                  <textarea
                    name="description"
                    onChange={handleBannerChange}
                    rows="3"
                    value={bannerForm.description}
                  />
                </label>
              </div>

              <div className="admin-form-section">
                <div className="admin-section-title">
                  <div>
                    <h3>Ảnh banner</h3>
                    <p>Nhập URL ảnh hoặc tải ảnh trực tiếp từ máy.</p>
                  </div>
                </div>
                <label>
                  URL ảnh
                  <input
                    name="imageUrl"
                    onChange={handleBannerChange}
                    placeholder="https://..."
                    required={!bannerImageFile}
                    value={bannerForm.imageUrl}
                  />
                </label>
                <label>
                  Tải ảnh từ máy
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    disabled={saving}
                    onChange={handleBannerImageFile}
                    type="file"
                  />
                </label>
                {bannerPreviewUrl ? (
                  <div className="image-preview image-preview--banner">
                    <img
                      alt="Xem trước ảnh banner"
                      src={bannerPreviewUrl}
                    />
                  </div>
                ) : null}
              </div>

              <div className="admin-form-section">
                <div className="admin-section-title">
                  <div>
                    <h3>Liên kết và hiển thị</h3>
                    <p>Cấu hình nút, thứ tự và trạng thái banner.</p>
                  </div>
                </div>
                <label>
                  Chữ trên nút
                  <input
                    name="buttonText"
                    onChange={handleBannerChange}
                    placeholder="Xem ngay"
                    value={bannerForm.buttonText}
                  />
                </label>
                <label>
                  Link khi bấm banner/nút
                  <input
                    name="buttonLink"
                    onChange={handleBannerChange}
                    placeholder="/products hoặc https://..."
                    value={bannerForm.buttonLink}
                  />
                </label>
                <div className="admin-inline-fields">
                  <label>
                    Khung hien thi
                    <select
                      name="displaySlot"
                      onChange={handleBannerChange}
                      value={bannerForm.displaySlot}
                    >
                      <option value="1">Khung banner 1 - lon</option>
                      <option value="2">Khung banner 2 - tren phai</option>
                      <option value="3">Khung banner 3 - duoi phai</option>
                    </select>
                  </label>
                  <label>
                    Thứ tự
                    <input
                      min="0"
                      name="sortOrder"
                      onChange={handleBannerChange}
                      type="number"
                      value={bannerForm.sortOrder}
                    />
                  </label>
                  <label>
                    Trạng thái
                    <select
                      name="status"
                      onChange={handleBannerChange}
                      value={bannerForm.status}
                    >
                      <option value="1">Đang bật</option>
                      <option value="0">Tạm ẩn</option>
                    </select>
                  </label>
                </div>
              </div>

              <button
                className="primary-button"
                disabled={saving}
                type="submit"
              >
                {saving ? "Đang lưu..." : "Lưu banner"}
              </button>
              {editingBannerId ? (
                <button
                  className="secondary-button"
                  onClick={resetBannerForm}
                  type="button"
                >
                  Huỷ sửa
                </button>
              ) : null}
            </form>

            <div className="banner-admin-list">
              <AdminTabSearch
                onChange={(value) => handleTabSearchChange("banners", value)}
                placeholder="Search banners..."
                value={tabSearch.banners}
              />
              {filteredBanners.map((banner) => (
                <article className="banner-admin-card" key={banner.id}>
                  <div className="banner-admin-image">
                    {banner.imageUrl ? (
                      <img alt={banner.title} src={banner.imageUrl} />
                    ) : (
                      <span>Banner</span>
                    )}
                  </div>
                  <div className="banner-admin-body">
                    <div>
                      <StatusPill>{banner.status ? "active" : "hidden"}</StatusPill>
                      <small>Khung {banner.displaySlot}</small>
                      <small>Thứ tự {banner.sortOrder}</small>
                    </div>
                    <h3>{banner.title}</h3>
                    <p>{banner.description || banner.subtitle || "Chưa có mô tả."}</p>
                    <div className="banner-admin-actions">
                      <button onClick={() => handleEditBanner(banner)} type="button">
                        Sửa
                      </button>
                      <button onClick={() => handleDeleteBanner(banner.id)} type="button">
                        Xoá
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {filteredBanners.length === 0 ? (
                <div className="admin-empty-state">
                  Chưa có banner từ backend. Thêm banner đầu tiên để hiển thị ở trang chủ.
                </div>
              ) : null}
            </div>
          </div>

    </>
  );
}
