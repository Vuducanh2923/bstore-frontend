import { Link } from "react-router-dom";

export default function AdminSettingsPage() {
  return (
    <div className="dashboard-card settings-card">
      <h1>Settings</h1>
      <p>Điều chỉnh endpoint backend tại file cấu hình API.</p>
      <Link className="primary-button" to="/products">
        Về cửa hàng
      </Link>
    </div>
  );
}
