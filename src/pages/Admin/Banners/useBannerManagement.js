import { adminService } from "../../../services/bstoreService";
import { getApiErrorMessage } from "../../../services/api";
import {
  BANNER_IMAGE_TYPES,
  MAX_BANNER_IMAGE_SIZE,
  createEmptyBannerForm,
} from "../Dashboard/adminDashboardShared";

export default function useBannerManagement({
  bannerForm,
  bannerImageFile,
  editingBannerId,
  loadAdminData,
  setBannerForm,
  setBannerImageFile,
  setBannerLocalPreviewUrl,
  setEditingBannerId,
  setMessage,
  setSaving,
}) {
  const handleBannerChange = (event) => {
    const { name, value } = event.target;

    if (name === "imageUrl") {
      setBannerImageFile(null);
      setBannerLocalPreviewUrl("");
    }

    setBannerForm((current) => ({
      ...current,
      [name]: value,
    }));
  };



  const handleBannerImageFile = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!BANNER_IMAGE_TYPES.includes(file.type)) {
      setMessage("Chỉ hỗ trợ ảnh jpg, jpeg, png hoặc webp cho banner.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_BANNER_IMAGE_SIZE) {
      setMessage("Ảnh banner tối đa 5MB.");
      event.target.value = "";
      return;
    }

    setBannerImageFile(file);
    setBannerLocalPreviewUrl(URL.createObjectURL(file));
    setBannerForm((current) => ({
      ...current,
      imageUrl: "",
    }));
    setMessage("");
    event.target.value = "";
  };



  const resetBannerForm = () => {
    setBannerImageFile(null);
    setBannerLocalPreviewUrl("");
    setBannerForm(createEmptyBannerForm());
    setEditingBannerId(null);
  };

  const handleEditBanner = (banner) => {
    setBannerImageFile(null);
    setBannerLocalPreviewUrl("");
    setEditingBannerId(banner.id);
    setBannerForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      description: banner.description || "",
      buttonText: banner.buttonText || "",
      buttonLink: banner.buttonLink || "",
      imageUrl: banner.rawImageUrl || banner.imageUrl || "",
      displaySlot: String(banner.displaySlot || 1),
      sortOrder: String(banner.sortOrder ?? 0),
      status: banner.status ? "1" : "0",
    });
  };

  const handleSaveBanner = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const buttonLink = bannerForm.buttonLink.trim();
    const imageUrl = bannerForm.imageUrl.trim();

    if (!imageUrl && !bannerImageFile) {
      setSaving(false);
      setMessage("Vui lòng nhập URL ảnh hoặc upload ảnh banner.");
      return;
    }

    const bannerPayload = {
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim() || null,
      description: bannerForm.description.trim() || null,
      button_text: bannerForm.buttonText.trim() || null,
      button_link: buttonLink || null,
      route: buttonLink || null,
      display_slot: Number(bannerForm.displaySlot || 1),
      sort_order: Number(bannerForm.sortOrder || 0),
      status: bannerForm.status === "1" ? "1" : "0",
    };
    const payload = bannerImageFile
      ? Object.entries(bannerPayload).reduce((formData, [key, value]) => {
          formData.append(key, value ?? "");
          return formData;
        }, new FormData())
      : {
          ...bannerPayload,
          image_url: imageUrl,
        };

    if (bannerImageFile) {
      payload.append("image", bannerImageFile);
    }

    try {
      if (editingBannerId) {
        await adminService.updateBanner(editingBannerId, payload);
        setMessage("Đã cập nhật banner.");
      } else {
        await adminService.createBanner(payload);
        setMessage("Đã thêm banner mới.");
      }

      resetBannerForm();
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không lưu được banner."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.deleteBanner(bannerId);
      setMessage("Đã xoá banner.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không xoá được banner."));
    } finally {
      setSaving(false);
    }
  };



  return {
    handleBannerChange,
    handleBannerImageFile,
    resetBannerForm,
    handleEditBanner,
    handleSaveBanner,
    handleDeleteBanner,
  };
}
