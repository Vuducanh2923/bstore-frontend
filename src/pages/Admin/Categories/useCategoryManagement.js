import { adminService } from "../../../services/bstoreService";
import { getApiErrorMessage } from "../../../services/api";
import { slugify } from "../../../utils/formatters";
import {
  emptyCategoryForm,
  getCategoryIconValue,
} from "../Dashboard/adminDashboardShared";

export default function useCategoryManagement({
  categoryForm,
  editingCategoryId,
  loadAdminData,
  setCategoryForm,
  setEditingCategoryId,
  setMessage,
  setSaving,
}) {
  const handleCategoryChange = (event) => {
    const { name, value } = event.target;

    setCategoryForm((current) => ({
      ...current,
      [name]: value,
      slug:
        name === "name" && !editingCategoryId
          ? slugify(value)
          : current.slug,
    }));
  };



  const resetCategoryForm = () => {
    setCategoryForm(emptyCategoryForm);
    setEditingCategoryId(null);
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name || "",
      slug: category.slug || slugify(category.name),
      icon: getCategoryIconValue(category),
      description: category.description || "",
      status: category.status || "active",
    });
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      name: categoryForm.name,
      slug: categoryForm.slug || slugify(categoryForm.name),
      icon: categoryForm.icon || null,
      description: categoryForm.description,
      status: categoryForm.status || "active",
    };

    try {
      if (editingCategoryId) {
        await adminService.updateCategory(editingCategoryId, payload);
        setMessage("Đã cập nhật danh mục.");
      } else {
        await adminService.createCategory(payload);
        setMessage("Đã thêm danh mục mới.");
      }

      resetCategoryForm();
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không lưu được danh mục."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.deleteCategory(categoryId);
      setMessage("Đã xóa danh mục.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không xóa được danh mục."));
    } finally {
      setSaving(false);
    }
  };



  return {
    handleCategoryChange,
    resetCategoryForm,
    handleEditCategory,
    handleSaveCategory,
    handleDeleteCategory,
  };
}
