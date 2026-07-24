import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AddressManager from "./AddressManager";
import ChangePasswordForm from "./ChangePasswordForm";
import OrderHistory from "./OrderHistory";
import ProfileForm from "./ProfileForm";

const ACCOUNT_TABS = [
  {
    id: "profile",
    label: "Thông tin cá nhân",
    render: () => <ProfileForm />,
  },
  {
    id: "addresses",
    label: "Địa chỉ giao hàng",
    render: () => <AddressManager />,
  },
  {
    id: "password",
    label: "Đổi mật khẩu",
    render: () => <ChangePasswordForm />,
  },
  {
    id: "orders",
    label: "Lịch sử mua hàng",
    render: () => <OrderHistory />,
  },
];

function getInitialTab() {
  const hash = window.location.hash.replace(/^#/, "");

  return ACCOUNT_TABS.some((tab) => tab.id === hash) ? hash : ACCOUNT_TABS[0].id;
}

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const currentTab = useMemo(
    () => ACCOUNT_TABS.find((tab) => tab.id === activeTab) || ACCOUNT_TABS[0],
    [activeTab],
  );

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    window.history.replaceState(null, "", `#${tabId}`);
  };

  return (
    <main className="account-page">
      <div className="container">
        <div className="account-heading">
          <span>Tài khoản</span>
          <h1>Quản lý tài khoản BStore</h1>
          <p>Cập nhật hồ sơ, địa chỉ giao hàng, mật khẩu và theo dõi đơn hàng.</p>
        </div>

        <div className="account-layout">
          <aside className="account-tabs" aria-label="Tài khoản">
            {ACCOUNT_TABS.map((tab) => (
              <button
                className={tab.id === activeTab ? "active" : ""}
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
            <Link className="account-tab-link" to="/account/warranty-requests">
              Yêu cầu bảo hành
            </Link>
          </aside>
          <div className="account-content">{currentTab.render()}</div>
        </div>
      </div>
    </main>
  );
}
