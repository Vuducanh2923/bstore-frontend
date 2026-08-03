export default function AdminCategoriesPage({
  AdminTabSearch,
  CategoryIconPreview,
  categoryForm,
  editingCategoryId,
  filteredCategories,
  handleCategoryChange,
  handleDeleteCategory,
  handleEditCategory,
  handleSaveCategory,
  handleTabSearchChange,
  resetCategoryForm,
  saving,
  tabSearch,
}) {
  return (
    <>
          <div className="admin-page-heading">
            <div>
              <h1>Category Management</h1>
              <p>Create, update and publish category icons from the BStore API.</p>
            </div>
            <button
              className="admin-primary-action"
              onClick={resetCategoryForm}
              type="button"
            >
              Thêm Category
            </button>
          </div>
          <div className="admin-grid">
            <form className="admin-form form-stack" onSubmit={handleSaveCategory}>
              <h2>{editingCategoryId ? "Edit category" : "Add category"}</h2>
              <label>
                Name
                <input
                  name="name"
                  onChange={handleCategoryChange}
                  required
                  value={categoryForm.name}
                />
              </label>
              <label>
                Slug
                <input
                  name="slug"
                  onChange={handleCategoryChange}
                  required
                  value={categoryForm.slug}
                />
              </label>
              <label>
                Icon
                <input
                  name="icon"
                  onChange={handleCategoryChange}
                  placeholder="emoji, text, https://... or uploads/categories/..."
                  value={categoryForm.icon}
                />
              </label>
              <div className="category-icon-preview-row">
                <CategoryIconPreview category={categoryForm} />
                <span>Preview</span>
              </div>
              <label>
                Status
                <select
                  name="status"
                  onChange={handleCategoryChange}
                  value={categoryForm.status}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  onChange={handleCategoryChange}
                  rows="4"
                  value={categoryForm.description}
                />
              </label>
              <button className="primary-button" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save category"}
              </button>
              {editingCategoryId ? (
                <button
                  className="secondary-button"
                  onClick={resetCategoryForm}
                  type="button"
                >
                  Cancel edit
                </button>
              ) : null}
            </form>
            <div className="admin-table-wrap">
              <AdminTabSearch
                onChange={(value) => handleTabSearchChange("categories", value)}
                placeholder="Search categories..."
                value={tabSearch.categories}
              />
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Icon</th>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => (
                    <tr key={category.id || category.slug || category.name}>
                      <td>
                        <CategoryIconPreview category={category} />
                      </td>
                      <td>{category.name}</td>
                      <td>{category.slug}</td>
                      <td>{category.status || "active"}</td>
                      <td>
                        <button
                          onClick={() => handleEditCategory(category)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan="5">No categories from backend yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

    </>
  );
}
