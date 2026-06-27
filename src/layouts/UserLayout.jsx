import { Link, Outlet } from "react-router-dom";
import Header from "../components/Header";

export default function UserLayout() {
  return (
    <div className="site-shell">
      <Header />

      <Outlet />

      <footer className="store-footer" id="support">
        <div className="container footer-grid">
          <div>
            <strong>BStore</strong>
            <p>
              Cửa hàng thiết bị điện tử chính hãng, tập trung vào laptop, PC,
              linh kiện và phụ kiện công nghệ.
            </p>
          </div>
          <div>
            <strong>Mua sắm</strong>
            <Link to="/products">Tất cả sản phẩm</Link>
            <Link to="/sale">Khuyến mãi</Link>
            <Link to="/new-products">Hàng mới</Link>
          </div>
          <div>
            <strong>Hỗ trợ</strong>
            <Link to="/warranty-policy">Bảo hành</Link>
            <Link to="/return-policy">Đổi trả</Link>
            <Link to="/shipping-policy">Giao hàng</Link>
          </div>
          <div>
            <strong>BStore</strong>
            <Link to="/news">Tin công nghệ</Link>
            <Link to="/contact">Liên hệ</Link>
            <Link to="/terms-of-use">Điều khoản</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          Copyright 2024 BStore E-commerce. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
