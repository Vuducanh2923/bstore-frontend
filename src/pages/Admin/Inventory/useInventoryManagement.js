import { adminService } from "../../../services/bstoreService";
import { getApiErrorMessage } from "../../../services/api";

export default function useInventoryManagement({
  loadAdminData,
  setInventory,
  setMessage,
  setSaving,
}) {
  const handleInventoryChange = (inventoryId, value) => {
    setInventory((current) =>
      current.map((item) =>
        item.id === inventoryId ? { ...item, quantity: Number(value) } : item,
      ),
    );
  };

  const handleSaveInventory = async (item) => {
    setSaving(true);
    setMessage("");

    try {
      await adminService.updateInventory(item.id, {
        quantity: Number(item.quantity),
        reserved_quantity: Number(item.reservedQuantity || 0),
      });
      setMessage("Đã cập nhật tồn kho.");
      await loadAdminData();
    } catch (err) {
      setMessage(getApiErrorMessage(err, "Không cập nhật được tồn kho."));
    } finally {
      setSaving(false);
    }
  };



  return {
    handleInventoryChange,
    handleSaveInventory,
  };
}

