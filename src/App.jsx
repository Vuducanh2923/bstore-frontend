import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);

  const categories = [
    "Điện thoại",
    "Laptop",
    "Máy tính bảng",
    "Phụ kiện",
    "Đồng hồ thông minh",
    "PC, màn hình",
    "Tivi",
    "Âm thanh",
  ];

  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/api/products")
      .then((res) => setProducts(res.data.data))
      .catch((err) => console.error("Lỗi load sản phẩm:", err));
  }, []);

  return (
    <div className="app">
      <header className="top-header">
        <div className="container header-inner">
          <div className="logo">BStore</div>

          <button className="category-btn">☰ Danh mục</button>

          <div className="search-box">
            <span>🔍</span>
            <input placeholder="Bạn cần tìm gì?" />
          </div>

          <div className="header-action">
            <span>📞</span>
            <div>
              <small>Gọi mua hàng</small>
              <b>0123456789</b>
            </div>
          </div>

          <div className="header-action">
            <span>🛒</span>
            <div>
              <small>Giỏ hàng</small>
              <b>0 sản phẩm</b>
            </div>
          </div>

          <button className="login-btn">Đăng nhập</button>
        </div>
      </header>

      <main className="container main-layout">
        <aside className="side-menu">
          {categories.map((item, index) => (
            <div className="menu-item" key={index}>
              <span>📱</span>
              <p>{item}</p>
              <b>›</b>
            </div>
          ))}
        </aside>

        <section className="center-content">
          <div className="banner">
            <div>
              <p className="sale-label">BSTORE TECHNOLOGY</p>
              <h1>Siêu sale thiết bị điện tử</h1>
              <p>Điện thoại, laptop, phụ kiện chính hãng, giá tốt mỗi ngày.</p>
              <button>Mua ngay</button>
            </div>

            <div className="banner-phone">📱</div>
          </div>

          <div className="quick-tabs">
            <div>iPhone 15 Pro Max</div>
            <div>Laptop văn phòng</div>
            <div>Phụ kiện giá tốt</div>
            <div>Thanh toán COD</div>
          </div>
        </section>

        <aside className="right-news">
          <div className="news-card red">
            <b>Khuyến mãi hôm nay</b>
            <p>Giảm đến 30% cho phụ kiện</p>
          </div>

          <div className="news-card">
            <b>Thu cũ đổi mới</b>
            <p>Trợ giá lên đến 2 triệu</p>
          </div>

          <div className="news-card">
            <b>Trả góp 0%</b>
            <p>Duyệt nhanh trong 10 phút</p>
          </div>
        </aside>
      </main>

      <section className="container product-section">
        <div className="section-heading">
          <h2>Sản phẩm nổi bật</h2>
          <div className="filter-buttons">
            <button>Điện thoại</button>
            <button>Laptop</button>
            <button>Phụ kiện</button>
            <button>Apple</button>
          </div>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <div className="product-card" key={product.id}>
              <div className="product-image">
                <span>📱</span>
              </div>

              <h3>{product.name}</h3>

              <p className="product-desc">{product.description}</p>

              <div className="price-row">
                <span className="price">
                  {Number(product.price).toLocaleString("vi-VN")}đ
                </span>
              </div>

              <div className="installment">Trả góp 0%</div>

              <div className="card-bottom">
                <button>Thêm vào giỏ</button>
                <span>♡</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;