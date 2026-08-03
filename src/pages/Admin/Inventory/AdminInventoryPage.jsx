export default function AdminInventoryPage({
  AdminPagination,
  AdminTabSearch,
  handleInventoryChange,
  handleSaveInventory,
  handleTabSearchChange,
  inventoryPagination,
  loading,
  pagedInventory,
  saving,
  setInventoryPage,
  tabSearch,
}) {
  return (
    <>
          <div className="admin-page-heading">
            <div>
              <h1>Inventory Control</h1>
              <p>Update product stock and reserved quantities.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <AdminTabSearch
              onChange={(value) => handleTabSearchChange("inventory", value)}
              placeholder="Search inventory..."
              value={tabSearch.inventory}
            />
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Biến thể</th>
                  <th>Tồn kho</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagedInventory.map((item) => (
                  <tr key={item.id || item.productName}>
                    <td>{item.productName}</td>
                    <td>{item.variantLabel || "Mặc định"}</td>
                    <td>
                      <input
                        min="0"
                        onChange={(event) =>
                          handleInventoryChange(item.id, event.target.value)
                        }
                        type="number"
                        value={item.quantity}
                      />
                    </td>
                    <td>
                      <button
                        disabled={saving}
                        onClick={() => handleSaveInventory(item)}
                        type="button"
                      >
                        Lưu kho
                      </button>
                    </td>
                  </tr>
                ))}
                {pagedInventory.length === 0 ? (
                  <tr>
                    <td colSpan="4">Không có dữ liệu tồn kho phù hợp.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            <AdminPagination
              disabled={loading || saving}
              label="Tồn kho"
              onPageChange={setInventoryPage}
              pagination={inventoryPagination}
            />
          </div>

    </>
  );
}
