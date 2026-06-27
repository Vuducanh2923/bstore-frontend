import { Link } from "react-router-dom";

const NEWS_ITEMS = [
  {
    category: "Laptop",
    image: "/hero-gaming-laptop.svg",
    title: "Cách chọn laptop học tập và làm việc trong năm nay",
  },
  {
    category: "PC",
    image: "/hero-gaming-pc.svg",
    title: "Những nâng cấp PC đáng tiền cho game và đồ họa",
  },
  {
    category: "Phụ kiện",
    image: "/hero-accessories.svg",
    title: "Gợi ý phụ kiện giúp bàn làm việc gọn gàng hơn",
  },
];

export default function NewsPage() {
  return (
    <main className="container content-page news-page">
      <section className="content-hero">
        <span>Tin công nghệ</span>
        <h1>Cập nhật xu hướng và kinh nghiệm mua sắm thiết bị</h1>
        <p>
          Khu vực này đang được chuẩn bị để kết nối API bài viết. Hiện tại BStore
          hiển thị giao diện mẫu để sẵn sàng cho CRUD tin tức sau này.
        </p>
      </section>

      <section className="news-grid" aria-label="Bài viết nổi bật">
        {NEWS_ITEMS.map((item) => (
          <article className="news-card" key={item.title}>
            <img alt="" src={item.image} />
            <div>
              <span>{item.category}</span>
              <h2>{item.title}</h2>
              <Link to="/products">Xem sản phẩm liên quan</Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
